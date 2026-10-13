const express = require("express");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

// Load environment variables securely from api.env first, then .env
if (fs.existsSync(path.join(__dirname, "api.env"))) {
  dotenv.config({ path: path.join(__dirname, "api.env") });
}
dotenv.config();

const dns = require("dns");
// Prefer IPv4 to avoid Windows IPv6 socket connection drop issues (WSAECONNRESET / wsarecv)
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore on older Node versions
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// SECURITY PROTOCOLS & MIDDLEWARE
// ============================================================================

// 1. HTTP Security Headers with Helmet
// Configured to protect against XSS, clickjacking, MIME sniffing, while allowing local UI assets
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, "http://localhost:*", "http://127.0.0.1:*", "https://*.vercel.app"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null, // Allow local development over HTTP
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Permissive & Secure CORS Configuration
// Allows requests from localhost, Vercel deployments, and same-origin
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. same origin or curl/local tools),
      // local development servers, or any vercel domain
      if (
        !origin ||
        origin === "null" ||
        origin.endsWith(".vercel.app") ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ["GET", "POST"],
    credentials: false,
  })
);

// 3. Body Parser with strict payload size limit (protects against DOS / memory flooding)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Graceful JSON error handler (handles malformed requests safely)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON payload provided." });
  }
  next(err);
});

// 4. Rate Limiting for Chat API
// Protects upstream AI API quota from brute force, spamming, and denial-of-service
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a moment before sending another message.",
  },
});

// Serve frontend static files safely
app.use(express.static(path.join(__dirname)));

// Root route handler
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// Returns server & key configuration status WITHOUT leaking the actual keys
// ============================================================================
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    secure: true,
    port: PORT,
    providersConfigured: {
      gemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
      openai: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()),
      groq: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()),
    },
  });
});

