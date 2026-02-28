const express = require("express");
const path = require("path");
// Cerca il file .env sia nella root che nella cartella api/
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') });
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const pdfParse = require("pdf-parse");
// This pdf-parse version requires buffer passed as {data} in the constructor
const pdf = async (buffer) => {
    try {
        const parser = new pdfParse.PDFParse({ data: buffer, verbosity: 0 });
        await parser.load();
        const resultObj = await parser.getText();
        return { text: resultObj.text || '' };
    } catch (e) {
        console.error("[PDF PARSE ERROR]", e.message);
        throw e;
    }
};

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});
app.use(express.json({ limit: '10mb' }));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info', 'prefer', 'accept'],
    credentials: false
}));

const KEYS = {
    chat: process.env.GEMINI_API_KEY_CHAT?.trim(),
    duel: process.env.GEMINI_API_KEY_DUEL?.trim(),
    flashcards: process.env.GEMINI_API_KEY_FLASHCARDS?.trim(),
    pdf: process.env.GEMINI_API_KEY_PDF?.trim()
};

// Log quali chiavi sono presenti
console.log(`[DEBUG] Chiavi Gemini trovate:`);
console.log(`  - Chat: ${KEYS.chat ? 'OK' : 'MANCANTE'}`);
console.log(`  - Duel: ${KEYS.duel ? 'OK' : 'MANCANTE'}`);
console.log(`  - Flashcards: ${KEYS.flashcards ? 'OK' : 'MANCANTE'}`);
console.log(`  - PDF: ${KEYS.pdf ? 'OK' : 'MANCANTE'}`);

const SUPABASE_URL = "https://rzdpntvojpibbndhsrlz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M';

// Inizializza le istanze AI solo per le chiavi presenti
const aiInstances = {};
for (const [feature, key] of Object.entries(KEYS)) {
    if (key) {
        try {
            aiInstances[feature] = new GoogleGenerativeAI(key);
        } catch (e) {
            console.error(`[ERROR] Inizializzazione AI fallita per: ${feature}`);
        }
    }
}

function getAIForFeature(feature) {
    if (aiInstances[feature]) return aiInstances[feature];

    // Fallback: se la chiave richiesta manca, cerca la prima disponibile
    const fallbackFeature = Object.keys(aiInstances)[0];
    if (fallbackFeature) {
        console.warn(`[WARNING] Chiave per '${feature}' mancante. Uso la chiave '${fallbackFeature}' come ripiego.`);
        return aiInstances[fallbackFeature];
    }

    return null;
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
        version: "v14-multi-key",
        ai_instances: Object.keys(aiInstances),
        env: { has_any_gemini: Object.keys(aiInstances).length > 0, has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
        connectivity: { supabase: supabaseStatus }
    });
});

// AI HELPERS
async function getAIText(result) {
    try { return (await result.response).text(); }
    catch (e) { return ""; }
}

async function generateWithFallback(prompt, feature) {
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
    const currentAI = getAIForFeature(feature);

    if (!currentAI) throw new Error("Nessuna chiave API Gemini configurata per il sistema.");

    let lastError = null;
    for (const modelName of modelsToTry) {
        try {
            const ai = currentAI.getGenerativeModel({ model: modelName });
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            let result;
            try {
                result = await ai.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 2500 }
                }, { signal: controller.signal });
                clearTimeout(timeoutId);
            } catch (networkErr) {
                clearTimeout(timeoutId);
                throw networkErr;
            }

            return await getAIText(result);
        } catch (err) {
            console.warn(`[GEN_AI] Attempt failed for ${feature} with model ${modelName}:`, err.message);
            lastError = err;
            if (String(err.message).includes('429') || String(err.message).includes('503')) {
                continue;
            }
            throw err;
        }
    }
    throw lastError || new Error(`Generazione AI fallita.`);
}

function safelyParseJSON(text, defaultValue = []) {
    if (!text) return defaultValue;
    try {
        const match = text.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : defaultValue;
    } catch (e) { return defaultValue; }
}

function normalizeGeminiHistory(rawContents) {
    const normalized = [];
    for (const item of rawContents) {
        if (!item || !item.role || !item.parts || !item.parts[0]?.text) continue;

        if (normalized.length === 0) {
            if (item.role === 'model') {
                // Gemini richiede che il primo messaggio sia sempre 'user'
                normalized.push({ role: 'user', parts: [{ text: '[Inizio conversazione]' }] });
            }
            normalized.push(item);
        } else {
            const lastItem = normalized[normalized.length - 1];
            if (lastItem.role === item.role) {
                // Se due messaggi hanno lo stesso ruolo consecutivamente, uniscili
                lastItem.parts[0].text += '\n\n' + item.parts[0].text;
            } else {
                normalized.push(item);
            }
        }
    }
    return normalized;
}

