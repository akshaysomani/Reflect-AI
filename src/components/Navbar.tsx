import React from 'react';
import { UserProfile } from '../types';
import {
  BookOpen,
  Sparkles,
  History,
  TrendingUp,
  LogOut,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  activeTab: 'dashboard' | 'reflect' | 'history' | 'synthesis';
  setActiveTab: (tab: 'dashboard' | 'reflect' | 'history' | 'synthesis') => void;
  onLogout: () => void;
  onNewReflection: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onNewReflection,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              id="brand-home-button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-5 h-5 text-stone-950" />
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-stone-100 flex items-center gap-1.5">
                  Aura Reflect
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                    AI
                  </span>
                </span>
                <p className="text-[11px] text-stone-400 font-mono -mt-0.5">
                  Secure Journaling
                </p>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 bg-stone-950/60 p-1 rounded-xl border border-stone-800/80">
              <button
                id="nav-dashboard-tab"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-stone-800 text-stone-100 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Dashboard
              </button>

              <button
                id="nav-reflect-tab"
                onClick={() => setActiveTab('reflect')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'reflect'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Reflection Studio
              </button>

              <button
                id="nav-history-tab"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-stone-800 text-stone-100 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                }`}
              >
                <History className="w-4 h-4" />
                Past Reflections
              </button>

              <button
                id="nav-synthesis-tab"
                onClick={() => setActiveTab('synthesis')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'synthesis'
                    ? 'bg-stone-800 text-stone-100 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Weekly Synthesis
              </button>
            </nav>
          )}

          {/* Right Action Bar / User Status */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  id="header-start-reflection-btn"
                  onClick={onNewReflection}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold shadow-sm transition-all hover:shadow-amber-500/20 active:scale-98"
                >
                  <PlusCircle className="w-4 h-4" />
                  New Entry
                </button>

                <div className="flex items-center gap-2.5 pl-2 border-l border-stone-800">
                  <div className="flex items-center gap-2">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full ring-1 ring-stone-700 object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-900/80 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center justify-center">
                        {(user.displayName || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-medium text-stone-200 truncate max-w-[140px]">
                        {user.displayName || 'User'}
                      </p>
                      <p className="text-[10px] text-stone-400 font-mono truncate max-w-[140px]">
                        {user.email || 'Guest Explorer'}
                      </p>
                    </div>
                  </div>

                  <button
                    id="auth-logout-btn"
                    onClick={onLogout}
                    title="Sign Out / Switch Account"
                    className="flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-amber-300 hover:bg-stone-800 rounded-lg transition-colors border border-transparent hover:border-stone-700 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Switch</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Zero-Trust Protected
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        {user && (
          <div className="flex md:hidden border-t border-stone-800 py-2 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
                activeTab === 'dashboard' ? 'bg-stone-800 text-stone-100 font-medium' : 'text-stone-400'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reflect')}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
                activeTab === 'reflect' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-stone-400'
              }`}
            >
              Reflect
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
                activeTab === 'history' ? 'bg-stone-800 text-stone-100 font-medium' : 'text-stone-400'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('synthesis')}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
                activeTab === 'synthesis' ? 'bg-stone-800 text-stone-100 font-medium' : 'text-stone-400'
              }`}
            >
              Synthesis
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
