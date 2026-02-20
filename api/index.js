const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ============================================
// SECURITY — Rate Limiting & Input Sanitization
// ============================================

// Simple in-memory rate limiter (20 requests/minute per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20;

// Auto-clean stale entries every 2 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap) {
        if (now - data.windowStart > RATE_LIMIT_WINDOW * 2) {
            rateLimitMap.delete(ip);
        }
    }
}, 120000);

app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return next();
    }

    const data = rateLimitMap.get(ip);

    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
        // Reset window
        data.count = 1;
        data.windowStart = now;
        return next();
    }

    data.count++;

    if (data.count > RATE_LIMIT_MAX) {
        return res.status(429).json({
            error: "Troppe richieste. Riprova tra un minuto.",
            type: "rate_limit_error",
            retryAfter: 60
        });
    }

    next();
});

// Input sanitization helper
function sanitizeInput(str, maxLength = 2000) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Strip script tags
        .replace(/<[^>]+>/g, '') // Strip all HTML tags
        .replace(/javascript:/gi, '') // Strip JS protocol
        .replace(/on\w+\s*=/gi, '') // Strip event handlers
        .trim()
        .substring(0, maxLength);
}

const { GoogleGenerativeAI: GoogleGenAI } = require("@google/generative-ai");

console.log("🚀 Backend initialized. Checking API Key...");

// FAIL FAST: Check API Key immediately
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL: GEMINI_API_KEY is missing in process.env!");
    console.error("Please add GEMINI_API_KEY to Netlify Environment Variables.");
} else {
    console.log("✅ GEMINI_API_KEY found (length: " + process.env.GEMINI_API_KEY.length + ")");
}

// ============================================
// RATE LIMITING & RETRY
// ============================================

const RETRY_DELAY = 1000; // 1 secondo tra i retry
const MAX_RETRIES = 2;

async function callGeminiWithRetry(
    prompt,
    systemPrompt = null,
    maxRetries = MAX_RETRIES,
) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Tentativo ${attempt}/${maxRetries}...`);

            const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
            const ai = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                systemInstruction: systemPrompt
            });

            const result = await ai.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error(`❌ Tentativo ${attempt} fallito:`, error.message);

            // Controllo più approfondito per il rate limiting (429)
            const isRateLimit =
                error.code === 429 ||
                error.status === "RESOURCE_EXHAUSTED" ||
                (error.response && error.response.status === 429) ||
                (error.message && error.message.includes("429")) ||
                (error.message && error.message.includes("quota"));

            if (isRateLimit) {
                if (attempt < maxRetries) {
                    const waitTime = RETRY_DELAY * attempt;
                    console.log(`⏳ Rate limited. Aspettando ${waitTime}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                    continue;
                }
            }

            // Se è l'ultimo tentativo, butta l'errore
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }
}

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
    console.error("❌ Errore globale:", err);

    // Se è un errore di rate limiting, ritorna 503 Service Unavailable
    if (err.code === 429 || err.status === "RESOURCE_EXHAUSTED") {
        return res.status(503).json({
            error: "Troppi richieste a Gemini. Riprova tra 30 secondi.",
            type: "rate_limit_error",
            retryAfter: 30,
        });
    }

    res.status(500).json({
        error: err.message,
        details:
            process.env.NODE_ENV === "development"
                ? err.stack
                : "Internal server error",
    });
});

