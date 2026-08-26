import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Tag,
  ArrowLeft,
  Wand2,
  RefreshCw,
  Clock,
  BookOpen,
} from 'lucide-react';
import {
  UserProfile,
  ChatMessage,
  SentimentAnalysis,
  ReflectionEntry,
  ReflectionPromptTemplate,
} from '../types';
import {
  askReflectionPartner,
  analyzeJournalSentiment,
  cleanVoiceTranscript,
} from '../lib/gemini-client';
import { saveReflectionDoc } from '../lib/firebase';
import { VoiceRecorderService } from '../lib/speech';
import { SentimentBadge } from './SentimentBadge';
import { REFLECTION_TEMPLATES } from '../data/templates';

interface ReflectionRoomProps {
  user: UserProfile;
  initialTemplate?: ReflectionPromptTemplate | null;
  onSaved: (reflection: ReflectionEntry) => void;
  onCancel: () => void;
}

export const ReflectionRoom: React.FC<ReflectionRoomProps> = ({
  user,
  initialTemplate,
  onSaved,
  onCancel,
}) => {
  // Conversational state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isCleaningVoice, setIsCleaningVoice] = useState(false);
  const voiceServiceRef = useRef<VoiceRecorderService | null>(null);

  // Sentiment Analysis & Completion State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SentimentAnalysis | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Editable fields in analysis review
  const [customTitle, setCustomTitle] = useState('');
  const [customTakeaway, setCustomTakeaway] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with initialTemplate or welcoming prompt
  useEffect(() => {
    if (initialTemplate) {
      const initUserMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        sender: 'user',
        text: initialTemplate.initialPrompt,
        timestamp: new Date().toISOString(),
      };
      setMessages([initUserMsg]);
      triggerAIResponse([initUserMsg]);
    } else {
      // Welcome invitation
      const welcomeAiMsg: ChatMessage = {
        id: 'msg_welcome_' + Date.now(),
        sender: 'assistant',
        text: `Hello ${user.displayName || 'friend'}. I'm here as your mindful reflection companion. What is sitting with you today, or what thoughts would you like to explore together?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeAiMsg]);
    }
  }, [initialTemplate]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Setup Web Speech Recognition
  useEffect(() => {
    const service = new VoiceRecorderService();
    voiceServiceRef.current = service;

    service.setCallbacks(
      (text, isFinal) => {
        setVoiceTranscript(text);
        if (isFinal) {
          setInputText((prev) => (prev ? prev + ' ' + text : text));
        }
      },
      (listening) => {
        setIsRecording(listening);
      }
    );

    return () => {
      service.stop();
    };
  }, []);

  const toggleRecording = () => {
    if (!voiceServiceRef.current?.isSupported) {
      setErrorMsg('Speech recognition is not supported in this browser. Please type your thoughts.');
      return;
    }

    if (isRecording) {
      voiceServiceRef.current.stop();
      setIsRecording(false);
    } else {
      setErrorMsg(null);
      setVoiceTranscript('');
      voiceServiceRef.current.start();
      setIsRecording(true);
    }
  };

  const handlePolishVoiceWithAI = async () => {
    if (!inputText.trim()) return;
    try {
      setIsCleaningVoice(true);
      const polished = await cleanVoiceTranscript(inputText);
      setInputText(polished);
    } catch (e: any) {
      console.warn('Voice polish note:', e);
    } finally {
      setIsCleaningVoice(false);
    }
  };

  const triggerAIResponse = async (history: ChatMessage[]) => {
    try {
      setIsThinking(true);
      setErrorMsg(null);
      const responseText = await askReflectionPartner(
        history,
        user.displayName || 'friend',
        initialTemplate?.initialPrompt
      );

      const aiMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      setErrorMsg(
        err?.message || 'Unable to connect to Gemini reflection service. Please verify server connection.'
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isThinking) return;

    if (isRecording) {
      voiceServiceRef.current?.stop();
      setIsRecording(false);
    }

    const userMsg: ChatMessage = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText('');
    setVoiceTranscript('');

    await triggerAIResponse(updated);
  };

  const handleSelectStarter = (template: ReflectionPromptTemplate) => {
    const userMsg: ChatMessage = {
      id: 'msg_starter_' + Date.now(),
      sender: 'user',
      text: template.initialPrompt,
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    triggerAIResponse(updated);
  };

  // Step 2: Finish & Generate Automated Sentiment Analysis
  const handleFinishAndAnalyze = async () => {
    if (messages.length === 0) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);

      const analysis = await analyzeJournalSentiment(messages);
      setAnalysisResult(analysis);
      setCustomTitle(analysis.title);
      setCustomTakeaway(analysis.oneSentenceTakeaway);
      setCustomTags(analysis.tags || []);
    } catch (err: any) {
      console.error('Sentiment analysis failed:', err);
      // Fallback analysis to ensure zero interruption
      const fallback: SentimentAnalysis = {
        title: 'Daily Reflection Session',
        primaryEmotion: 'Reflective',
        emotionEmoji: '🌿',
        sentimentScore: 0.3,
        tags: ['Mindset', 'Growth', 'Clarity'],
        oneSentenceTakeaway: 'Giving words to internal experiences provides clarity and steady direction.',
      };
      setAnalysisResult(fallback);
      setCustomTitle(fallback.title);
      setCustomTakeaway(fallback.oneSentenceTakeaway);
      setCustomTags(fallback.tags);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 3: Save to Firestore
  const handleSaveReflection = async () => {
    if (!analysisResult) return;

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const reflectionDoc: ReflectionEntry = {
        id: 'ref_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId: user.uid,
        title: customTitle.trim() || analysisResult.title,
        primaryEmotion: analysisResult.primaryEmotion,
        emotionEmoji: analysisResult.emotionEmoji,
        sentimentScore: analysisResult.sentimentScore,
        tags: customTags.length > 0 ? customTags : analysisResult.tags,
        oneSentenceTakeaway: customTakeaway.trim() || analysisResult.oneSentenceTakeaway,
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveReflectionDoc(user.uid, reflectionDoc);
      setIsCompleted(true);
      onSaved(reflectionDoc);
    } catch (err: any) {
      console.error('Failed saving reflection:', err);
      setErrorMsg('Failed to persist reflection. Please try saving again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    const t = newTagInput.trim();
    if (t && !customTags.includes(t)) {
      setCustomTags([...customTags, t]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between bg-stone-900/80 border border-stone-800 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            id="back-to-dashboard-btn"
            onClick={onCancel}
            className="p-2 hover:bg-stone-800 text-stone-400 hover:text-stone-200 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-amber-400" />
              Mindful Reflection Studio
            </h2>
            <p className="text-xs text-stone-400">
              Multi-turn dialog with empathetic AI reflection partner
            </p>
          </div>
        </div>

        {/* Action Button: Analyze & Save */}
        {messages.filter((m) => m.sender === 'user').length > 0 && !analysisResult && (
          <button
            id="finish-and-analyze-session-btn"
            onClick={handleFinishAndAnalyze}
            disabled={isAnalyzing || isThinking}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-semibold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing Sentiment...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Finish & Extract Insights
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-950/40 border border-rose-800/80 text-rose-300 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <p className="flex-1">{errorMsg}</p>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-semibold underline hover:text-rose-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Interactive Chat Area */}
      <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 sm:p-6 min-h-[420px] max-h-[580px] overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-semibold ${
                  isUser
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isUser ? 'You' : <Sparkles className="w-4 h-4 text-emerald-400" />}
              </div>

              <div
                className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-amber-500/10 text-stone-100 border border-amber-500/20 rounded-tr-xs'
                    : 'bg-stone-800/80 text-stone-200 border border-stone-700/60 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-stone-500">
                  <Clock className="w-2.5 h-2.5" />
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
            </div>
            <div className="bg-stone-800/60 border border-stone-700/50 rounded-2xl p-3.5 text-xs text-stone-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-stone-300">Reflecting deeply with Gemini...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Starters (Only if conversation is brief) */}
      {messages.length <= 2 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Or tap a reflection theme to explore:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REFLECTION_TEMPLATES.slice(0, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectStarter(t)}
                className="text-left p-3 bg-stone-900/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/30 rounded-xl transition-all group"
              >
                <p className="text-xs font-semibold text-stone-200 group-hover:text-amber-300">
                  {t.title}
                </p>
                <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                  {t.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input & Voice Controls */}
      <form
        onSubmit={handleSendMessage}
        className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3 shadow-xl backdrop-blur-md space-y-3"
      >
        {isRecording && (
          <div className="flex items-center justify-between px-3 py-2 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>Listening to your voice note... Speak freely.</span>
            </div>
            <span className="text-[11px] font-mono text-rose-400">Recording</span>
          </div>
        )}

        <div className="relative">
          <textarea
            id="reflection-chat-input"
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Share your thoughts, feelings, or what happened today... (Shift + Enter for new line)"
            className="w-full bg-stone-950/60 border border-stone-800 focus:border-amber-500/50 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Microphone Voice Button */}
            <button
              type="button"
              id="mic-voice-toggle-btn"
              onClick={toggleRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700/60'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
              {isRecording ? 'Stop Voice Note' : 'Record Voice'}
            </button>

            {/* AI Polish Voice Text */}
            {inputText.length > 20 && (
              <button
                type="button"
                id="polish-voice-text-btn"
                onClick={handlePolishVoiceWithAI}
                disabled={isCleaningVoice}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700/60 transition-all disabled:opacity-50"
                title="Format spoken thoughts into clean reflection prose"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                {isCleaningVoice ? 'Polishing...' : 'Polish Prose'}
              </button>
            )}
          </div>

          <button
            type="submit"
            id="send-reflection-message-btn"
            disabled={!inputText.trim() || isThinking}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md transition-all active:scale-98 disabled:opacity-40"
          >
            <span>Send Thought</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Step 3: Analysis & Metadata Save Card Modal / Drawer */}
      {analysisResult && (
        <div className="bg-stone-900 border border-emerald-800/60 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-100">
                  Reflection Insights Ready
                </h3>
                <p className="text-xs text-stone-400">
                  Review extracted emotional metadata before saving to your isolated Firestore
                </p>
              </div>
            </div>

            <SentimentBadge
              emotion={analysisResult.primaryEmotion}
              emoji={analysisResult.emotionEmoji}
              score={analysisResult.sentimentScore}
              size="lg"
            />
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Reflection Title (3-5 words)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* 1-Sentence Key Takeaway */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                1-Sentence Core Insight / Anchor
              </label>
              <textarea
                rows={2}
                value={customTakeaway}
                onChange={(e) => setCustomTakeaway(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Themes & Tags
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {customTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-stone-800 text-stone-200 border border-stone-700"
                  >
                    <Tag className="w-3 h-3 text-emerald-400" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-stone-400 hover:text-rose-400 ml-1 text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add custom tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-1 text-xs text-stone-200 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              id="cancel-analysis-btn"
              onClick={() => setAnalysisResult(null)}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-xl transition-colors"
            >
              Continue Journaling
            </button>

            <button
              id="confirm-save-reflection-btn"
              onClick={handleSaveReflection}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-semibold text-xs rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Persisting to Cloud Firestore...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Reflection to Journal
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
