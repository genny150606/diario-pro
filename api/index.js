const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// Explicitly allow 'null' origin (for local file access) and vercel domain
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origin === 'null' || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

app.post("/api/generate-flashcards", async (req, res) => {
    try {
        const { topic, amount = 5 } = req.body;
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await ai.generateContent(`Genera ${amount} flashcard su "${topic}" in formato JSON: [{"q": "domanda", "a": "risposta"}]`);
        res.json({ flashcards: JSON.parse((await result.response).text().match(/\[[\s\S]*\]/)[0]) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        const { topic } = req.body;
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await ai.generateContent(`Genera 10 domande a risposta multipla su "${topic}" in JSON: [{"question": "...", "options": ["...", "...", "..."], "answer": 0}]`);
        res.json({ quiz: JSON.parse((await result.response).text().match(/\[[\s\S]*\]/)[0]) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/chat", async (req, res) => {
    try {
        const { message, history = [], stream = false } = req.body;
        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const contents = [
            ...history.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            })),
            { role: 'user', parts: [{ text: message }] }
        ];

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const streamingResult = await ai.generateContentStream({ contents });

            for await (const chunk of streamingResult.stream) {
                const chunkText = chunk.text();
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }
            res.write(`data: [DONE]\n\n`);
            res.end();
        } else {
            const result = await ai.generateContent({ contents });
            res.json({ reply: (await result.response).text() });
        }
    } catch (error) {
        console.error("Chat Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});

// ============================================
// NATIVE HTTPS SUPABASE PROXY (ULTIMATE 520 FIX)
// ============================================

app.post("/api/supabase-proxy", async (req, res) => {
    const { path, method, headers: clientHeaders, body } = req.body || {};
    if (!path) return res.status(400).json({ error: "Missing path" });

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use ENV key
    const userAuth = clientHeaders?.Authorization || clientHeaders?.authorization;

    // List of common browser User-Agents for rotation
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    const targetUrl = `https://rzdpntvojpibbndhsrlz.supabase.co${path.startsWith('/') ? path : `/${path}`}`;
    let lastErr;

    // INTERNAL RETRY on the backend (Keep it short for Vercel 10s limit)
    for (let retry = 0; retry < 2; retry++) {
        try {
            console.log(`[FETCH PROXY] ${method || 'GET'} ${path} (Attempt ${retry + 1})`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout per attempt

            const proxyHeaders = {
                'apikey': supabaseKey,
                'Authorization': userAuth || `Bearer ${supabaseKey}`,
                'Accept': 'application/json',
                'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                'X-Client-Info': 'studyjournal-pro-proxy-v5'
            };

            const isWrite = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
            if (isWrite && (body || clientHeaders?.['content-type'])) {
                proxyHeaders['Content-Type'] = 'application/json';
            }

            ['prefer', 'range', 'content-range'].forEach(k => {
                const v = clientHeaders?.[k] || clientHeaders?.[k.toLowerCase()] || clientHeaders?.[k.toUpperCase()];
                if (v) proxyHeaders[k] = v;
            });

            const fetchRes = await fetch(targetUrl, {
                method: method || 'GET',
                headers: proxyHeaders,
                body: isWrite && body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                cache: 'no-store',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (fetchRes.status < 500) {
                res.status(fetchRes.status);
                ['content-type', 'content-range', 'preference-applied', 'location'].forEach(k => {
                    const v = fetchRes.headers.get(k);
                    if (v) res.setHeader(k, v);
                });
                if (fetchRes.status === 204 || fetchRes.status === 304 || fetchRes.headers.get('content-length') === '0') {
                    return res.end();
                }
                const resData = await fetchRes.arrayBuffer();
                return res.send(Buffer.from(resData));
            }

            throw new Error(`Supabase Status ${fetchRes.status}`);
        } catch (err) {
            lastErr = err;
            console.error(`[PROXY RETRY ${retry + 1}]`, err.message);
            if (retry < 1) await new Promise(r => setTimeout(r, 500));
        }
    }

    if (!res.headersSent) {
        res.status(502).json({ error: "Proxy Exhausted", message: lastErr?.message });
    }
});

module.exports = app;
const serverless = require('serverless-http');
module.exports.handler = serverless(app);

if (require.main === module) {
    app.listen(process.env.PORT || 3000, () => console.log("System Running"));
}
