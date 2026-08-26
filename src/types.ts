/**
 * Shared TypeScript definitions for AI Journal & Reflection App
 */

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isVoiceInput?: boolean;
}

export type PrimaryEmotion =
  | 'Grateful'
  | 'Hopeful'
  | 'Peaceful'
  | 'Reflective'
  | 'Joyful'
  | 'Energized'
  | 'Anxious'
  | 'Overwhelmed'
  | 'Frustrated'
  | 'Melancholic'
  | 'Curious'
  | 'Neutral';

export interface SentimentAnalysis {
  title: string;
  primaryEmotion: PrimaryEmotion;
  emotionEmoji: string;
  sentimentScore: number; // -1.0 to +1.0
  tags: string[];
  oneSentenceTakeaway: string;
}

export interface ReflectionEntry {
  id: string;
  userId: string;
  title: string;
  primaryEmotion: PrimaryEmotion;
  emotionEmoji: string;
  sentimentScore: number;
  tags: string[];
  oneSentenceTakeaway: string;
  messages: ChatMessage[];
  audioTranscript?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySynthesis {
  id: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  entryCount: number;
  overview: string;
  dominantEmotions: { emotion: string; count: number }[];
  breakthroughs: string[];
  growthRecommendations: string[];
  sentimentAverage: number;
  createdAt: string;
}

export interface ReflectionPromptTemplate {
  id: string;
  category: 'Daily Reflection' | 'Cognitive Reframe' | 'Gratitude & Calm' | 'Deep Processing' | 'Goal Alignment';
  title: string;
  initialPrompt: string;
  description: string;
  iconName: string;
}
