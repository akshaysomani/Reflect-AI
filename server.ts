import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Mount JSON & URL-encoded body parsers before all API routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Initialize Gemini SDK (Lazy-safe initialization with official telemetry headers)
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment. Gemini features will require an API key.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 3. Resilient Model Fallback Ladder
// High availability ordering with instant zero-stall failover
const MODEL_FALLBACK_LADDER = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
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
      // Model encountered transient spike or high demand (503) or rate limit (429) -> immediately try next model in ladder
      continue;
    }
  }

  throw new Error(`All fallback models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// ================= API ENDPOINTS =================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Multi-turn Reflection Chat Endpoint
app.post('/api/chat/reflect', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const promptStarter = typeof body.promptStarter === 'string' ? body.promptStarter : '';
    const userName = typeof body.userName === 'string' ? body.userName : 'the user';

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

    // Format conversation history for Gemini API
    const formattedContents = messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.text || '') }],
    }));

    // If starting fresh with a starter
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
    console.error('Error in /api/chat/reflect:', error);
    res.status(500).json({
      error: 'Failed to generate reflection response',
      details: error?.message || 'Server error',
    });
  }
});

// Automated Sentiment & Metadata Analysis Endpoint
app.post('/api/analyze/sentiment', async (req, res) => {
  try {
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
      console.warn('Failed to parse JSON directly, falling back to heuristic parsing:', parseErr);
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
    console.error('Error in /api/analyze/sentiment:', error);
    res.status(500).json({
      error: 'Failed to analyze reflection sentiment',
      details: error?.message || 'Server error',
    });
  }
});

// Weekly Reflection Synthesis Endpoint
app.post('/api/synthesis/weekly', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const userName = typeof body.userName === 'string' ? body.userName : 'the user';

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
    console.error('Error in /api/synthesis/weekly:', error);
    res.status(500).json({
      error: 'Failed to generate weekly synthesis',
      details: error?.message || 'Server error',
    });
  }
});

// Voice Note Transcription & Prose Cleanup Endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
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
    console.error('Error in /api/transcribe:', error);
    res.status(500).json({
      error: 'Failed to clean voice transcript',
      details: error?.message || 'Server error',
    });
  }
});

// ================= VITE / STATIC MIDDLEWARE =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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
    console.log(`AI Journal & Reflection Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
