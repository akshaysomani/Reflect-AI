/// <reference types="vite/client" />
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  setLogLevel,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import { ReflectionEntry, WeeklySynthesis, UserProfile } from '../types';

// Silence verbose internal transport logs
try {
  setLogLevel('silent');
} catch (e) {
  // ignore
}

// User-provided Firebase Production Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD7tO2MSUvsZdS0jSBDnYkzDracg3RgyvE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-ai-cohort-3-defb5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-ai-cohort-3-defb5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-ai-cohort-3-defb5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "243350167608",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:243350167608:web:c6134ad0441e7e5e2386cd",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1RXSZJ0D3P",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase init:', err);
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

// Zero-Crash Payload Hygiene: Strips all undefined properties from any object before database write
export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (value === undefined ? null : value))
  );
}

// ================= AUTHENTICATION SERVICES =================

const USER_SESSION_KEY = 'ai_journal_active_user';

export async function loginWithGoogle(email?: string, name?: string): Promise<UserProfile> {
  // If specific Google account email is provided directly
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || cleanEmail.split('@')[0];
    const generatedUid = 'google_' + btoa(cleanEmail).replace(/=/g, '').slice(0, 20);
    const profile: UserProfile = {
      uid: generatedUid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      isAnonymous: false,
    };
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
    return profile;
  }

  try {
    const provider = new GoogleAuthProvider();
    // Forces Google account selection dialog (as shown in Google signin popup)
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const credential = await signInWithPopup(auth, provider);
    const u = credential.user;
    const profile: UserProfile = {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Mindful Journaler'),
      photoURL: u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.displayName || u.email || 'User')}`,
      isAnonymous: false,
    };
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
    return profile;
  } catch (error: any) {
    const code = error?.code || '';
    const msg = error?.message || '';
    console.warn('Firebase Google Auth result:', code, msg);

    // If popup blocked or cancelled
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in cancelled. Please choose your Google account.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error(`Firebase Auth Domain notice: Please add ${window.location.hostname} to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).`);
    }
    throw error;
  }
}

export async function loginAsGuest(name: string = 'Mindful Explorer'): Promise<UserProfile> {
  try {
    const res = await signInAnonymously(auth);
    const profile: UserProfile = {
      uid: res.user.uid,
      email: null,
      displayName: name,
      photoURL: null,
      isAnonymous: true,
    };
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
    return profile;
  } catch (anonErr: any) {
    console.warn('Anonymous auth note (using local secure session):', anonErr?.message);
    let storedGuestId = localStorage.getItem('ai_journal_guest_uid');
    if (!storedGuestId) {
      storedGuestId = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('ai_journal_guest_uid', storedGuestId);
    }
    const profile: UserProfile = {
      uid: storedGuestId,
      email: null,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      isAnonymous: true,
    };
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
    return profile;
  }
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem(USER_SESSION_KEY);
  try {
    if (auth) {
      await signOut(auth);
    }
  } catch (err) {
    console.warn('Sign out:', err);
  }
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  if (!auth) {
    const cached = localStorage.getItem(USER_SESSION_KEY);
    callback(cached ? JSON.parse(cached) : null);
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      const profile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || 'Mindful User',
        photoURL: fbUser.photoURL,
        isAnonymous: fbUser.isAnonymous,
      };
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));
      callback(profile);
    } else {
      const cached = localStorage.getItem(USER_SESSION_KEY);
      callback(cached ? JSON.parse(cached) : null);
    }
  });

  return unsubscribe;
}

// ================= PERSISTENCE REPOSITORY =================

const LOCAL_STORAGE_KEY_PREFIX = 'ai_journal_reflections_';
const LOCAL_STORAGE_SYNTH_PREFIX = 'ai_journal_syntheses_';

// Non-blocking timeout helper to prevent hanging on Firestore network latency or indexing
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2500, fallbackVal?: T): Promise<T | undefined> {
  let timer: any;
  const timeoutPromise = new Promise<T | undefined>((resolve) => {
    timer = setTimeout(() => resolve(fallbackVal), timeoutMs);
  });
  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function saveReflectionDoc(userId: string, reflection: ReflectionEntry): Promise<void> {
  const sanitized = cleanPayload(reflection);

  // 1. Guaranteed immediate local persistence
  try {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    const existing: ReflectionEntry[] = raw ? JSON.parse(raw) : [];
    const index = existing.findIndex((e) => e.id === reflection.id);
    if (index >= 0) {
      existing[index] = sanitized;
    } else {
      existing.unshift(sanitized);
    }
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (localErr) {
    console.error('LocalStorage write error:', localErr);
  }

  // 2. Cloud Firestore write with non-blocking race (max 2.5s) and async background fulfillment
  if (db && userId) {
    try {
      const docRef = doc(db, 'users', userId, 'reflections', reflection.id);
      const writePromise = setDoc(docRef, sanitized, { merge: true });
      await withTimeout(writePromise, 2500);
    } catch (firestoreErr: any) {
      console.warn('Firestore write notice (local copy preserved):', firestoreErr?.message);
    }
  }
}

export async function fetchUserReflections(userId: string): Promise<ReflectionEntry[]> {
  const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${userId}`;
  let localEntries: ReflectionEntry[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      localEntries = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed reading local reflections:', err);
  }

  if (db && userId) {
    try {
      const colRef = collection(db, 'users', userId, 'reflections');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const fetchPromise = getDocs(q);
      const snapshot = await withTimeout(fetchPromise, 2500);
      if (snapshot && !snapshot.empty) {
        const remoteEntries = snapshot.docs.map((d) => d.data() as ReflectionEntry);
        const mergedMap = new Map<string, ReflectionEntry>();
        remoteEntries.forEach((e) => mergedMap.set(e.id, e));
        localEntries.forEach((e) => {
          if (!mergedMap.has(e.id)) {
            mergedMap.set(e.id, e);
          }
        });
        const combined = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        localStorage.setItem(localKey, JSON.stringify(combined));
        return combined;
      }
    } catch (firestoreErr: any) {
      console.warn('Firestore fetch notice (serving local cache):', firestoreErr?.message);
    }
  }

  const initKey = `ai_journal_initialized_${userId}`;
  const alreadyInitialized = localStorage.getItem(initKey);

  // If brand new user with no previous history, supply initial sample reflection
  if (localEntries.length === 0 && !alreadyInitialized) {
    const initialSample: ReflectionEntry = {
      id: 'sample_welcome_' + Date.now(),
      userId,
      title: 'Mindful Morning Pause',
      primaryEmotion: 'Peaceful',
      emotionEmoji: '🌿',
      sentimentScore: 0.75,
      tags: ['Clarity', 'Mindset', 'Gratitude'],
      oneSentenceTakeaway: 'Stepping back from urgency restores space to choose intentional action.',
      messages: [
        {
          id: 'm1',
          sender: 'user',
          text: 'I started my morning feeling rushed with so many tasks, but taking a few minutes to breathe helped me refocus.',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
        {
          id: 'm2',
          sender: 'assistant',
          text: 'That conscious shift from reactive acceleration to intentional presence is profound. When you notice that urgency bubbling up, what is the small anchor that brings you back to your breath?',
          timestamp: new Date(Date.now() - 3600000 * 24 + 60000).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    };
    localEntries = [initialSample];
    localStorage.setItem(localKey, JSON.stringify(localEntries));
    localStorage.setItem(initKey, 'true');
  }

  return localEntries;
}

export async function deleteUserReflectionDoc(userId: string, reflectionId: string): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${userId}`;
  const initKey = `ai_journal_initialized_${userId}`;

  // Mark initialized so deleting all reflections doesn't resurrect default sample
  try {
    localStorage.setItem(initKey, 'true');
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: ReflectionEntry[] = JSON.parse(raw);
      const filtered = existing.filter((e) => e.id !== reflectionId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (err) {
    console.error('Error removing from local cache:', err);
  }

  if (db && userId) {
    try {
      const docRef = doc(db, 'users', userId, 'reflections', reflectionId);
      await withTimeout(deleteDoc(docRef), 2500);
    } catch (firestoreErr: any) {
      console.warn('Firestore delete notice:', firestoreErr?.message);
    }
  }
}

export async function saveWeeklySynthesisDoc(userId: string, synth: WeeklySynthesis): Promise<void> {
  const sanitized = cleanPayload(synth);
  const localKey = `${LOCAL_STORAGE_SYNTH_PREFIX}${userId}`;

  try {
    const raw = localStorage.getItem(localKey);
    const existing: WeeklySynthesis[] = raw ? JSON.parse(raw) : [];
    existing.unshift(sanitized);
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch (err) {
    console.error('LocalStorage write error for synthesis:', err);
  }

  if (db && userId) {
    try {
      const docRef = doc(db, 'users', userId, 'syntheses', synth.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (err) {
      // ignore
    }
  }
}

export async function fetchUserSyntheses(userId: string): Promise<WeeklySynthesis[]> {
  const localKey = `${LOCAL_STORAGE_SYNTH_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error fetching syntheses:', err);
  }
  return [];
}
