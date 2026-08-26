import React from 'react';
import {
  Sparkles,
  BookOpen,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  Plus,
} from 'lucide-react';
import { UserProfile, ReflectionEntry, ReflectionPromptTemplate } from '../types';
import { SentimentBadge } from './SentimentBadge';
import { REFLECTION_TEMPLATES } from '../data/templates';

interface DashboardViewProps {
  user: UserProfile;
  reflections: ReflectionEntry[];
  onStartReflection: (template?: ReflectionPromptTemplate) => void;
  onOpenReflectionDetail: (reflection: ReflectionEntry) => void;
  onOpenSynthesis: () => void;
  onViewAllHistory: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  reflections,
  onStartReflection,
  onOpenReflectionDetail,
  onOpenSynthesis,
  onViewAllHistory,
}) => {
  // Compute analytics
  const totalEntries = reflections.length;

  // Calculate sentiment average
  const avgSentiment =
    totalEntries > 0
      ? reflections.reduce((acc, curr) => acc + (curr.sentimentScore || 0), 0) / totalEntries
      : 0;

  // Calculate emotion frequencies
  const emotionCounts: Record<string, number> = {};
  reflections.forEach((r) => {
    emotionCounts[r.primaryEmotion] = (emotionCounts[r.primaryEmotion] || 0) + 1;
  });

  const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
  const topEmotion = sortedEmotions[0]?.[0] || 'Peaceful';

  // Recent 3 entries
  const recentEntries = reflections.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Private & Isolated Cloud Space
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-stone-50 tracking-tight">
              Welcome back,{' '}
              <span className="text-amber-300">
                {user.displayName?.split(' ')[0] || 'Friend'}
              </span>
            </h1>
            <p className="text-sm text-stone-300 font-light leading-relaxed">
              How are you feeling today? Take a moment to breathe, speak your mind, or reflect
              with your Gemini journaling partner.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="dashboard-start-reflection-btn"
              onClick={() => onStartReflection()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-lg shadow-amber-500/20 transition-all active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              Start New Reflection
            </button>

            {totalEntries >= 2 && (
              <button
                id="dashboard-weekly-synthesis-btn"
                onClick={onOpenSynthesis}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/30 shadow-md transition-all active:scale-98"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Weekly Synthesis
              </button>
            )}
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Reflections Logged</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-stone-100">{totalEntries}</p>
          <p className="text-[11px] text-stone-500">Stored in Cloud Firestore</p>
        </div>

        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Dominant Mood State</span>
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="pt-0.5">
            <SentimentBadge emotion={topEmotion} size="md" />
          </div>
          <p className="text-[11px] text-stone-500">Based on recent journal entries</p>
        </div>

        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Emotional Valence Index</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-stone-100">
            {avgSentiment >= 0 ? `+${(avgSentiment * 100).toFixed(0)}%` : `${(avgSentiment * 100).toFixed(0)}%`}
          </p>
          <p className="text-[11px] text-stone-500">
            {avgSentiment >= 0.2 ? 'Constructive & Uplifting' : 'Processing & Grounding'}
          </p>
        </div>
      </div>

      {/* Quick Prompt Starters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Mindful Prompt Starters
          </h2>
          <span className="text-xs text-stone-400">Pick an intention to begin</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REFLECTION_TEMPLATES.slice(0, 3).map((template) => (
            <div
              key={template.id}
              onClick={() => onStartReflection(template)}
              className="group cursor-pointer bg-stone-900/60 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/40 rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/90 font-mono">
                  {template.category}
                </span>
                <h3 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors">
                  {template.title}
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
                  {template.description}
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>Start Reflection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reflections List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Recent Reflections
          </h2>
          {totalEntries > 3 && (
            <button
              onClick={onViewAllHistory}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              View All ({totalEntries})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentEntries.length === 0 ? (
          <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-2xl p-8 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-stone-600 mx-auto" />
            <h3 className="text-sm font-medium text-stone-300">No reflections logged yet</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Start your first session to unlock personalized mood tracking and weekly syntheses.
            </p>
            <button
              onClick={() => onStartReflection()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-stone-950 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Entry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onOpenReflectionDetail(entry)}
                className="group cursor-pointer bg-stone-900/60 hover:bg-stone-800/80 border border-stone-800 hover:border-stone-700 rounded-2xl p-5 transition-all shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <SentimentBadge
                      emotion={entry.primaryEmotion}
                      emoji={entry.emotionEmoji}
                      score={entry.sentimentScore}
                      size="sm"
                    />
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                    {entry.title}
                  </h3>

                  <p className="text-xs text-stone-400 italic bg-stone-950/40 p-2.5 rounded-xl border border-stone-800/50 line-clamp-2">
                    "{entry.oneSentenceTakeaway || 'Reflecting on personal growth.'}"
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-800/60">
                  {(entry.tags || []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 text-stone-400 font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
