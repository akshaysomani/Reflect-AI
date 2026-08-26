import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Mic,
  BrainCircuit,
  TrendingUp,
  KeyRound,
  ArrowRight,
  UserCheck,
  Mail,
} from 'lucide-react';

interface AuthViewProps {
  onGoogleSignIn: (email?: string, name?: string) => Promise<void>;
  onGuestSignIn: () => Promise<void>;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onGoogleSignIn,
  onGuestSignIn,
}) => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [showCustomAccount, setShowCustomAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountName, setAccountName] = useState('');

  const handleGoogle = async (email?: string, name?: string) => {
    try {
      setLoadingGoogle(true);
      await onGoogleSignIn(email, name);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountEmail.trim()) return;
    let name = accountName.trim();
    if (!name) {
      name = accountEmail
        .split('@')[0]
        .replace(/[._0-9]/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    await handleGoogle(accountEmail.trim(), name || 'Google User');
  };

  const handleGuest = async () => {
    try {
      setLoadingGuest(true);
      await onGuestSignIn();
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-stone-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-4xl w-full mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Empathetic AI Reflection & Automated Weekly Synthesis
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-50 leading-tight">
            A safe sanctuary for your{' '}
            <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent italic">
              thoughts, emotions & growth.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-stone-300 font-light leading-relaxed">
            Speak or write your daily reflections. Our Gemini-powered journaling partner helps you
            unpack emotions, reframe self-criticism, and synthesize weekly patterns with strict zero-trust data isolation.
          </p>
        </div>

        {/* Authentication Options (Matching user reference image) */}
        <div className="flex flex-col items-center justify-center gap-4 py-2">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
            {/* White Pill Button: Sign in with Google */}
            <button
              id="google-signin-btn"
              onClick={() => handleGoogle()}
              disabled={loadingGoogle || loadingGuest}
              className="w-full sm:w-auto flex-1 h-14 px-8 bg-stone-100 hover:bg-white text-stone-900 font-medium text-base rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="whitespace-nowrap">{loadingGoogle ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>

            {/* Dark Pill Button: Explore Demo Mode */}
            <button
              id="guest-signin-btn"
              onClick={handleGuest}
              disabled={loadingGoogle || loadingGuest}
              className="w-full sm:w-auto flex-1 h-14 px-8 bg-stone-900/90 hover:bg-stone-800/90 text-stone-200 hover:text-white font-medium text-base rounded-2xl border border-stone-800/80 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <span className="whitespace-nowrap">{loadingGuest ? 'Starting Session...' : 'Explore Demo Mode'}</span>
              <ArrowRight className="w-4 h-4 opacity-80 shrink-0" />
            </button>
          </div>

          {/* Fallback option to specify an account email if browser popup is blocked */}
          {!showCustomAccount ? (
            <button
              type="button"
              id="switch-google-account-btn"
              onClick={() => setShowCustomAccount(true)}
              className="text-xs text-stone-400 hover:text-amber-400 font-medium pt-2 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Or sign in by specifying a Google email address</span>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="w-full max-w-md p-4 bg-stone-900/95 border border-stone-800 rounded-2xl space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  Custom Google Account Sign In
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomAccount(false)}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Cancel
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="your.account@gmail.com"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  placeholder="Display Name (optional)"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-950 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={loadingGoogle || !accountEmail.trim()}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                Sign In with Email
              </button>
            </form>
          )}

          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authenticated with Firebase Project: <code className="text-stone-300 font-mono text-[11px]">gen-ai-cohort-3-defb5</code></span>
          </div>
        </div>

        {/* 3 Pillars / Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          <div className="bg-stone-900/60 border border-stone-800/70 p-5 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-stone-200">Empathetic Reflection</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Multi-turn active listening powered by Gemini 3.6 Flash. Uncovers cognitive patterns and offers gentle reframing.
            </p>
          </div>

          <div className="bg-stone-900/60 border border-stone-800/70 p-5 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-stone-200">Voice Note Journaling</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Express raw thoughts out loud. Our speech pipeline transcribes and structures your voice notes into mindful prose.
            </p>
          </div>

          <div className="bg-stone-900/60 border border-stone-800/70 p-5 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-stone-200">Weekly Emotional Synthesis</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Automated sentiment categorization, emotional trajectory charts, breakthrough highlights, and actionable growth habits.
            </p>
          </div>
        </div>

        {/* Zero-Trust Architecture Guarantee Banner */}
        <div className="bg-stone-950 border border-stone-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-stone-200 font-medium">Zero-Trust Cloud Firestore Isolation</p>
              <p className="text-[11px] text-stone-400 font-mono">
                match /users/{'{userId}'}/* : allow read, write: if request.auth.uid == userId
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Strict Data Ownership Enforced
          </div>
        </div>
      </div>
    </div>
  );
};