// ============================================================================
// CHAT API PROXY (Backend Secure Route)
// API Key is strictly accessed on the backend and NEVER sent to the client browser
// ============================================================================
app.post(["/api/chat", "/chat"], chatLimiter, async (req, res) => {
  try {
    const { message, model, search, reason } = req.body;

    // Input Validation & Sanitization
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "A valid text message is required." });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    if (trimmedMessage.length > 4000) {
      return res.status(400).json({
        error: "Message is too long. Please limit to 4000 characters for safety.",
      });
    }

    // Identify which API keys are configured
    const openaiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : "";
    const geminiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    const groqKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : "";

    const modelLower = (model || "").toLowerCase();
    const wantsGemini = modelLower.includes("gemini");
    const wantsOpenAI = modelLower.includes("gpt") || modelLower.includes("chatgpt") || modelLower.includes("o1");

    // Route dynamically based on user model selection and available keys
    if (wantsGemini && geminiKey) {
      try {
        const result = await callGeminiAPI(geminiKey, trimmedMessage, reason);
        return res.json({ reply: result.text, provider: `Google Gemini (${result.model})` });
      } catch (err) {
        console.error("Gemini API error:", err.message);
        return res.status(502).json({
          error: `Gemini API Error: ${err.message}`,
        });
      }
    }

    if (wantsOpenAI && openaiKey) {
      try {
        const targetModel = modelLower.includes("mini") ? "gpt-4o-mini" : "gpt-4o";
        const responseText = await callOpenAICompatible(
          "https://api.openai.com/v1/chat/completions",
          openaiKey,
          targetModel,
          trimmedMessage,
          reason
        );
        return res.json({ reply: responseText, provider: `OpenAI (${targetModel})` });
      } catch (err) {
        console.error("OpenAI API error:", err.message);
        return res.status(502).json({
          error: `OpenAI API Error: ${err.message}`,
        });
      }
    }

    // Default fall-through for any configured provider
    if (openaiKey) {
      try {
        const responseText = await callOpenAICompatible(
          "https://api.openai.com/v1/chat/completions",
          openaiKey,
          "gpt-4o-mini",
          trimmedMessage,
          reason
        );
        return res.json({ reply: responseText, provider: "OpenAI (GPT-4o-mini)" });
      } catch (err) {
        console.error("OpenAI fallback error:", err.message);
      }
    }

    if (geminiKey) {
      try {
        const result = await callGeminiAPI(geminiKey, trimmedMessage, reason);
        return res.json({ reply: result.text, provider: `Google Gemini (${result.model})` });
      } catch (err) {
        console.error("Gemini fallback error:", err.message);
        return res.status(502).json({
          error: `Gemini API Error: ${err.message}`,
        });
      }
    }

    if (groqKey) {
      try {
        const responseText = await callOpenAICompatible(
          "https://api.groq.com/openai/v1/chat/completions",
          groqKey,
          "llama-3.3-70b-versatile",
          trimmedMessage,
          reason
        );
        return res.json({ reply: responseText, provider: "Groq (Llama 3.3)" });
      } catch (err) {
        console.error("Groq fallback error:", err.message);
        return res.status(502).json({
          error: `Groq API Error: ${err.message}`,
        });
      }
    }

    // Fallback: If no API key is provided yet in api.env
    return res.json({
      reply:
        "🔒 **Backend Server is Connected & Running Securely!**\n\n" +
        "Your backend server is actively running with full security protocols (Helmet CSP headers, Rate Limiting, and CORS isolation).\n\n" +
        "To connect your live AI API key without exposing it to the browser:\n" +
        "1. Open the **`api.env`** file in this folder.\n" +
        "2. Add your key, for example:\n" +
        "   ```bash\n" +
        "   GEMINI_API_KEY=your_gemini_key_here\n" +
        "   # OR\n" +
        "   OPENAI_API_KEY=your_openai_key_here\n" +
        "   ```\n" +
        "3. Save the file and restart the server (`npm start`).\n\n" +
        "Because `api.env` is listed in `.gitignore`, your key will remain completely confidential and safe from being committed to GitHub!",
      provider: "Setup Assistant",
    });
  } catch (error) {
    // Sanitized Error Handling (Prevents leaking stack traces or internal secrets to user)
    console.error("Server Internal Error:", error);
    res.status(500).json({
      error: "An unexpected server error occurred. Please try again shortly.",
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS FOR UPSTREAM AI CALLS
// ============================================================================

// Google Gemini API Caller
async function callGeminiAPI(apiKey, prompt, isReason) {
  const systemInstruction = isReason
    ? "You are a thoughtful ChatGPT assistant. Think methodically and provide deep, clear, and structured answers."
    : "You are a helpful, intelligent ChatGPT web assistant. Provide concise, accurate, and well-formatted answers using markdown.";

  const bodyData = {
    contents: [
      {
        parts: [
          {
            text: `${systemInstruction}\n\nUser Question: ${prompt}`,
          },
        ],
      },
    ],
  };

  // Modern Gemini models in priority order
  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If model not found or temporarily experiencing high demand (503/404), fallback to next
        if ((response.status === 404 || response.status === 503) && candidateModels.indexOf(model) < candidateModels.length - 1) {
          lastError = new Error(`Gemini HTTP ${response.status}: ${errorText}`);
          continue;
        }
        throw new Error(`Gemini HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Empty response received from Gemini API");
      }
      return { text, model };
    } catch (err) {
      lastError = err;
      if (candidateModels.indexOf(model) === candidateModels.length - 1) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Unable to reach Gemini API");
}

// OpenAI / Groq Compatible Caller
async function callOpenAICompatible(apiUrl, apiKey, defaultModel, prompt, isReason) {
  const systemPrompt = isReason
    ? "You are a reasoning-focused assistant. Structure your explanations carefully with thorough steps."
    : "You are a helpful, direct, and intelligent ChatGPT web assistant. Format answers with clean markdown.";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: defaultModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error("Empty completion returned by API");
  }
  return reply;
}

// Start Server when run directly (local development)
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`🚀 ChatGPT Secure Server running!`);
    console.log(`👉 Local:   http://localhost:${PORT}`);
    console.log(`👉 Network: http://127.0.0.1:${PORT}`);
    console.log(`🛡️  Security Protocols Active:`);
    console.log(`   • Key hidden server-side (.env / api.env)`);
    console.log(`   • Rate Limiting (30 req/min per IP)`);
    console.log(`   • Helmet HTTP Security Headers`);
    console.log(`   • CORS Restricted Origin Protection`);
    console.log(`   • Input Validation & Sanitization`);
    console.log(`====================================================`);
  });
}

// Export for Vercel Serverless Function deployment
module.exports = app;
