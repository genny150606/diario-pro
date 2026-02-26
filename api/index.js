const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use(cors({
    origin: true,
    credentials: true
}));

const GENAI_KEY = process.env.GEMINI_API_KEY || "";
const SUPABASE_URL = "https://rzdpntvojpibbndhsrlz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M';

let genAI = null;
if (GENAI_KEY) {
    try { genAI = new GoogleGenerativeAI(GENAI_KEY); }
    catch (e) { console.error("GenAI Init Error:", e); }
}

// DIAGNOSTICA AVANZATA
app.get("/api/health", async (req, res) => {
    let supabaseStatus = "unknown";
    try {
        const start = Date.now();
        const testReq = await fetch(`${SUPABASE_URL}/rest/v1/users_data?select=id&limit=1`, {
            headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
        });
        supabaseStatus = `${testReq.status} (${Date.now() - start}ms)`;
    } catch (e) {
        supabaseStatus = `Error: ${e.message}`;
    }

    res.json({
        status: "alive",
        version: "v13-omega-max",
        gen_ai: !!genAI,
        env: { has_gemini: !!GENAI_KEY, has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
        connectivity: { supabase: supabaseStatus }
    });
});

// AI HELPERS
async function getAIText(result) {
    try { return (await result.response).text(); }
    catch (e) { return ""; }
}

async function generateWithFallback(prompt) {
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            const ai = genAI.getGenerativeModel({ model: modelName });
            const result = await ai.generateContent(prompt);
            return await getAIText(result);
        } catch (err) {
            lastError = err;
            console.warn(`[GEN_AI] Model ${modelName} failed:`, err.message);
            if (!String(err.message).includes('429')) {
                break; // Non-quota error, throw immediately
            }
            await new Promise(r => setTimeout(r, 600)); // Exponential-ish backoff
        }
    }
    throw lastError;
}

function safelyParseJSON(text, defaultValue = []) {
    if (!text) return defaultValue;
    try {
        const match = text.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : defaultValue;
    } catch (e) { return defaultValue; }
}

// AI ENDPOINTS
app.post("/api/generate-flashcards", async (req, res) => {
    try {
        if (!genAI) throw new Error("GenAI not initialized");
        const { topic, notes, amount, numberOfCards } = req.body;

        const finalTopic = topic || notes || "Argomento Generale";
        const finalAmount = amount || numberOfCards || 5;

        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let prompt = "";
        if (notes && !topic) {
            prompt = `Analizza questi appunti e genera esattamente ${finalAmount} flashcard di studio.
Restituisci SOLO un array JSON valido, senza testo aggiuntivo, senza markdown, senza spiegazioni.
Il formato ESATTO richiesto è: [{"front": "domanda", "back": "risposta"}, ...]
Gli appunti sono: ${notes.substring(0, 4000)}
Le domande devono essere chiare e le risposte concise. Non aggiungere NULLA fuori dall'array JSON.`;
        } else {
            prompt = `Genera esattamente ${finalAmount} flashcard di studio sull'argomento: "${finalTopic}".
Restituisci SOLO un array JSON valido, senza testo aggiuntivo, senza markdown, senza spiegazioni.
Il formato ESATTO richiesto è: [{"front": "domanda", "back": "risposta"}, ...]
Copri i punti chiave dell'argomento. Non aggiungere NULLA fuori dall'array JSON.`;
        }

        const aiText = await generateWithFallback(prompt);
        res.json({ flashcards: safelyParseJSON(aiText) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        if (!genAI) throw new Error("GenAI not initialized");
        const { subject, context, amount = 5 } = req.body;
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let prompt = "";
        const jsonFormat = `[{"question": "domanda?", "options": ["A", "B", "C", "D"], "correct": 0}]`;

        if (context && context.trim().length > 0) {
            prompt = `Analizza il seguente testo e genera esattamente ${amount} domande a risposta multipla basate sul suo contenuto.
Restituisci SOLO un array JSON valido, senza markdown, senza testo aggiuntivo.
Formato: ${jsonFormat}
Dove "correct" è l'indice (0-3) della risposta esatta.
Testo: ${context.substring(0, 8000)}`;
        } else {
            const finalSubject = subject || "Cultura Generale";
            prompt = `Genera esattamente ${amount} domande a risposta multipla di alto livello su: "${finalSubject}".
Restituisci SOLO un array JSON valido, senza markdown, senza testo aggiuntivo.
Formato: ${jsonFormat}
Dove "correct" è l'indice (0-3) della risposta esatta.`;
        }

        const aiText = await generateWithFallback(prompt);
        const rawQuiz = safelyParseJSON(aiText);

        // Robust Normalization & Validation
        const sanitizedQuiz = Array.isArray(rawQuiz) ? rawQuiz.map(q => {
            const correctIndex = typeof q.correct === 'number' ? q.correct : (typeof q.answer === 'number' ? q.answer : 0);
            return {
                question: q.question || "Domanda non generata correttamente?",
                options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
                correct: correctIndex,
                answer: correctIndex // Doppia chiave per compatibilità
            };
        }).filter(q => q.question && q.options.length >= 2) : [];

        res.json({ quiz: sanitizedQuiz });
    } catch (e) {
        console.error("[QUIZ_GEN] Error:", e);
        res.status(500).json({ error: e.message, quiz: [] });
    }
});

app.post("/api/chat", async (req, res) => {
    try {
        if (!genAI) throw new Error("GenAI not initialized");
        const { message, history = [], stream = false } = req.body;
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const contents = [...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: m.parts || [{ text: m.content || '' }] })), { role: 'user', parts: [{ text: message }] }];
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            const streamingResult = await ai.generateContentStream({ contents });
            for await (const chunk of streamingResult.stream) res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        } else {
            res.json({ reply: await getAIText(await ai.generateContent({ contents })) });
        }
    } catch (e) {
        if (!res.headersSent) res.status(500).json({ error: e.message });
        else res.end();
    }
});

