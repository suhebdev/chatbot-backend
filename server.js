/**
 * server.js
 * Chatbot backend for Suheb Khan's portfolio.
 * Receives { message, history } from the frontend,
 * calls OpenRouter AI API, returns { reply }.
 *
 * Host this on Render as a Node.js Web Service.
 */

const express  = require('express');
const cors     = require('cors');
const axios    = require('axios');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ────────────────────────────────────────────────────────────────────
// Allows your portfolio frontend to call this backend.
// Add your actual portfolio URL below.
app.use(cors({
    origin: [
        'https://suhebdev.rf.gd',        // your portfolio website
        'http://localhost',               // local testing
        'http://127.0.0.1',              // local testing
        'http://localhost:5500',          // VS Code Live Server
        'http://127.0.0.1:5500'          // VS Code Live Server
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a helpful AI assistant on Suheb Khan's personal portfolio website. Your sole purpose is to answer questions about Suheb Khan, his skills, services, projects, pricing, and contact information. You must not answer anything outside this scope.

ABOUT SUHEB KHAN:
- Full Name: Suheb Khan
- Role: Full Stack Developer
- Experience: 3+ years (started in 2020)
- Location: Maharashtra, India
- Email: suhebdev201@email.com
- Phone: +91 85307 95711

SKILLS:
JavaScript (ES6+), TypeScript, React, Vue.js, Node.js, HTML, CSS, Tailwind CSS, Python, PHP, MySQL, Docker, Git, AWS, Figma

SERVICES & PRICING:
- Frontend Development: Starting at $29
- UI/UX Design: Starting at $19
- Website Optimization: Starting at $9
- Maintenance & Support: $19/month
- API Integration: Starting at $199
- Mobile-First Development: Starting at $299

PROJECTS:
- Neon Ecommerce — React, Tailwind CSS, Supabase, Recharts
- AI Chat Interface — Next.js, OpenAI API, Framer Motion, TypeScript
- Task Orchestrator — Vue.js, Firebase, Node.js, Socket.io
- Eco-Track Analytics — D3.js, PostgreSQL, Python, React
- Cloud Sync Pro — AWS, Terraform, Go, Next.js
- Neural Studio — TensorFlow.js, WebGL, React, Three.js

SOCIAL & LINKS:
- GitHub: https://github.com/suhebdev
- LinkedIn: https://www.linkedin.com/in/suhebkhan201
- Instagram: https://www.instagram.com/suheb.codes/
- Facebook: https://www.facebook.com/suheb.codes/
- Twitter: https://www.twitter.com/in/suhebkhan201

RESPONSE RULES — follow every rule strictly:
1. ONLY answer questions about Suheb Khan, his services, skills, projects, pricing, or general web development questions relevant to his work.
2. If a question is completely outside this scope, reply EXACTLY with: "Suheb Khan does not provide this service. You can ask questions related to these services."
3. Never fabricate information. If you are unsure, say so and offer to help with something related.
4. Keep answers concise, friendly, and professional.
5. Use Markdown formatting: bold for emphasis, bullet lists for multiple items, clickable links in [label](url) format.
6. Never break character. You are this website's assistant — nothing else.`;

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
// Render pings this to check if server is alive.
// Also helps wake the server from cold start.
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Chatbot backend is running.' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ─── CHAT ENDPOINT ────────────────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
    const { message, history } = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ error: 'Message is required.' });
    }

    // Build messages array for OpenRouter
    // System prompt goes first, then conversation history, then new user message
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(Array.isArray(history) ? history : []),
        { role: 'user', content: message.trim() }
    ];

    try {
        const openRouterResponse = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'mistralai/mistral-7b-instruct',   // free model on OpenRouter
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://suhebdev.rf.gd',   // your portfolio URL
                    'X-Title': 'Suheb Khan Portfolio Chatbot'
                },
                timeout: 30000  // 30 second timeout for OpenRouter
            }
        );

        // Extract the reply text from OpenRouter response
        const reply = openRouterResponse.data?.choices?.[0]?.message?.content;

        if (!reply) {
            console.error('Empty reply from OpenRouter:', openRouterResponse.data);
            return res.status(500).json({ error: 'AI returned an empty response.' });
        }

        return res.json({ reply: reply.trim() });

    } catch (err) {
        // OpenRouter API errors
        if (err.response) {
            const status = err.response.status;
            const errData = err.response.data;

            console.error(`OpenRouter error ${status}:`, errData);

            if (status === 401) {
                return res.status(401).json({ error: 'Invalid API key. Please check your OpenRouter API key in Render environment variables.' });
            }
            if (status === 429) {
                return res.status(429).json({ error: 'Rate limit reached. Please wait a moment.' });
            }
            if (status === 402) {
                return res.status(402).json({ error: 'OpenRouter credits exhausted. Please top up.' });
            }

            return res.status(status).json({ error: errData?.error?.message || 'OpenRouter API error.' });
        }

        // Network / timeout errors
        console.error('Network error calling OpenRouter:', err.message);
        return res.status(500).json({ error: 'Failed to reach AI service. Please try again.' });
    }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Chatbot backend running on port ${PORT}`);
});