import { ChatMessage, SentimentAnalysis, WeeklySynthesis, ReflectionEntry } from '../types';
import { getCurrentUserToken } from './firebase';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }
  // Local development with separate dev server
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  // In production, empty string uses the same origin (Vercel Serverless /api)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await getCurrentUserToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkBackendHealth(): Promise<{
  status: string;
  service?: string;
  environment?: string;
  geminiConfigured?: boolean;
  firebaseAdminConfigured?: boolean;
}> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
  }
  return await res.json();
}

export async function askReflectionPartner(
  messages: ChatMessage[],
  userName: string = 'Friend',
  promptStarter?: string
): Promise<string> {
  const payload = {
    messages: messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    })),
    userName,
    promptStarter,
  };

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/chat/reflect`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Server responded with status ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}

export async function analyzeJournalSentiment(
  messages: ChatMessage[],
  rawText?: string
): Promise<SentimentAnalysis> {
  const payload = {
    messages: messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    })),
    rawText,
  };

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/analyze/sentiment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Sentiment analysis failed: ${res.status}`);
  }

  return await res.json();
}

export async function generateWeeklySynthesis(
  entries: ReflectionEntry[],
  userName: string = 'Friend'
): Promise<Omit<WeeklySynthesis, 'id' | 'userId' | 'weekStartDate' | 'weekEndDate' | 'entryCount' | 'createdAt'>> {
  const payload = {
    entries,
    userName,
  };

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/synthesis/weekly`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Weekly synthesis generation failed: ${res.status}`);
  }

  return await res.json();
}

export async function cleanVoiceTranscript(rawSpeech: string): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rawSpeech }),
  });

  if (!res.ok) {
    return rawSpeech;
  }

  const data = await res.json();
  return data.cleanedText || rawSpeech;
}



