const express = require("express");
const cors = require("cors");
const https = require("https");
require("dotenv").config();

const app = express();
const allowedOrigins = [
    'https://diario-pro.vercel.app',
    'http://localhost:3000',
    'null' // For file:// protocol
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: "50mb" }));

// ============================================
// SECURITY — Minimal Rate Limiting
// ============================================
const rateLimitMap = new Map();
app.use((req, res, next) => {
    if (req.path.includes('proxy')) return next();
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const now = Date.now();
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return next();
    }
    const data = rateLimitMap.get(ip);
    if (now - data.windowStart > 60000) {
        data.count = 1;
        data.windowStart = now;
        return next();
    }
    data.count++;
    if (data.count > 100) return res.status(429).json({ error: "Rate limit" });
    next();
});

const { GoogleGenerativeAI: GoogleGenAI } = require("@google/generative-ai");

// ============================================
// ENDPOINTS — Flashcards, Duel, Chat
// ============================================

app.post("/api/generate-flashcards", async (req, res) => {
    try {
        const { notes, subject, numberOfCards } = req.body;
        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await ai.generateContent(`Analizza: "${notes.substring(0, 2000)}"\nCrea ${numberOfCards} flashcard JSON array.`);
        res.json({ flashcards: JSON.parse((await result.response).text().match(/\[[\s\S]*\]/)[0]) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        const { subject, context } = req.body;
        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await ai.generateContent(`Crea quiz 10 domande su ${subject || 'cultura'}. Context: ${context?.substring(0, 5000)}. JSON array.`);
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

app.post("/api/supabase-proxy", (req, res) => {
    const { path, method, headers: clientHeaders, body } = req.body || {};
    if (!path) return res.status(400).json({ error: "Missing path" });

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M';

    // 1. Prepare Request Headers
    const userAuth = clientHeaders?.Authorization || clientHeaders?.authorization;
    const proxyHeaders = {
        'apikey': supabaseKey,
        'Authorization': userAuth || `Bearer ${supabaseKey}`,
        'Accept': 'application/json',
        'Connection': 'close'
    };

    const isWrite = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    if (isWrite && body) proxyHeaders['Content-Type'] = 'application/json';

    // Whitelist essential Supabase headers
    ['prefer', 'range', 'x-client-info', 'content-range'].forEach(k => {
        const v = clientHeaders?.[k] || clientHeaders?.[k.toLowerCase()] || clientHeaders?.[k.toUpperCase()];
        if (v) proxyHeaders[k] = v;
    });

    // 2. Execute Request using Native HTTPS
    const options = {
        hostname: 'rzdpntvojpibbndhsrlz.supabase.co',
        port: 443,
        path: path.startsWith('/') ? path : `/${path}`,
        method: method || 'GET',
        headers: proxyHeaders,
        timeout: 9000 // Stay under Vercel 10s limit
    };

    console.log(`[RAW PROXY] ${options.method} ${options.path}`);

    const proxyReq = https.request(options, (proxyRes) => {
        // Copy back status and minimal headers
        res.status(proxyRes.statusCode);

        ['content-type', 'content-range', 'preference-applied', 'location'].forEach(k => {
            if (proxyRes.headers[k]) res.setHeader(k, proxyRes.headers[k]);
        });

        // Pipe response back to client
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error("[RAW PROXY ERROR]", err.message);
        if (!res.headersSent) {
            res.status(502).json({ error: "Proxy Error", message: err.message });
        }
    });

    proxyReq.on('timeout', () => {
        console.warn("[RAW PROXY TIMEOUT]");
        proxyReq.destroy();
        if (!res.headersSent) {
            res.status(504).json({ error: "Proxy Timeout" });
        }
    });

    // Send body if write method
    if (isWrite && body) {
        proxyReq.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    proxyReq.end();
});

module.exports = app;
const serverless = require('serverless-http');
module.exports.handler = serverless(app);

if (require.main === module) {
    app.listen(process.env.PORT || 3000, () => console.log("System Running"));
}
