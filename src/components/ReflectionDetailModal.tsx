import React, { useState } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  Tag,
  MessageSquare,
  Clock,
  Mic,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { ReflectionEntry } from '../types';
import { SentimentBadge } from './SentimentBadge';

interface ReflectionDetailModalProps {
  reflection: ReflectionEntry | null;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}

export const ReflectionDetailModal: React.FC<ReflectionDetailModalProps> = ({
  reflection,
  onClose,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!reflection) return null;

  const handleCopy = () => {
    const text = `Reflection: ${reflection.title}\nDate: ${new Date(reflection.createdAt).toLocaleString()}\nMood: ${reflection.primaryEmotion} (${reflection.sentimentScore})\nTakeaway: ${reflection.oneSentenceTakeaway}\n\nDialog:\n` +
      reflection.messages.map((m) => `${m.sender === 'user' ? 'Me' : 'Gemini'}: ${m.text}`).join('\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(reflection.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-stone-800 flex items-start justify-between gap-4 bg-stone-900/90">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SentimentBadge
                emotion={reflection.primaryEmotion}
                emoji={reflection.emotionEmoji}
                score={reflection.sentimentScore}
                size="md"
              />
              <span className="text-xs text-stone-400 font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(reflection.createdAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <h2 className="text-xl font-serif text-stone-100">{reflection.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
              title="Copy entry"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 bg-stone-800 hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 rounded-xl transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                title="Delete reflection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-800 text-stone-400 hover:text-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner inside Modal */}
        {showDeleteConfirm && (
          <div className="p-4 bg-rose-950/80 border-b border-rose-800 text-xs text-rose-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Are you sure you want to permanently delete this reflection?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Insight Highlight */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Core Takeaway & Anchor
            </span>
            <p className="text-sm text-stone-200 italic leading-relaxed">
              "{reflection.oneSentenceTakeaway}"
            </p>
          </div>

          {/* Tags */}
          {reflection.tags && reflection.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-stone-500" />
              {reflection.tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg text-xs bg-stone-800 text-stone-300 border border-stone-700 font-mono"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Transcript if present */}
          {reflection.audioTranscript && (
            <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 flex items-center gap-1">
                <Mic className="w-3 h-3 text-emerald-400" />
                Spoken Voice Transcript
              </span>
              <p className="text-xs text-stone-300 whitespace-pre-wrap">
                {reflection.audioTranscript}
              </p>
            </div>
          )}

          {/* Full Conversational Dialog */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Full Reflection Dialog ({reflection.messages?.length || 0} messages)
            </h3>

            <div className="space-y-3">
              {(reflection.messages || []).map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold ${
                        isUser
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isUser ? 'You' : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>

                    <div
                      className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-amber-500/10 text-stone-100 border border-amber-500/20'
                          : 'bg-stone-800/90 text-stone-200 border border-stone-700/60'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className="block text-right text-[10px] text-stone-500 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-xl transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
