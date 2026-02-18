const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const { GoogleGenAI } = require("@google/genai");

// ============================================
// RATE LIMITING & RETRY
// ============================================

const RETRY_DELAY = 2000; // 2 secondi tra i retry
const MAX_RETRIES = 3;

async function callGeminiWithRetry(
    prompt,
    systemPrompt = null,
    maxRetries = MAX_RETRIES,
) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Tentativo ${attempt}/${maxRetries}...`);

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            const config = {
                model: "gemini-2.0-flash",
                contents: prompt,
            };

            if (systemPrompt) {
                config.systemInstruction = systemPrompt;
            }

            const response = await ai.models.generateContent(config);

            console.log("✅ Risposta ricevuta da Gemini");
            return response.text;
        } catch (error) {
            console.error(`❌ Tentativo ${attempt} fallito:`, error.message);

            // Se è un errore 429 (rate limit), aspetta prima di riprovare
            if (error.code === 429 || error.status === "RESOURCE_EXHAUSTED") {
                if (attempt < maxRetries) {
                    const waitTime = RETRY_DELAY * attempt; // Aumenta il tempo di attesa ad ogni tentativo
                    console.log(
                        `⏳ Rate limited. Aspettando ${waitTime}ms prima del prossimo tentativo...`,
                    );
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
        console.error("❌ Errore flashcards:", error.message);

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
// ENDPOINT CHATBOT
// ============================================
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history = [], context = "" } = req.body;

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

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            systemInstruction: systemPrompt,
            contents: [
                ...conversationHistory,
                {
                    role: "user",
                    parts: [{ text: String(message).substring(0, 800) }],
                },
            ],
        });

        const reply = response.text || "Nessuna risposta generata";

        res.json({
            reply: reply.substring(0, 5000),
            success: true,
        });
    } catch (error) {
        console.error("❌ Errore Chat:", error.message);

        if (error.code === 429 || error.status === "RESOURCE_EXHAUSTED") {
            return res.status(503).json({
                error: "Troppe richieste a Gemini. Riprova tra 30 secondi.",
                type: "rate_limit_error",
                retryAfter: 30,
            });
        }

        res.status(500).json({
            error: error.message,
            type: "chat_error",
        });
    }
});

// Export for Vercel
module.exports = app;

// Start server if running locally
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
