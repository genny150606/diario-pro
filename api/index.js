const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

// PROTEZIONE GLOBALE CONTRO I CRASH
process.on('uncaughtException', (err) => {
    console.error('FATAL UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL UNHANDLED REJECTION:', reason);
});

app.use(cors({
    origin: true,
    credentials: true
}));

const GENAI_KEY = process.env.GEMINI_API_KEY || "";
const SUPABASE_URL = "https://rzdpntvojpibbndhsrlz.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M';

let genAI = null;
function ensureGenAI() {
    if (genAI) return genAI;
    if (!GENAI_KEY) throw new Error("GEMINI_API_KEY is missing in environment");
    genAI = new GoogleGenAI(GENAI_KEY);
    return genAI;
}

// DIAGNOSTICA AVANZATA
app.get("/api/health", async (req, res) => {
    let supabaseStatus = "unknown";
    try {
        const testReq = await fetch(`${SUPABASE_URL}/rest/v1/users_data?select=id&limit=1`, {
            headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
        });
        supabaseStatus = `${testReq.status} (${testReq.statusText})`;
    } catch (e) {
        supabaseStatus = `Error: ${e.message}`;
    }

    res.json({
        status: "alive",
        version: "v11-zeta",
        env: {
            has_gemini: !!GENAI_KEY,
            has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            node: process.version
        },
        connectivity: { supabase: supabaseStatus }
    });
});

// AI HELPERS
async function getAIText(result) {
    try {
        const response = await result.response;
        return response.text();
    } catch (e) {
        console.error("AI Error:", e);
        return "";
    }
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
        const aiModel = ensureGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
        const { topic, amount = 5 } = req.body;
        const result = await aiModel.generateContent(`Genera ${amount} flashcard su "${topic}" in formato JSON: [{"q": "domanda", "a": "risposta"}]`);
        res.json({ flashcards: safelyParseJSON(await getAIText(result)) });
    } catch (e) { res.status(500).json({ error: "AI Flashcards Error", message: e.message }); }
});

app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        const aiModel = ensureGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
        const { topic } = req.body;
        const result = await aiModel.generateContent(`Genera 10 domande a risposta multipla su "${topic}" in JSON: [{"question": "...", "options": ["...", "...", "..."], "answer": 0}]`);
        res.json({ quiz: safelyParseJSON(await getAIText(result)) });
    } catch (e) { res.status(500).json({ error: "AI Quiz Error", message: e.message }); }
});

app.post("/api/chat", async (req, res) => {
    try {
        const aiModel = ensureGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
        const { message, history = [], stream = false } = req.body;
        const contents = [...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })), { role: 'user', parts: [{ text: message }] }];
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            const streamingResult = await aiModel.generateContentStream({ contents });
            for await (const chunk of streamingResult.stream) res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        } else {
            const result = await aiModel.generateContent({ contents });
            res.json({ reply: await getAIText(result) });
        }
    } catch (e) {
        if (!res.headersSent) res.status(500).json({ error: "AI Chat Error", message: e.message });
        else res.end();
    }
});

// ============================================
// SUPABASE PROXY (v11 ZETA)
// ============================================

app.post("/api/supabase-proxy", async (req, res) => {
    console.log(`[PROXY v11] Incoming: ${req.body?.path}`);
    try {
        const { path, method, headers: clientHeaders, body } = req.body || {};
        if (!path) return res.status(400).json({ error: "Missing path" });

        const targetUrl = `${SUPABASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
        const userAuth = clientHeaders?.Authorization || clientHeaders?.authorization;

        // UNICO USER AGENT PULITO (Mozilla standard)
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

        for (let retry = 0; retry < 2; retry++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);

                const headers = {
                    'apikey': SERVICE_KEY,
                    'Authorization': userAuth || `Bearer ${SERVICE_KEY}`,
                    'Accept': 'application/json',
                    'User-Agent': userAgent,
                    'X-Client-Info': 'studyjournal-pro-v11'
                };

                const isWrite = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
                if (isWrite && body) headers['Content-Type'] = 'application/json';

                ['prefer', 'range', 'content-range'].forEach(k => {
                    const v = clientHeaders?.[k] || clientHeaders?.[k.toLowerCase()] || clientHeaders?.[k.toUpperCase()];
                    if (v) headers[k] = v;
                });

                const fetchRes = await fetch(targetUrl, {
                    method: method || 'GET',
                    headers,
                    body: isWrite && body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (fetchRes.status < 500) {
                    res.status(fetchRes.status);
                    ['content-type', 'content-range', 'preference-applied', 'location'].forEach(k => {
                        const v = fetchRes.headers.get(k);
                        if (v) res.setHeader(k, v);
                    });
                    if (fetchRes.status === 204 || fetchRes.status === 304) return res.end();

                    // Safera conversion
                    const arrayBuffer = await fetchRes.arrayBuffer();
                    return res.send(Buffer.from(new Uint8Array(arrayBuffer)));
                }
                throw new Error(`Supabase ${fetchRes.status}`);
            } catch (err) {
                console.error(`Attempt ${retry + 1} Error:`, err.message);
                if (retry < 1) await new Promise(r => setTimeout(r, 400));
                else throw err;
            }
        }
    } catch (globalErr) {
        console.error("PROXY GLOBAL ERROR:", globalErr);
        if (!res.headersSent) {
            res.status(502).json({
                error: "Proxy Crash",
                message: globalErr.message,
                version: "v11"
            });
        }
    }
});

// Middleware finale per errori Express
app.use((err, req, res, next) => {
    console.error("EXPRESS INTERNAL ERROR:", err);
    if (!res.headersSent) {
        res.status(500).json({ error: "Express Crash", message: err.message });
    }
});

module.exports = app;
