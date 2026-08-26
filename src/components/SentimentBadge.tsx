import React from 'react';
import { PrimaryEmotion } from '../types';

interface SentimentBadgeProps {
  emotion: PrimaryEmotion | string;
  emoji?: string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

const EMOTION_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  Grateful: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Hopeful: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Peaceful: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  Reflective: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Joyful: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Energized: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Anxious: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  Overwhelmed: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Frustrated: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  Melancholic: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  Curious: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Neutral: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
};

const EMOTION_DEFAULT_EMOJIS: Record<string, string> = {
  Grateful: '🌿',
  Hopeful: '✨',
  Peaceful: '🌊',
  Reflective: '💡',
  Joyful: '☀️',
  Energized: '⚡',
  Anxious: '🌪️',
  Overwhelmed: '🌧️',
  Frustrated: '🔥',
  Melancholic: '🍂',
  Curious: '🧭',
  Neutral: '⚖️',
};

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({
  emotion,
  emoji,
  score,
  size = 'md',
}) => {
  const styles = EMOTION_COLOR_MAP[emotion] || EMOTION_COLOR_MAP.Neutral;
  const displayEmoji = emoji || EMOTION_DEFAULT_EMOJIS[emotion] || '💭';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-medium px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <span
      id={`sentiment-badge-${emotion.toLowerCase()}`}
      className={`inline-flex items-center rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} transition-all duration-150 shadow-xs`}
    >
      <span className="shrink-0">{displayEmoji}</span>
      <span className="whitespace-nowrap">{emotion}</span>
      {score !== undefined && (
        <span
          className={`text-[10px] px-1 rounded font-mono ${
            score >= 0 ? 'text-emerald-700 bg-emerald-100/60' : 'text-rose-700 bg-rose-100/60'
          }`}
          title={`Sentiment Score: ${score.toFixed(2)}`}
        >
          {score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)}
        </span>
      )}
    </span>
  );
};
