import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  ReflectionEntry,
  ReflectionPromptTemplate,
} from './types';
import {
  subscribeToAuth,
  loginWithGoogle,
  loginAsGuest,
  logoutUser,
  fetchUserReflections,
  deleteUserReflectionDoc,
} from './lib/firebase';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { ReflectionRoom } from './components/ReflectionRoom';
import { HistoryView } from './components/HistoryView';
import { WeeklySynthesisView } from './components/WeeklySynthesisView';
import { ReflectionDetailModal } from './components/ReflectionDetailModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reflect' | 'history' | 'synthesis'>('dashboard');
  const [selectedTemplate, setSelectedTemplate] = useState<ReflectionPromptTemplate | null>(null);
  const [activeDetailReflection, setActiveDetailReflection] = useState<ReflectionEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 1. Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch User Reflections whenever user changes
  useEffect(() => {
    async function loadData() {
      if (user?.uid) {
        try {
          const userEntries = await fetchUserReflections(user.uid);
          setReflections(userEntries);
        } catch (e) {
          console.error('Failed to load user reflections:', e);
        }
      } else {
        setReflections([]);
      }
    }
    loadData();
  }, [user]);

  // Handler for Google Sign-in
  const handleGoogleSignIn = async (email?: string, name?: string) => {
    try {
      const loggedUser = await loginWithGoogle(email, name);
      setUser(loggedUser);
      showToast(`Welcome, ${loggedUser.displayName || loggedUser.email || 'Reflective Soul'}!`);
    } catch (e: any) {
      showToast(e.message || 'Google Sign-in failed', 'error');
    }
  };

  // Handler for Guest Sign-in
  const handleGuestSignIn = async () => {
    try {
      const guest = await loginAsGuest('Mindful Guest');
      setUser(guest);
      showToast('Logged in as Guest Explorer with private local storage.');
    } catch (e: any) {
      showToast(e.message || 'Guest Sign-in failed', 'error');
    }
  };

  // Handler for Logout
  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setActiveTab('dashboard');
    showToast('You have been signed out securely.');
  };

  // Start new reflection
  const handleStartReflection = (template?: ReflectionPromptTemplate) => {
    setSelectedTemplate(template || null);
    setActiveTab('reflect');
  };

  // When a new reflection is saved in ReflectionRoom
  const handleReflectionSaved = (newEntry: ReflectionEntry) => {
    setReflections((prev) => [newEntry, ...prev.filter((r) => r.id !== newEntry.id)]);
    showToast('Reflection saved to isolated Cloud Firestore successfully!');
    setActiveTab('dashboard');
    setSelectedTemplate(null);
  };

  // When a reflection is deleted in HistoryView
  const handleDeleteReflection = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteUserReflectionDoc(user.uid, id);
      setReflections((prev) => prev.filter((r) => r.id !== id));
      showToast('Reflection deleted.');
    } catch (e: any) {
      showToast('Failed to delete reflection.', 'error');
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-200 space-y-4">
        <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs text-stone-400 font-mono">Initializing Secure Environment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onNewReflection={() => handleStartReflection()}
      />

      {/* Main View Router */}
      <main className="pb-16">
        {!user ? (
          <AuthView
            onGoogleSignIn={handleGoogleSignIn}
            onGuestSignIn={handleGuestSignIn}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                user={user}
                reflections={reflections}
                onStartReflection={handleStartReflection}
                onOpenReflectionDetail={(ref) => setActiveDetailReflection(ref)}
                onOpenSynthesis={() => setActiveTab('synthesis')}
                onViewAllHistory={() => setActiveTab('history')}
              />
            )}

            {activeTab === 'reflect' && (
              <ReflectionRoom
                user={user}
                initialTemplate={selectedTemplate}
                onSaved={handleReflectionSaved}
                onCancel={() => {
                  setSelectedTemplate(null);
                  setActiveTab('dashboard');
                }}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                reflections={reflections}
                onDeleteReflection={handleDeleteReflection}
                onSelectReflection={(ref) => setActiveDetailReflection(ref)}
              />
            )}

            {activeTab === 'synthesis' && (
              <WeeklySynthesisView
                user={user}
                reflections={reflections}
                onStartReflection={() => handleStartReflection()}
              />
            )}
          </>
        )}
      </main>

      {/* Detail Dialog Modal */}
      {activeDetailReflection && (
        <ReflectionDetailModal
          reflection={activeDetailReflection}
          onClose={() => setActiveDetailReflection(null)}
          onDelete={handleDeleteReflection}
        />
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-medium backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60 shadow-emerald-950/50'
              : 'bg-rose-950/90 text-rose-200 border-rose-700/60 shadow-rose-950/50'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
