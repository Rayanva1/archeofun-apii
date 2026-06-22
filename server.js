require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const axios     = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors());
app.use(express.json());

// ── Task 2: Rate limiting — 40 requests per 15 minutes per IP ────
const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a moment before asking again.' }
});

// ── Input validation middleware ────────────────────────────────────
function validateMessage(req, res, next) {
    const msg = req.body?.message;
    if (!msg || typeof msg !== 'string' || msg.trim().length === 0) {
        return res.status(400).json({ error: 'Missing or empty message.' });
    }
    if (msg.length > 500) {
        return res.status(400).json({ error: 'Message too long (max 500 characters).' });
    }
    next();
}

// ── Task 6: build language instruction for system prompt ──────────
function getLangInstruction(lang) {
    if (lang === 'fr') return 'Always reply in French (Français).';
    if (lang === 'ar') return 'Always reply in Arabic (العربية).';
    return 'Always reply in English.';
}

// ── Chat endpoint ─────────────────────────────────────────────────
app.post('/chat', chatLimiter, validateMessage, async (req, res) => {
    try {
        const userMessage = req.body.message.trim();
        const lang        = ['en', 'fr', 'ar'].includes(req.body.lang) ? req.body.lang : 'en';

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.1-8b-instant',
                max_tokens: 200,
                messages: [
                    {
                        role: 'system',
                        content: `You are ArcheoBot, a friendly archaeology AI assistant for ArcheoFun — an educational website for students aged 10–18.

Rules:
- Keep answers SHORT and clear (max 80 words, 2–4 sentences)
- ONLY answer archaeology-related topics (ancient civilizations, excavation, artifacts, famous sites, ancient history)
- Refuse unrelated questions politely with: "Great question! But I only know about archaeology 🏺 Ask me about ancient Egypt, the Romans, or Morocco's amazing sites!"
- Be educational, encouraging, and fun
- Use simple language suitable for students
- No giant paragraphs — short sentences or brief bullet points
- Start responses naturally — no "Certainly!" or "Of course!" openers
- ${getLangInstruction(lang)}`
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);

    } catch (err) {
        console.error('[ArcheoBot error]', err.response?.data || err.message);
        res.status(500).json({ error: 'AI request failed' });
    }
});

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ArcheoBot server running on port ${PORT}`));