// ============================================
// SUPABASE PROXY (v13 OMEGA-MAX)
// ============================================

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

app.post("/api/supabase-proxy", async (req, res) => {
    const { path, method, headers: clientHeaders, body } = req.body || {};
    if (!path) return res.status(400).json({ error: "Missing path" });

    const targetUrl = `${SUPABASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const userAuth = clientHeaders?.Authorization || clientHeaders?.authorization;
    let lastErr;

    for (let retry = 0; retry < 2; retry++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4500);

            // Costruiamo gli header dinamicamente
            const headers = {
                'apikey': SERVICE_KEY,
                'Authorization': userAuth || `Bearer ${SERVICE_KEY}`,
                'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                'X-Client-Info': 'studyjournal-pro-proxy-v13'
            };

            // FOARDING CRITICO DI TUTTI GLI HEADER SUPABASE
            const allowedHeaders = ['accept', 'prefer', 'range', 'content-range', 'content-type'];
            Object.keys(clientHeaders || {}).forEach(k => {
                const lowK = k.toLowerCase();
                if (allowedHeaders.includes(lowK)) {
                    headers[lowK] = clientHeaders[k];
                }
            });

            // Fallback se non specificati
            if (!headers['accept']) headers['accept'] = 'application/json';

            const isWrite = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
            if (isWrite && body && !headers['content-type']) {
                headers['content-type'] = 'application/json';
            }

            const fetchRes = await fetch(targetUrl, {
                method: method || 'GET',
                headers,
                body: isWrite && body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (fetchRes.status < 500) {
                res.status(fetchRes.status);
                // Forward delle risposte headers
                ['content-type', 'content-range', 'preference-applied', 'location'].forEach(k => {
                    const v = fetchRes.headers.get(k);
                    if (v) res.setHeader(k, v);
                });
                if (fetchRes.status === 204 || fetchRes.status === 304) return res.end();

                const contentType = fetchRes.headers.get('content-type') || '';
                if (contentType.includes('application/json') || contentType.includes('text/')) {
                    const text = await fetchRes.text();
                    return res.send(text);
                } else {
                    const arrayBuffer = await fetchRes.arrayBuffer();
                    return res.send(Buffer.from(arrayBuffer));
                }
            }
            throw new Error(`Supabase Error ${fetchRes.status}`);
        } catch (err) {
            lastErr = err;
            if (retry < 1) await new Promise(r => setTimeout(r, 400));
        }
    }

    if (!res.headersSent) {
        res.status(502).json({
            error: "Proxy Failed",
            message: lastErr?.message,
            version: "v13-omega-max"
        });
    }
});

module.exports = app;
