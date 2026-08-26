import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ================= FIREBASE ADMIN INITIALIZATION =================
// Server-side Firebase Admin verification using project ID or ADC
if (getApps().length === 0) {
  try {
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      'gen-ai-cohort-3-defb5';

    initializeApp({
      projectId,
    });
  } catch (adminErr: any) {
    console.warn('Firebase Admin initialization notice:', adminErr?.message || adminErr);
  }
}

// ================= CORS CONFIGURATION =================
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://reflect-ai-xi-three.vercel.app',
];

const envFrontendOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envFrontendOrigins])
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, Cloud Run health probes)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Allow Vercel preview deployment origins if applicable
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked: Origin ${origin} not permitted by Access-Control-Allow-Origin policy.`)
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Explicit preflight handler
app.options('*', cors());

// ================= BODY PARSERS =================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================= AUTHENTICATION VERIFICATION MIDDLEWARE =================
export interface AuthenticatedRequest extends express.Request {
  user?: DecodedIdToken;
}

async function verifyAuthToken(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1].trim();
    if (idToken) {
      try {
        if (getApps().length > 0) {
          const auth = getAuth();
          const decodedToken = await auth.verifyIdToken(idToken);
          req.user = decodedToken;
        }
      } catch (err: any) {
        console.warn('Firebase token verification note:', err?.message || 'Invalid token');
        return res.status(401).json({
          error: 'Unauthorized: Invalid or expired authentication token.',
        });
      }
    }
  }
  next();
}

app.use('/api', verifyAuthToken);

// ================= GEMINI AI CLIENT & FALLBACK LADDER =================
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

interface FallbackOptions {
  contents: any;
  systemInstruction?: string;
  config?: any;
}

async function generateContentWithFallback(options: FallbackOptions): Promise<string> {
  const ai = getAIClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          ...options.config,
        },
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini SDK] Model '${model}' attempt failed:`, err?.message || err);
      continue;
    }
  }

  throw new Error(`All fallback models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// ================= API ENDPOINTS =================

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'reflect-ai-backend',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    firebaseAdminConfigured: getApps().length > 0,
  });
});

// Multi-turn Reflection Chat Endpoint
app.post('/api/chat/reflect', async (req: AuthenticatedRequest, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
      console.error('[/api/chat/reflect] GEMINI_API_KEY environment variable is not configured.');
      return res.status(503).json({
        error: 'Gemini service unavailable',
        details: 'GEMINI_API_KEY is not set in the server environment variables.',
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const promptStarter = typeof body.promptStarter === 'string' ? body.promptStarter : '';
    const userName = typeof body.userName === 'string' ? body.userName : (req.user?.name || req.user?.email?.split('@')[0] || 'the user');

    if (messages.length === 0 && !promptStarter) {
      return res.status(400).json({ error: 'Messages or prompt starter required.' });
    }

    const systemInstruction = `You are a deeply empathetic, mindful, and insightful AI Reflection & Journaling Partner speaking with ${userName}.
Your mission is to provide psychological safety, deep active listening, non-judgmental presence, and cognitive reframing.

Guidelines:
1. Validate emotions warmly and authentically without generic platitudes or toxic positivity.
2. Ask 1-2 poignant, open-ended questions that guide self-discovery, helping identify core emotional triggers, unhelpful cognitive distortions, or personal values.
3. Offer gentle reframing when appropriate: highlight resilience, silver linings, or alternative interpretations.
4. Keep answers concise, warm, structured, and easy to read (2-3 short paragraphs or bullet points where helpful).
5. Never diagnose clinical conditions; offer grounding mindfulness techniques and constructive self-reflection.`;

    const formattedContents = messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.text || '') }],
    }));

    if (formattedContents.length === 0 && promptStarter) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: `I want to reflect on: "${promptStarter}". Please help me start exploring this.` }],
      });
    }

    const aiResponseText = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    res.json({
      text: aiResponseText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[/api/chat/reflect] Error generating reflection:', error?.message || error);
    res.status(500).json({
      error: 'Failed to generate reflection response',
      details: process.env.NODE_ENV === 'production' ? 'AI service temporarily unavailable' : error?.message,
    });
  }
});

// Automated Sentiment & Metadata Analysis Endpoint
app.post('/api/analyze/sentiment', async (req: AuthenticatedRequest, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
      console.error('[/api/analyze/sentiment] GEMINI_API_KEY is not configured.');
      return res.status(503).json({
        error: 'Gemini service unavailable',
        details: 'GEMINI_API_KEY is not set in server environment variables.',
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const rawText = typeof body.rawText === 'string' ? body.rawText : '';

    const combinedJournal = rawText || messages
      .filter((m: any) => m.sender === 'user')
      .map((m: any) => m.text)
      .join('\n\n');

    if (!combinedJournal.trim()) {
      return res.status(400).json({ error: 'No reflection content to analyze.' });
    }

    const systemInstruction = `You are an expert emotional intelligence and sentiment analysis system for personal journals.
Analyze the provided journal entry and return ONLY a valid JSON object matching this exact schema:

{
  "title": "3 to 5 words capturing the core theme",
  "primaryEmotion": "One of: Grateful | Hopeful | Peaceful | Reflective | Joyful | Energized | Anxious | Overwhelmed | Frustrated | Melancholic | Curious | Neutral",
  "emotionEmoji": "Single representative emoji like 🌿, ✨, 🌊, 💡, 🌧️, ⚡, 🧘, 💫",
  "sentimentScore": 0.0, // Float between -1.0 (very negative) to +1.0 (very positive)
  "tags": ["2 to 4 thematic tags like Work, Relationships, Mindset, Health, Clarity, Self-Care"],
  "oneSentenceTakeaway": "A concise, powerful 1-sentence insight or anchor for the user."
}

Do not include any surrounding markdown fences like \`\`\`json. Return raw JSON only.`;

    const responseText = await generateContentWithFallback({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Analyze this reflection content:\n\n${combinedJournal}` }],
        },
      ],
      systemInstruction,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    let parsedResult;
    try {
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      parsedResult = {
        title: 'Daily Reflection',
        primaryEmotion: 'Reflective',
        emotionEmoji: '🌿',
        sentimentScore: 0.2,
        tags: ['Mindset', 'Reflection'],
        oneSentenceTakeaway: 'Taking time to pause and reflect brings clarity to everyday experiences.',
      };
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error('[/api/analyze/sentiment] Error analyzing sentiment:', error?.message || error);
    res.status(500).json({
      error: 'Failed to analyze reflection sentiment',
      details: process.env.NODE_ENV === 'production' ? 'Sentiment analysis service unavailable' : error?.message,
    });
  }
});

// Weekly Reflection Synthesis Endpoint
app.post('/api/synthesis/weekly', async (req: AuthenticatedRequest, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
      console.error('[/api/synthesis/weekly] GEMINI_API_KEY is not configured.');
      return res.status(503).json({
        error: 'Gemini service unavailable',
        details: 'GEMINI_API_KEY is not set in server environment variables.',
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const userName = typeof body.userName === 'string' ? body.userName : (req.user?.name || req.user?.email?.split('@')[0] || 'the user');

    if (entries.length === 0) {
      return res.status(400).json({ error: 'At least one reflection entry is required for weekly synthesis.' });
    }

    const summaries = entries.map((e: any, idx: number) => {
      const dateStr = e.createdAt ? new Date(e.createdAt).toLocaleDateString() : `Entry ${idx + 1}`;
      return `[${dateStr}] Title: ${e.title || 'Untitled'}\nEmotion: ${e.primaryEmotion || 'Reflective'} (${e.sentimentScore || 0})\nTakeaway: ${e.oneSentenceTakeaway || ''}\nTags: ${(e.tags || []).join(', ')}`;
    }).join('\n\n');

    const systemInstruction = `You are an empathetic personal growth mentor and psychological synthesizer for ${userName}.
Synthesize the user's past week of journal entries and emotional reflections into a supportive, empowering weekly growth review.
Return ONLY valid JSON matching this schema:

{
  "overview": "A warm, 2-3 paragraph synthesis describing their emotional trajectory, resilience, and overarching themes this week.",
  "dominantEmotions": [
    {"emotion": "Primary Emotion Name", "count": 1}
  ],
  "breakthroughs": [
    "Key realization or moment of clarity 1",
    "Key realization 2",
    "Key realization 3"
  ],
  "growthRecommendations": [
    "Specific, realistic mindfulness practice or mindset shift for the upcoming week 1",
    "Micro-habit or prompt 2",
    "Gentle boundary or self-compassion intention 3"
  ],
  "sentimentAverage": 0.35 // Float between -1.0 and 1.0
}

Return raw JSON only.`;

    const responseText = await generateContentWithFallback({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Here are the journal entries for the week:\n\n${summaries}` }],
        },
      ],
      systemInstruction,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    let parsedResult;
    try {
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      parsedResult = {
        overview: 'Over the past week, you showed mindful presence in honoring your thoughts and emotional signals.',
        dominantEmotions: [{ emotion: 'Reflective', count: entries.length }],
        breakthroughs: ['Consistently creating space for self-reflection.'],
        growthRecommendations: ['Continue dedicating 5 quiet minutes each evening to check in with yourself.'],
        sentimentAverage: 0.2,
      };
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error('[/api/synthesis/weekly] Error generating synthesis:', error?.message || error);
    res.status(500).json({
      error: 'Failed to generate weekly synthesis',
      details: process.env.NODE_ENV === 'production' ? 'Synthesis service unavailable' : error?.message,
    });
  }
});

