const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

let genAIInstance = null;
function ensureGenAI() {
    if (genAIInstance) return genAIInstance;
    if (!GENAI_KEY) throw new Error("GEMINI_API_KEY is missing in env");
    // CORREZIONE CRITICA: GoogleGenerativeAI invece di GoogleGenAI
    genAIInstance = new GoogleGenerativeAI(GENAI_KEY);
    return genAIInstance;
}

// DIAGNOSTICA AVANZATA (v12)
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
        version: "v12-titanium-x",
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
        console.error("AI Text Error:", e);
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
        const ai = ensureGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
        const { topic, amount = 5 } = req.body;
        const result = await ai.generateContent(`Genera ${amount} flashcard su "${topic}" in formato JSON: [{"q": "domanda", "a": "risposta"}]`);
        res.json({ flashcards: safelyParseJSON(await getAIText(result)) });
    } catch (e) { res.status(500).json({ error: "AI Error", message: e.message }); }
});

app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        const ai = ensureGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
        const { topic } = req.body;
        const result = await ai.generateContent(`Genera 10 domande a risposta multipla su "${topic}" in JSON: [{"question": "...", "options": ["...", "...", "..."], "answer": 0}]`);
        res.json({ quiz: safelyParseJSON(await getAIText(result)) });
    } catch (e) { res.status(500).json({ error: "AI Error", message: e.message }); }
});

app.post("/api/chat", async (req, res) => {
    try {
        const ai = ensureGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
        const { message, history = [], stream = false } = req.body;
        const contents = [...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })), { role: 'user', parts: [{ text: message }] }];
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            const streamingResult = await ai.generateContentStream({ contents });
            for await (const chunk of streamingResult.stream) {
                const text = chunk.text();
                if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
            res.write(`data: [DONE]\n\n`);
            res.end();
        } else {
            const result = await ai.generateContent({ contents });
            res.json({ reply: await getAIText(result) });
        }
    } catch (e) {
        if (!res.headersSent) res.status(500).json({ error: "AI Chat Error", message: e.message });
        else res.end();
    }
});

// ============================================
// SUPABASE PROXY (v12 TITANIUM-X)
// ============================================

app.post("/api/supabase-proxy", async (req, res) => {
    try {
        const { path, method, headers: clientHeaders, body } = req.body || {};
        if (!path) return res.status(400).json({ error: "Missing path" });

        const targetUrl = `${SUPABASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
        const userAuth = clientHeaders?.Authorization || clientHeaders?.authorization;

        const headers = {
            'apikey': SERVICE_KEY,
            'Authorization': userAuth || `Bearer ${SERVICE_KEY}`,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'X-Client-Info': 'studyjournal-pro-v12'
        };

        const isWrite = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
        if (isWrite && body) headers['Content-Type'] = 'application/json';

        ['prefer', 'range', 'content-range'].forEach(k => {
            const v = clientHeaders?.[k] || clientHeaders?.[k.toLowerCase()] || clientHeaders?.[k.toUpperCase()];
            if (v) headers[k] = v;
        });

        for (let retry = 0; retry < 2; retry++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4500);

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
                    const arrayBuffer = await fetchRes.arrayBuffer();
                    return res.send(Buffer.from(new Uint8Array(arrayBuffer)));
                }
                throw new Error(`Supabase Status ${fetchRes.status}`);
            } catch (err) {
                console.error(`[PROXY v12] Attempt ${retry + 1} Error:`, err.message);
                if (retry < 1) await new Promise(r => setTimeout(r, 400));
                else throw err;
            }
        }
    } catch (globalErr) {
        console.error("PROXY GLOBAL ERROR (v12):", globalErr);
        if (!res.headersSent) {
            const isTimeout = globalErr.name === 'AbortError';
            res.status(isTimeout ? 504 : 502).json({
                error: isTimeout ? "Timeout" : "Proxy Crash",
                message: globalErr.message
            });
        }
    }
});

// Middleware finale per errori Express
app.use((err, req, res, next) => {
    console.error("EXPRESS ERROR:", err);
    if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
});

module.exports = app;
