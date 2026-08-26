import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  Calendar,
  Award,
  Compass,
  RefreshCw,
  AlertCircle,
  Clock,
  History,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, ReflectionEntry, WeeklySynthesis } from '../types';
import { generateWeeklySynthesis } from '../lib/gemini-client';
import { saveWeeklySynthesisDoc, fetchUserSyntheses } from '../lib/firebase';
import { SentimentBadge } from './SentimentBadge';

interface WeeklySynthesisViewProps {
  user: UserProfile;
  reflections: ReflectionEntry[];
  onStartReflection: () => void;
}

export const WeeklySynthesisView: React.FC<WeeklySynthesisViewProps> = ({
  user,
  reflections,
  onStartReflection,
}) => {
  const [syntheses, setSyntheses] = useState<WeeklySynthesis[]>([]);
  const [currentSynthesis, setCurrentSynthesis] = useState<WeeklySynthesis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load existing syntheses on mount
  useEffect(() => {
    async function loadSyntheses() {
      if (!user?.uid) return;
      const history = await fetchUserSyntheses(user.uid);
      setSyntheses(history);
      if (history.length > 0) {
        setCurrentSynthesis(history[0]);
      }
    }
    loadSyntheses();
  }, [user]);

  const handleGenerateSynthesis = async () => {
    if (reflections.length === 0) {
      setErrorMsg('You need at least one reflection entry to generate a weekly synthesis.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);

      const generated = await generateWeeklySynthesis(
        reflections,
        user.displayName || 'friend'
      );

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

      const newSynthesis: WeeklySynthesis = {
        id: 'synth_' + Date.now(),
        userId: user.uid,
        weekStartDate: oneWeekAgo.toISOString(),
        weekEndDate: now.toISOString(),
        entryCount: reflections.length,
        overview: generated.overview,
        dominantEmotions: generated.dominantEmotions || [],
        breakthroughs: generated.breakthroughs || [],
        growthRecommendations: generated.growthRecommendations || [],
        sentimentAverage: generated.sentimentAverage ?? 0.4,
        createdAt: now.toISOString(),
      };

      await saveWeeklySynthesisDoc(user.uid, newSynthesis);
      setSyntheses((prev) => [newSynthesis, ...prev]);
      setCurrentSynthesis(newSynthesis);
    } catch (err: any) {
      console.error('Error creating synthesis:', err);
      setErrorMsg(err?.message || 'Failed to synthesize reflections. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Empathetic Aggregation & Milestones
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-50">
            Weekly Emotional & Growth Synthesis
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
            Gemini synthesizes all reflections from your past week, highlighting your overarching emotional trajectory, key breakthroughs, and actionable mindset anchors for the week ahead.
          </p>
        </div>

        <button
          id="generate-weekly-synthesis-btn"
          onClick={handleGenerateSynthesis}
          disabled={isGenerating || reflections.length === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 shadow-lg shadow-emerald-500/20 transition-all active:scale-98 disabled:opacity-40"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Synthesizing 7 Days...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Weekly Synthesis
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      {/* Main Content Area */}
      {currentSynthesis ? (
        <div className="space-y-6">
          {/* Historical Syntheses Selector */}
          {syntheses.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-stone-400 font-medium flex items-center gap-1 shrink-0">
                <History className="w-3.5 h-3.5" />
                Previous Weeks:
              </span>
              {syntheses.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSynthesis(s)}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    currentSynthesis.id === s.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                  }`}
                >
                  {new Date(s.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {idx === 0 ? ' (Latest)' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Overview Card */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur-md shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800/80 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {new Date(currentSynthesis.weekStartDate).toLocaleDateString()} –{' '}
                    {new Date(currentSynthesis.weekEndDate).toLocaleDateString()}
                  </span>
                  <span className="text-stone-600">•</span>
                  <span>{currentSynthesis.entryCount} Reflections Analyzed</span>
                </div>
                <h2 className="text-xl font-serif text-stone-100">
                  Emotional Trajectory & Insights
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">Valence Index:</span>
                <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-mono text-xs rounded-lg font-bold">
                  {currentSynthesis.sentimentAverage >= 0
                    ? `+${(currentSynthesis.sentimentAverage * 100).toFixed(0)}%`
                    : `${(currentSynthesis.sentimentAverage * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>

            {/* Synthesis Overview Paragraph */}
            <div className="prose prose-invert max-w-none text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
              {currentSynthesis.overview}
            </div>

            {/* Dominant Emotions Grid */}
            {currentSynthesis.dominantEmotions && currentSynthesis.dominantEmotions.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Dominant Emotional Themes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentSynthesis.dominantEmotions.map((emo, idx) => (
                    <SentimentBadge
                      key={idx}
                      emotion={typeof emo === 'string' ? emo : emo.emotion}
                      size="md"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2-Column: Key Breakthroughs & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Breakthroughs */}
            <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-2.5 text-amber-300">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">
                    Milestones & Key Breakthroughs
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Recognized cognitive reframes and moments of self-trust
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {currentSynthesis.breakthroughs.map((bt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800/80 rounded-2xl text-xs text-stone-200 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{bt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Growth Recommendations */}
            <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-2.5 text-emerald-300">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <Compass className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">
                    Intentions & Mindfulness Anchors
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Actionable micro-habits and reflection prompts for next week
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {currentSynthesis.growthRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 bg-stone-950/60 border border-stone-800/80 rounded-2xl text-xs text-stone-200 leading-relaxed"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-stone-200">
            No synthesis generated for this week yet
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            Click "Generate Weekly Synthesis" above to analyze your past 7 days of reflections,
            extract emotional trends, and receive supportive growth insights.
          </p>
          {reflections.length === 0 && (
            <button
              onClick={onStartReflection}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Write First Reflection
            </button>
          )}
        </div>
      )}
    </div>
  );
};