// ============================================
// ENDPOINT FLASHCARDS
// ============================================
app.post("/api/generate-flashcards", async (req, res) => {
    try {
        const { notes, subject, numberOfCards } = req.body;

        console.log("📨 Flashcard request ricevuto");

        if (!notes || notes.trim().length === 0) {
            return res
                .status(400)
                .json({ error: "Notes required and cannot be empty" });
        }

        if (!numberOfCards || numberOfCards < 1) {
            return res
                .status(400)
                .json({ error: "numberOfCards must be at least 1" });
        }

        // Limita la lunghezza per evitare rate limiting
        const truncatedNotes = notes.substring(0, 2500);

        const prompt = `Analizza questi appunti e crea ${numberOfCards} flashcard intelligenti.

APPUNTI:
"${truncatedNotes}"

MATERIA: ${subject || "Generale"}

ISTRUZIONI:
1. Estrai i concetti principali
2. Crea domande che testano la comprensione
3. Risposte complete ma sintetiche

RISPOSTA: Solo JSON array, niente altro!
[{"front": "domanda", "back": "risposta"}]`;

        const text = await callGeminiWithRetry(prompt, null, 3);

        if (!text) {
            return res.json({ flashcards: [] });
        }

        // Pulisci il testo
        let cleanText = text.replace(/```json\n?/g, "");
        cleanText = cleanText.replace(/```\n?/g, "");
        cleanText = cleanText.trim();

        const jsonMatch = cleanText.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            return res.json({ flashcards: [] });
        }

        let flashcards = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(flashcards)) {
            flashcards = [];
        }

        res.json({ flashcards });
    } catch (error) {
        console.error("❌ Errore critico flashcards:", error);
        console.error("Stack trace:", error.stack);

        if (error.code === 429 || error.status === "RESOURCE_EXHAUSTED") {
            return res.status(503).json({
                error: "Troppe richieste a Gemini. Riprova tra 30 secondi.",
                type: "rate_limit_error",
                retryAfter: 30,
            });
        }

        res.status(500).json({
            error: error.message,
            type: "flashcard_generation_error",
        });
    }
});

// ============================================
// ENDPOINT DUEL QUIZ GENERATION
// ============================================
app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        const { subject, context, difficulty = 'media' } = req.body;

        console.log(`📨 Duel Quiz request: ${subject} (${difficulty}) ${context ? '(with context)' : ''}`);

        let prompt = "";

        if (context && context.trim().length > 0) {
            // CONTEXT-BASED GENERATION (Notes/PDF)
            prompt = `Analizza il seguente testo e crea un quiz di 10 domande a risposta multipla.
            
TESTO DI RIFERIMENTO:
"${context.substring(0, 15000)}"

DIFFICOLTÀ: ${difficulty}

REGOLE:
1. Le domande devono essere basate ESCLUSIVAMENTE sul testo fornito.
2. 4 opzioni per domanda.
3. Indica l'indice corretto (0-3).
4. Risposta formato JSON Array identico a prima.
            `;
        } else {
            // SUBJECT-BASED GENERATION
            prompt = `Crea un quiz di 10 domande a risposta multipla su: ${subject || "Cultura Generale"}.
Difficoltà: ${difficulty}.

REGOLE:
1. Devi fornire 4 opzioni per ogni domanda.
2. Indica l'indice della risposta corretta (0-3).
3. Sii vario e interessante.

RISPOSTA: Solo JSON array, niente testo extra.
Formato: [{"question": "Domanda?", "options": ["A", "B", "C", "D"], "answer": 0}]`;
        }

        const text = await callGeminiWithRetry(prompt, "Sei un generatore di quiz scolastici preciso e professionale.");

        if (!text) throw new Error("Generazione fallita");

        let cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonMatch = cleanText.match(/\[[\s\S]*\]/);

        if (!jsonMatch) throw new Error("Formato JSON non trovato");

        const quiz = JSON.parse(jsonMatch[0]);
        res.json({ quiz });
    } catch (error) {
        console.error("❌ Errore Duel Quiz:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ENDPOINT CHATBOT
// ============================================
app.post("/api/chat", async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ Attempted to call Chat API without GEMINI_API_KEY");
            return res.status(500).json({
                error: "Server configuration error: GEMINI_API_KEY is missing.",
                type: "config_error"
            });
        }

        const { message, history = [], context = "", stream = false } = req.body;

        if (!message || message.trim().length === 0) {
            return res
                .status(400)
                .json({ error: "Message required and cannot be empty" });
        }

        // Costruisci la cronologia - MAX 6 messaggi
        const conversationHistory = (history || [])
            .slice(-6)
            .map((msg) => {
                try {
                    if (!msg || !msg.role || !msg.content) return null;
                    return {
                        role: msg.role === "user" ? "user" : "model",
                        parts: [{ text: String(msg.content || "").substring(0, 800) }],
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter(Boolean);

        const systemPrompt = `Tu sei un AI Tutor amichevole e competente. 
Il tuo ruolo è aiutare gli studenti.

ISTRUZIONI:
- Sii chiaro e conciso
- Usa esempi
- Rispondi in italiano
- Se chiedi appunti, generali completi e ben strutturati

${context ? `CONTESTO: ${context}` : ""}`;

        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const ai = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: systemPrompt
        });

        const contents = [
            ...conversationHistory,
            {
                role: "user",
                parts: [{ text: String(message).substring(0, 800) }],
            },
        ];

        // Se l'utente ha chiesto lo streaming
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const result = await ai.generateContentStream({ contents });

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }

            res.write('data: [DONE]\n\n');
            return res.end();
        }

        // Altrimenti risposta classica (compatibilità garantita)
        const result = await ai.generateContent({ contents });
        const response = await result.response;
        const reply = response.text() || "Nessuna risposta generata";

        res.json({
            reply: reply.substring(0, 5000),
            success: true,
        });
    } catch (error) {
        console.error("❌ Errore critico Chat:", error);
        console.error("Stack trace:", error.stack);

        if (error.code === 429 || error.status === "RESOURCE_EXHAUSTED" || error.message?.includes("429")) {
            return res.status(503).json({
                error: "Troppe richieste a Gemini. Riprova tra 30 secondi.",
                type: "rate_limit_error",
                retryAfter: 30,
            });
        }

        res.status(500).json({
            error: error.message || "Unknown error during chat generation",
            type: "chat_error",
        });
    }
});

