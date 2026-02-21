const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ============================================
// SECURITY — Rate Limiting & Input Sanitization
// ============================================

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 30; // Slightly more relaxed for polling

setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap) {
        if (now - data.windowStart > RATE_LIMIT_WINDOW * 2) {
            rateLimitMap.delete(ip);
        }
    }
}, 120000);

app.use((req, res, next) => {
    if (req.path === '/api/supabase-proxy' || req.path === '/supabase-proxy') return next();
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const now = Date.now();
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return next();
    }
    const data = rateLimitMap.get(ip);
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
        data.count = 1;
        data.windowStart = now;
        return next();
    }
    data.count++;
    if (data.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: "Troppe richieste.", type: "rate_limit_error" });
    }
    next();
});

const { GoogleGenerativeAI: GoogleGenAI } = require("@google/generative-ai");

// ============================================
// GEMINI UTILS
// ============================================

async function callGeminiWithRetry(prompt, systemPrompt = null, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
            const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: systemPrompt });
            const result = await ai.generateContent(prompt);
            return (await result.response).text();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
}

// ============================================
// ENDPOINTS — Flashcards, Duel, Chat
// ============================================

app.post("/api/generate-flashcards", async (req, res) => {
    try {
        const { notes, subject, numberOfCards } = req.body;
        const prompt = `Analizza: "${notes.substring(0, 2500)}"\nMateria: ${subject || "Generale"}\nCrea ${numberOfCards} flashcard.\nRISPOSTA: Solo JSON array [{"front": "...", "back": "..."}]`;
        const text = await callGeminiWithRetry(prompt, null, 2);
        let cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
        res.json({ flashcards: jsonMatch ? JSON.parse(jsonMatch[0]) : [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/generate-duel-quiz", async (req, res) => {
    try {
        const { subject, context, difficulty = 'media' } = req.body;
        const prompt = context ? `Testo: "${context.substring(0, 15000)}"\nCrea quiz 10 domande JSON.` : `Soggetto: ${subject}\nCrea quiz 10 domande JSON.`;
        const text = await callGeminiWithRetry(prompt, "Sei un generatore di quiz scolastici.");
        let cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
        res.json({ quiz: jsonMatch ? JSON.parse(jsonMatch[0]) : [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/chat", async (req, res) => {
    try {
        const { message, history = [], context = "" } = req.body;
        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: `AI Tutor. ${context}` });
        const contents = [...history.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })), { role: 'user', parts: [{ text: message }] }];
        const result = await ai.generateContent({ contents });
        res.json({ reply: (await result.response).text(), success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// REINFORCED SUPABASE PROXY (Anti-520 Fix)
// ============================================

app.post("/api/supabase-proxy", async (req, res) => {
    const { path, method, headers: clientHeaders, body } = req.body || {};
    if (!path) return res.status(400).json({ error: "Missing path" });

    const supabaseUrl = 'https://rzdpntvojpibbndhsrlz.supabase.co';
    const targetUrl = `${supabaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M';

    // 1. Build minimal headers
    const userAuth = clientHeaders?.Authorization || clientHeaders?.authorization;
    const fetchHeaders = {
        'apikey': supabaseKey,
        'Authorization': userAuth || `Bearer ${supabaseKey}`,
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
        'Connection': 'close' // Avoid keep-alive issues causing 520s
    };

    // Only add JSON content-type for write methods if body exists
    const isWrite = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    if (isWrite && body) {
        fetchHeaders['Content-Type'] = 'application/json';
    }

    // Selective whitelist for other headers
    const whitelist = ['prefer', 'range', 'x-client-info', 'content-range'];
    if (clientHeaders) {
        Object.keys(clientHeaders).forEach(k => {
            const lowK = k.toLowerCase();
            if (whitelist.includes(lowK)) fetchHeaders[lowK] = clientHeaders[k];
        });
    }

    try {
        console.log(`[PROXY START] ${method || 'GET'} ${path}`);

        // Use timeout STRICTLY below Vercel's 10s limit
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8500);

        try {
            const fetchRes = await fetch(targetUrl, {
                method: method || 'GET',
                headers: fetchHeaders,
                body: isWrite && body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                signal: controller.signal,
                cache: 'no-store'
            });

            // Clean up headers coming back
            const resWhitelist = ['content-type', 'content-range', 'preference-applied', 'location', 'cache-control'];
            fetchRes.headers.forEach((v, k) => {
                if (resWhitelist.includes(k.toLowerCase())) res.setHeader(k, v);
            });

            res.setHeader('X-Proxy-Backend-Status', fetchRes.status);

            const arrayBuffer = await fetchRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            if (fetchRes.status >= 400) {
                console.error(`[PROXY BACKEND ERROR] ${fetchRes.status} for ${path}. Body size: ${buffer.length}`);
            }

            return res.status(fetchRes.status).send(buffer);
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        console.error("❌ Proxy Exception:", error.message, "Path:", path);
        const status = error.name === 'AbortError' ? 504 : 500;
        res.status(status).json({ error: "Proxy Error", message: error.message, path: path });
    }
});

// ============================================
// EXPORT & RUN
// ============================================

module.exports = app;
const serverless = require('serverless-http');
module.exports.handler = serverless(app);

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