// NOTE ENHANCEMENT ENDPOINTS
app.post("/api/summarize-note", async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) throw new Error("Contenuto nota mancante");

        const prompt = `Riassumi il seguente testo in modo conciso ma esaustivo, evidenziando i punti chiave in elenco puntato markdown. Max 200 parole.\n\nTesto: ${content}`;
        const aiText = await generateWithFallback(prompt, 'chat');
        res.json({ summary: aiText });
    } catch (e) {
        console.error("\n[CRITICAL ERROR] Note Summary Failed:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/smart-title", async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) throw new Error("Contenuto nota mancante");

        const prompt = `Analizza questo contenuto e suggerisci un titolo breve ed efficace (max 5-6 parole). Restituisci SOLO il titolo, senza virgolette o commenti.\n\nContenuto: ${content}`;
        const aiText = await generateWithFallback(prompt, 'chat');
        res.json({ title: aiText.trim() });
    } catch (e) {
        console.error("\n[CRITICAL ERROR] Smart Title Failed:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// AI ENDPOINTS
app.post("/api/generate-flashcards", async (req, res) => {
    try {
        const { topic, notes, amount, numberOfCards } = req.body;
        const finalTopic = topic || notes || "Argomento Generale";
        const finalAmount = amount || numberOfCards || 5;

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

        const aiText = await generateWithFallback(prompt, 'flashcards');
        res.json({ flashcards: safelyParseJSON(aiText) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        const { subject, context, amount = 5 } = req.body;
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

        const aiText = await generateWithFallback(prompt, 'duel');
        const rawQuiz = safelyParseJSON(aiText);

        const sanitizedQuiz = Array.isArray(rawQuiz) ? rawQuiz.map(q => {
            const correctIndex = typeof q.correct === 'number' ? q.correct : (typeof q.answer === 'number' ? q.answer : 0);
            return {
                question: q.question || "Domanda non generata correttamente?",
                options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
                correct: correctIndex,
                answer: correctIndex
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
        const currentAI = getAIForFeature('chat');
        if (!currentAI) throw new Error("Nessuna chiave API Gemini configurata.");

        const { message, history = [], stream = false } = req.body;

        const rawContents = [
            ...history.map(m => {
                let textContent = '';
                if (typeof m.content === 'string') textContent = m.content;
                else if (Array.isArray(m.parts) && m.parts[0]?.text) textContent = m.parts[0].text;

                return {
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: textContent || '...' }]
                };
            }),
            { role: 'user', parts: [{ text: message || '...' }] }
        ];
        const contents = normalizeGeminiHistory(rawContents);

        const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const ai = currentAI.getGenerativeModel({ model: modelName });
                if (stream) {
                    const streamingResult = await ai.generateContentStream({ contents });
                    res.setHeader('Content-Type', 'text/event-stream');
                    for await (const chunk of streamingResult.stream) {
                        res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
                    }
                    res.write(`data: [DONE]\n\n`);
                    return res.end();
                } else {
                    const result = await ai.generateContent({ contents });
                    return res.json({ reply: await getAIText(result) });
                }
            } catch (err) {
                console.warn(`\n[CHAT WARNING] Model ${modelName} failed:`, err.message);
                lastError = err;
                if (!res.headersSent && (String(err.message).includes('429') || String(err.message).includes('503'))) {
                    continue; // Prova il prossimo modello
                }
                throw err;
            }
        }
        throw lastError || new Error("Generazione chat fallita su tutti i modelli");
    } catch (e) {
        console.error("\n[CRITICAL ERROR] Chat Endpoint Failed:", e.message);
        console.error("[CRITICAL ERROR STACK]:", e.stack);
        if (!res.headersSent) res.status(500).json({ error: e.message });
        else res.end();
    }
});

// PDF ANALYSIS ENDPOINTS
app.post("/api/analyze-pdf", upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error("File PDF mancante");

        const dataBuffer = req.file.buffer;
        const pdfData = await pdf(dataBuffer);
        const text = (pdfData.text || "").trim();

        if (text.length < 10) {
            throw new Error("Il PDF sembra vuoto o non è possibile estrarre il testo. Assicurati che non sia solo un'immagine scansita senza OCR.");
        }

        const limitedText = text.substring(0, 30000);

        const prompt = `Analizza il seguente testo estratto da un documento PDF e restituisci:
1. Un riassunto strutturato in markdown (max 500 parole).
2. Un array JSON di esattamente 5 flashcard chiave nel formato [{"front": "domanda", "back": "risposta"}].

Restituisci la risposta in questo formato JSON esatto:
{
  "summary": "contenuto markdown qui",
  "flashcards": [...]
}

Testo del documento:
${limitedText}`;

        const aiText = await generateWithFallback(prompt, 'pdf');

        let summary = "Impossibile generare riassunto.";
        let flashcards = [];

        try {
            const cleanText = aiText.replace(/```json|```/g, "").trim();
            const jsonStart = cleanText.indexOf('{');
            const jsonEnd = cleanText.lastIndexOf('}') + 1;

            if (jsonStart === -1 || jsonEnd === 0) throw new Error("AI non ha restituito JSON valido");

            const result = JSON.parse(cleanText.substring(jsonStart, jsonEnd));
            summary = result.summary || summary;
            flashcards = result.flashcards || [];
        } catch (e) {
            console.error("Parse Error PDF Analysis:", e.message);
            flashcards = safelyParseJSON(aiText);
        }

        res.json({ summary, flashcards, textPreview: text.substring(0, 1000) });
    } catch (e) {
        console.error("\n[CRITICAL ERROR] PDF Analysis Failed:", e.message);
        console.error("[CRITICAL ERROR STACK]:", e.stack);
        res.status(500).json({
            error: "Errore durante l'analisi del PDF",
            details: e.message
        });
    }
});

app.post("/api/document-chat", async (req, res) => {
    try {
        const currentAI = getAIForFeature('pdf');
        if (!currentAI) throw new Error("Nessuna chiave API Gemini configurata.");

        const { message, documentText, history = [] } = req.body;

        const systemPrompt = `Sei un assistente di studio. Rispondi alle domande dell'utente basandoti ESCLUSIVAMENTE sul seguente testo del documento fornito. Se la risposta non è presente nel testo, dillo chiaramente.
Documento:
${documentText.substring(0, 25000)}`;

        const rawContents = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Certamente. Ho analizzato il documento e sono pronto a rispondere alle tue domande." }] },
            ...history.map(m => {
                let textContent = '';
                if (typeof m.content === 'string') textContent = m.content;
                else if (Array.isArray(m.parts) && m.parts[0]?.text) textContent = m.parts[0].text;

                return {
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: textContent || '...' }]
                };
            }),
            { role: 'user', parts: [{ text: message || '...' }] }
        ];
        const contents = normalizeGeminiHistory(rawContents);

        const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const ai = currentAI.getGenerativeModel({ model: modelName });
                const result = await ai.generateContent({ contents });
                return res.json({ reply: await getAIText(result) });
            } catch (err) {
                console.warn(`\n[DOC-CHAT WARNING] Model ${modelName} failed:`, err.message);
                lastError = err;
                if (String(err.message).includes('429') || String(err.message).includes('503')) continue;
                throw err;
            }
        }
        throw lastError || new Error("Generazione document chat fallita su tutti i modelli");
    } catch (e) {
        res.status(500).json({ error: e.message });
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

app.options("/api/supabase-proxy", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, prefer, x-client-info, accept');
    res.status(204).end();
});

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

            const fetchOptions = {
                method: method || 'GET',
                headers,
                signal: controller.signal
            };
            if (isWrite && body) {
                fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
            }

            const fetchRes = await fetch(targetUrl, fetchOptions);
            clearTimeout(timeoutId);

            if (!fetchRes.ok && fetchRes.status >= 500) {
                throw new Error(`Supabase Error ${fetchRes.status}`);
            }

            // Forward delle risposte headers e CORS garantito
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');

            ['content-type', 'content-range', 'preference-applied', 'location'].forEach(k => {
                const v = fetchRes.headers.get(k);
                if (v) res.setHeader(k, v);
            });

            res.status(fetchRes.status);

            if (fetchRes.status === 204 || fetchRes.status === 304) return res.end();

            const contentType = fetchRes.headers.get('content-type') || '';
            if (contentType.includes('application/json') || contentType.includes('text/')) {
                const text = await fetchRes.text();
                return res.send(text);
            } else {
                const arrayBuffer = await fetchRes.arrayBuffer();
                return res.send(Buffer.from(arrayBuffer));
            }
        } catch (err) {
            lastErr = err;
            if (retry < 1) await new Promise(r => setTimeout(r, 400));
        }
    }

    if (!res.headersSent) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.status(502).json({
            error: "Proxy Failed",
            message: lastErr?.message,
            version: "v14-omega-max"
        });
    }
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.use((err, req, res, next) => {
        console.error(`\n[GLOBAL ERROR] su ${req.method} ${req.path}:`, err.message);
        console.error("[GLOBAL ERROR STACK]:", err.stack);
        res.status(500).json({ error: "Errore server interno", details: err.message });
    });

    process.on('uncaughtException', (err) => {
        console.error('\n[UNCAUGHT EXCEPTION] Impedita terminazione Node:', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('\n[UNHANDLED REJECTION] Impedita propagazione a cascata. Reason:', reason);
    });

    app.listen(PORT, '0.0.0.0', () => console.log(`Backend server running on http://localhost:${PORT}`));
}