// ============================================
// PRISTINE SUPABASE BACKEND PROXY
// ============================================
app.post("/api/supabase-proxy", async (req, res) => {
    try {
        const { path, method, headers, body } = req.body;
        if (!path) return res.status(400).json({ error: "Missing path" });

        const supabaseUrl = 'https://rzdpntvojpibbndhsrlz.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M';

        // STRICT HEADER WHITELIST: We only send auth and content-type.
        // Sending browser headers (user-agent, referer, x-client-info) triggers Cloudflare 520.
        const cleanHeaders = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Connection': 'close',
            'Accept-Encoding': 'identity'
        };

        if (headers) {
            const hasHeader = (key) => Object.keys(headers).find(k => k.toLowerCase() === key.toLowerCase());

            const ctKey = hasHeader('content-type');
            if (ctKey) cleanHeaders['Content-Type'] = headers[ctKey];
            else cleanHeaders['Content-Type'] = 'application/json'; // Default to JSON for POST/PATCH

            const preferKey = hasHeader('prefer');
            let preferVal = preferKey ? headers[preferKey] : '';
            if ((method === 'POST' || method === 'PATCH') && !preferVal.includes('return=')) {
                preferVal = preferVal ? `${preferVal}, return=representation` : 'return=representation';
            }
            if (preferVal) cleanHeaders['Prefer'] = preferVal;

            const rangeKey = hasHeader('range');
            if (rangeKey) cleanHeaders['Range'] = headers[rangeKey];

            const acceptKey = hasHeader('accept');
            if (acceptKey) cleanHeaders['Accept'] = headers[acceptKey];
            else cleanHeaders['Accept'] = 'application/json';
        } else {
            cleanHeaders['Content-Type'] = 'application/json';
            cleanHeaders['Accept'] = 'application/json';
        }

        const fetchOptions = {
            method: method || 'GET',
            headers: cleanHeaders
        };

        if (body && method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const fetchRes = await fetch(`${supabaseUrl}${cleanPath}`, fetchOptions);

        // Forward EXACT headers back to the original client so supabase-js can parse correctly
        fetchRes.headers.forEach((value, key) => {
            // Vercel/Node fetch automatically decompresses gzip. We must strip 'content-encoding'
            // otherwise the browser will think the plain buffer is zipped and fail to decode it.
            if (key.toLowerCase() !== 'content-encoding') {
                res.setHeader(key, value);
            }
        });

        // Some Express JSON interpreters mangle the raw response stream. 
        // We will pipe the raw fetch body (or buffer it) directly back to the client.
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return res.status(fetchRes.status).send(buffer);

    } catch (error) {
        console.error("❌ Errore proxy Supabase:", error);
        res.status(500).json({ error: error.message });
    }
});

// Export for Vercel
module.exports = app;

// Export for Netlify
const serverless = require('serverless-http');
module.exports.handler = serverless(app);

// Start server if running locally
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
