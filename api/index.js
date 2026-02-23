const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origin === 'null' || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            callback(null, true); // Permissivo per facilitare il debugging
        }
    },
    credentials: true
}));

const GENAI_KEY = process.env.GEMINI_API_KEY || "";
let genAI = null;
if (GENAI_KEY) {
    try {
        genAI = new GoogleGenAI(GENAI_KEY);
    } catch (e) {
        console.error("GenAI Init Error:", e);
    }
}

// DIAGNOSTICA
app.get("/api/health", (req, res) => {
    res.json({
        status: "alive",
        version: "v8-ironclad",
        node: process.version,
        env: {
            has_gemini: !!process.env.GEMINI_API_KEY,
            has_supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        globals: {
            fetch: typeof fetch !== 'undefined',
            AbortController: typeof AbortController !== 'undefined'
        }
    });
});

// ROBUST AI RESPONSE PARSING
function safelyParseJSON(text, defaultValue = []) {
    try {
        const match = text.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

app.post("/api/generate-flashcards", async (req, res) => {
    try {
        if (!genAI) throw new Error("GenAI not initialized");
        const { topic, amount = 5 } = req.body;
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await ai.generateContent(`Genera ${amount} flashcard su "${topic}" in formato JSON: [{"q": "domanda", "a": "risposta"}]`);
        res.json({ flashcards: safelyParseJSON((await result.response).text()) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        if (!genAI) throw new Error("GenAI not initialized");
        const { topic } = req.body;
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await ai.generateContent(`Genera 10 domande a risposta multipla su "${topic}" in JSON: [{"question": "...", "options": ["...", "...", "..."], "answer": 0}]`);
        res.json({ quiz: safelyParseJSON((await result.response).text()) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/chat", async (req, res) => {
    try {
        if (!genAI) throw new Error("GenAI not initialized");
        const { message, history = [], stream = false } = req.body;
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const contents = [
            ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
            { role: 'user', parts: [{ text: message }] }
        ];

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            const streamingResult = await ai.generateContentStream({ contents });
            for await (const chunk of streamingResult.stream) {
                res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
            }
            res.write(`data: [DONE]\n\n`);
            res.end();
        } else {
            const result = await ai.generateContent({ contents });
            res.json({ reply: (await result.response).text() });
        }
    } catch (error) {
        if (!res.headersSent) res.status(500).json({ error: error.message });
        else { res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`); res.end(); }
    }
});

// ============================================
// SUPABASE PROXY (ULTIMATE 520 FIX - v8 IRONCLAD)
// ============================================

app.post("/api/supabase-proxy", async (req, res) => {
    console.log("[PROXY] Inbound request:", req.body?.path);
    try {
        const { path, method, headers: clientHeaders, body } = req.body || {};
        if (!path) return res.status(400).json({ error: "Missing path" });

        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M';
        const userAuth = clientHeaders?.Authorization || clientHeaders?.authorization;

        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];

        const targetUrl = `https://rzdpntvojpibbndhsrlz.supabase.co${path.startsWith('/') ? path : `/${path}`}`;
        let lastErr;

        for (let retry = 0; retry < 2; retry++) {
            try {
                console.log(`[PROXY v8] ${method || 'GET'} ${path} (Attempt ${retry + 1})`);

                const proxyHeaders = {
                    'apikey': supabaseKey,
                    'Authorization': userAuth || `Bearer ${supabaseKey}`,
                    'Accept': 'application/json',
                    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                    'X-Client-Info': 'studyjournal-pro-proxy-v8'
                };

                const isWrite = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
                if (isWrite && body) proxyHeaders['Content-Type'] = 'application/json';

                ['prefer', 'range', 'content-range'].forEach(k => {
                    const v = clientHeaders?.[k] || clientHeaders?.[k.toLowerCase()] || clientHeaders?.[k.toUpperCase()];
                    if (v) proxyHeaders[k] = v;
                });

                // AbortController check
                let signal = null;
                if (typeof AbortController !== 'undefined') {
                    const controller = new AbortController();
                    setTimeout(() => controller.abort(), 4500);
                    signal = controller.signal;
                }

                const fetchRes = await fetch(targetUrl, {
                    method: method || 'GET',
                    headers: proxyHeaders,
                    body: isWrite && body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                    signal: signal
                });

                if (fetchRes.status < 500) {
                    res.status(fetchRes.status);
                    ['content-type', 'content-range', 'preference-applied', 'location'].forEach(k => {
                        const v = fetchRes.headers.get(k);
                        if (v) res.setHeader(k, v);
                    });
                    if (fetchRes.status === 204 || fetchRes.status === 304) return res.end();
                    const arrayBuffer = await fetchRes.arrayBuffer();
                    return res.send(Buffer.from(arrayBuffer));
                }
                throw new Error(`Supabase Status ${fetchRes.status}`);
            } catch (err) {
                lastErr = err;
                console.error(`[PROXY RETRY ${retry + 1}]`, err.message);
                if (retry < 1) await new Promise(r => setTimeout(r, 500));
            }
        }
        if (!res.headersSent) res.status(502).json({ error: "Proxy Exhausted", message: lastErr?.message });
    } catch (globalErr) {
        console.error("[PROXY GLOBAL ERROR]", globalErr);
        if (!res.headersSent) res.status(500).json({ error: "Proxy Crash", message: globalErr.message });
    }
});

module.exports = app;
