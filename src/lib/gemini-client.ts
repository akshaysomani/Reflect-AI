import { ChatMessage, SentimentAnalysis, WeeklySynthesis, ReflectionEntry } from '../types';

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

  const res = await fetch('/api/chat/reflect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${res.status}`);
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

  const res = await fetch('/api/analyze/sentiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Sentiment analysis failed: ${res.status}`);
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

  const res = await fetch('/api/synthesis/weekly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Weekly synthesis generation failed: ${res.status}`);
  }

  return await res.json();
}

export async function cleanVoiceTranscript(rawSpeech: string): Promise<string> {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawSpeech }),
  });

  if (!res.ok) {
    return rawSpeech;
  }

  const data = await res.json();
  return data.cleanedText || rawSpeech;
}
