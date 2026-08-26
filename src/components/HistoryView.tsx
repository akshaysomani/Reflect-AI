import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Share2,
  Copy,
  Check,
  Calendar,
  Clock,
  MessageSquare,
  Sparkles,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import { ReflectionEntry } from '../types';
import { SentimentBadge } from './SentimentBadge';

interface HistoryViewProps {
  reflections: ReflectionEntry[];
  onDeleteReflection: (id: string) => Promise<void>;
  onSelectReflection: (entry: ReflectionEntry) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  reflections,
  onDeleteReflection,
  onSelectReflection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'sentiment'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletePendingEntry, setDeletePendingEntry] = useState<ReflectionEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract all unique emotions and tags
  const allEmotions = useMemo(() => {
    const set = new Set<string>();
    reflections.forEach((r) => {
      if (r.primaryEmotion) set.add(r.primaryEmotion);
    });
    return Array.from(set);
  }, [reflections]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    reflections.forEach((r) => {
      (r.tags || []).forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [reflections]);

  // Filtered & sorted list
  const filteredReflections = useMemo(() => {
    return reflections
      .filter((r) => {
        const matchesEmotion =
          selectedEmotion === 'all' || r.primaryEmotion.toLowerCase() === selectedEmotion.toLowerCase();
        const matchesTag =
          selectedTag === 'all' || (r.tags && r.tags.includes(selectedTag));

        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          r.title.toLowerCase().includes(searchLower) ||
          r.oneSentenceTakeaway.toLowerCase().includes(searchLower) ||
          (r.tags && r.tags.some((t) => t.toLowerCase().includes(searchLower))) ||
          (r.messages &&
            r.messages.some((m) => m.text.toLowerCase().includes(searchLower)));

        return matchesEmotion && matchesTag && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortOrder === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortOrder === 'sentiment') {
          return (b.sentimentScore || 0) - (a.sentimentScore || 0);
        }
        return 0;
      });
  }, [reflections, searchTerm, selectedEmotion, selectedTag, sortOrder]);

  const handleCopyText = (e: React.MouseEvent, entry: ReflectionEntry) => {
    e.stopPropagation();
    const content = `Title: ${entry.title}\nEmotion: ${entry.primaryEmotion} (${entry.sentimentScore})\nTakeaway: ${entry.oneSentenceTakeaway}\nDate: ${new Date(entry.createdAt).toLocaleString()}\n\nMessages:\n` +
      entry.messages.map((m) => `${m.sender === 'user' ? 'Me' : 'Gemini'}: ${m.text}`).join('\n\n');

    navigator.clipboard.writeText(content);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePromptDelete = (e: React.MouseEvent, entry: ReflectionEntry) => {
    e.stopPropagation();
    setDeletePendingEntry(entry);
  };

  const handleConfirmDelete = async () => {
    if (!deletePendingEntry) return;
    try {
      setIsDeleting(true);
      await onDeleteReflection(deletePendingEntry.id);
      setDeletePendingEntry(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-stone-100 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            Reflection Journal History
          </h1>
          <p className="text-xs text-stone-400">
            Browse, search, and review your past conversations and emotional breakthroughs.
          </p>
        </div>
        <div className="text-xs text-stone-400 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-xl font-mono">
          Total Entries: <span className="text-amber-400 font-bold">{reflections.length}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="history-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by keywords, insights, topics, or messages..."
              className="w-full bg-stone-950/80 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 flex items-center gap-1 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              id="history-sort-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="sentiment">Highest Sentiment</option>
            </select>
          </div>
        </div>

        {/* Emotion Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-500 text-[11px] font-medium uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Mood:
          </span>
          <button
            onClick={() => setSelectedEmotion('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedEmotion === 'all'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            All Moods
          </button>
          {allEmotions.map((emo) => (
            <button
              key={emo}
              onClick={() => setSelectedEmotion(emo)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedEmotion.toLowerCase() === emo.toLowerCase()
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {emo}
            </button>
          ))}
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1 border-t border-stone-800/60">
            <span className="text-stone-500 text-[11px] uppercase tracking-wider shrink-0 mr-1">
              Tag:
            </span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] ${
                selectedTag === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              #All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`px-2 py-0.5 rounded-md text-[11px] ${
                  selectedTag === t
                    ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Results */}
      {filteredReflections.length === 0 ? (
        <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-3xl p-12 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-stone-600 mx-auto" />
          <h3 className="text-sm font-medium text-stone-300">No reflections found</h3>
          <p className="text-xs text-stone-500">
            Try adjusting your search criteria or filter tags.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReflections.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectReflection(entry)}
              className="group cursor-pointer bg-stone-900/70 hover:bg-stone-800/90 border border-stone-800 hover:border-amber-500/30 rounded-2xl p-5 transition-all shadow-md space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <SentimentBadge
                    emotion={entry.primaryEmotion}
                    emoji={entry.emotionEmoji}
                    score={entry.sentimentScore}
                    size="sm"
                  />
                  <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                    <Calendar className="w-3 h-3 text-stone-500" />
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors">
                  {entry.title}
                </h3>

                <p className="text-xs text-stone-300 italic bg-stone-950/60 p-3 rounded-xl border border-stone-800/60 line-clamp-3">
                  "{entry.oneSentenceTakeaway}"
                </p>

                <div className="flex items-center gap-2 text-[11px] text-stone-500">
                  <MessageSquare className="w-3 h-3" />
                  <span>{entry.messages?.length || 0} conversation turns</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {(entry.tags || []).slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 text-stone-400 font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                  {(entry.tags || []).length > 2 && (
                    <span className="text-[10px] text-stone-500">
                      +{(entry.tags || []).length - 2}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleCopyText(e, entry)}
                    title="Copy reflection summary"
                    className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => handlePromptDelete(e, entry)}
                    title="Delete reflection"
                    id={`delete-btn-${entry.id}`}
                    className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletePendingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-100">Delete Reflection?</h3>
                <p className="text-xs text-stone-400">This action will remove this journal entry.</p>
              </div>
            </div>

            <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800/80 space-y-1">
              <p className="text-xs font-medium text-stone-200">{deletePendingEntry.title}</p>
              <p className="text-[11px] text-stone-400 italic line-clamp-2">"{deletePendingEntry.oneSentenceTakeaway}"</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletePendingEntry(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-entry-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-lg shadow-rose-900/30 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