// Voice Note Transcription & Prose Cleanup Endpoint
app.post('/api/transcribe', async (req: AuthenticatedRequest, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
      console.error('[/api/transcribe] GEMINI_API_KEY is not configured.');
      return res.status(503).json({
        error: 'Gemini service unavailable',
        details: 'GEMINI_API_KEY is not set in server environment variables.',
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawSpeech = typeof body.rawSpeech === 'string' ? body.rawSpeech : '';

    if (!rawSpeech.trim()) {
      return res.status(400).json({ error: 'No raw speech provided.' });
    }

    const systemInstruction = `You are a gentle voice-note cleanup assistant.
Transform the raw, unpunctuated voice transcription into clean, beautiful, authentic journal prose.
Preserve the user's authentic emotional voice, wording, and intent while adding proper punctuation, paragraphs, and removing speech disfluencies (like 'um', 'uh', 'like', stuttered repetitions).
Return only the cleaned reflection text.`;

    const cleanedText = await generateContentWithFallback({
      contents: [
        {
          role: 'user',
          parts: [{ text: rawSpeech }],
        },
      ],
      systemInstruction,
      config: {
        temperature: 0.2,
      },
    });

    res.json({
      cleanedText: cleanedText.trim(),
    });
  } catch (error: any) {
    console.error('[/api/transcribe] Error transcribing voice note:', error?.message || error);
    res.status(500).json({
      error: 'Failed to clean voice transcript',
      details: process.env.NODE_ENV === 'production' ? 'Transcription service unavailable' : error?.message,
    });
  }
});

// ================= VITE / STATIC MIDDLEWARE =================
// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err?.message || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'An internal server error occurred.',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err?.message,
  });
});

// ================= VITE / STATIC MIDDLEWARE & LOCAL START =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Reflect-AI Server running on http://0.0.0.0:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});



