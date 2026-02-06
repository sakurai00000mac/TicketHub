import { create } from 'zustand';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from '../config/firebase';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => () => void;
}

const mapFirebaseUser = (firebaseUser: FirebaseUser): AuthUser => ({
  id: firebaseUser.uid,
  email: firebaseUser.email || '',
  displayName: firebaseUser.displayName || 'Unknown',
  photoURL: firebaseUser.photoURL,
});

const saveUserToDatabase = async (user: AuthUser) => {
  const userRef = ref(db, `users/${user.id}`);
  const snapshot = await get(userRef);
  const now = Date.now();

  if (snapshot.exists()) {
    await set(userRef, {
      ...snapshot.val(),
      lastLoginAt: now,
    });
  } else {
    await set(userRef, {
      ...user,
      createdAt: now,
      lastLoginAt: now,
    });
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = mapFirebaseUser(result.user);
      await saveUserToDatabase(user);
      set({ user, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログインに失敗しました';
      set({ error: message, loading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await firebaseSignOut(auth);
      set({ user: null, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログアウトに失敗しました';
      set({ error: message, loading: false });
      throw error;
    }
  },

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = mapFirebaseUser(firebaseUser);
        set({ user, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    });
    return unsubscribe;
  },
}));
