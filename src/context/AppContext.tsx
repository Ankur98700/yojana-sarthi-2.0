import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiRequest } from '../lib/api.ts';
import type {
  AuthUserRecord,
  EligibilityCheckResponse,
  SchemeRecord,
  UserProfile,
} from '../types/index.ts';

interface ProfileCompletionInfo {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingKeyFields: string[];
}

interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface AppContextValue {
  route: string;
  navigate: (path: string) => void;
  firebaseUser: User | null;
  dbUser: AuthUserRecord | null;
  authLoading: boolean;
  profileCompletion: ProfileCompletionInfo | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  savedSchemeIds: number[];
  toggleSaveScheme: (schemeId: number, schemeName?: string) => Promise<void>;
  compareIds: number[];
  toggleCompareScheme: (schemeId: number, schemeName?: string) => void;
  removeCompareScheme: (schemeId: number) => void;
  clearCompare: () => void;
  activeProfile: UserProfile;
  setActiveProfile: (profile: UserProfile) => void;
  latestEligibilityResult: EligibilityCheckResponse | null;
  setLatestEligibilityResult: (result: EligibilityCheckResponse | null) => void;
  recentlyViewed: Array<{ id: number; slug: string; name: string; category: string }>;
  recordSchemeView: (scheme: Pick<SchemeRecord, 'id' | 'slug' | 'name' | 'category'>) => void;
  notify: (text: string, tone?: 'info' | 'success' | 'error') => void;
  toast: ToastMessage | null;
  dismissToast: () => void;
  prefillAssistantQuestion: string | null;
  askAssistant: (question: string) => void;
  consumePrefillQuestion: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function getInitialRoute(): string {
  const path = window.location.pathname;
  return path && path !== '' ? path : '/';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<string>(getInitialRoute);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<AuthUserRecord | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [profileCompletion, setProfileCompletion] = useState<ProfileCompletionInfo | null>(null);
  const [savedSchemeIds, setSavedSchemeIds] = useState<number[]>([]);
  const [compareIds, setCompareIds] = useState<number[]>(() => {
    try {
      const raw = sessionStorage.getItem('ys_compare_ids');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [activeProfile, setActiveProfileState] = useState<UserProfile>(() => {
    try {
      const raw = sessionStorage.getItem('ys_guest_profile');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [latestEligibilityResult, setLatestEligibilityResult] =
    useState<EligibilityCheckResponse | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<
    Array<{ id: number; slug: string; name: string; category: string }>
  >(() => {
    try {
      const raw = sessionStorage.getItem('ys_recently_viewed');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [prefillAssistantQuestion, setPrefillAssistantQuestion] = useState<string | null>(null);

  const notify = useCallback((text: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast({ id: Date.now(), text, tone });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = useCallback((path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (window.location.pathname !== cleanPath) {
      window.history.pushState({}, '', cleanPath);
    }
    setRoute(cleanPath);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setActiveProfile = useCallback((profile: UserProfile) => {
    setActiveProfileState(profile);
    try {
      sessionStorage.setItem('ys_guest_profile', JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) {
      setDbUser(null);
      setProfileCompletion(null);
      setSavedSchemeIds([]);
      return;
    }
    try {
      const [meData, savedData] = await Promise.all([
        apiRequest<{ user: AuthUserRecord; profileCompletion: ProfileCompletionInfo }>('/api/auth/me'),
        apiRequest<{ schemes: SchemeRecord[] }>('/api/saved-schemes'),
      ]);
      setDbUser(meData.user);
      setProfileCompletion(meData.profileCompletion);
      setSavedSchemeIds(savedData.schemes.map((s) => s.id));
      if (meData.user.profile && Object.keys(meData.user.profile).length > 1) {
        setActiveProfileState((prev) =>
          Object.keys(prev).length > 1 ? prev : meData.user.profile
        );
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await refreshUser();
      } else {
        setDbUser(null);
        setProfileCompletion(null);
        setSavedSchemeIds([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [refreshUser]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await refreshUser();
      notify('Signed in successfully. Your saved schemes and eligibility history are now synced.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Sign-in was cancelled or failed.';
      notify(msg, 'error');
    }
  }, [notify, refreshUser]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setDbUser(null);
      setProfileCompletion(null);
      setSavedSchemeIds([]);
      notify('Signed out of Yojana Sarthi.', 'info');
      if (route === '/dashboard' || route === '/admin') {
        navigate('/');
      }
    } catch {
      notify('Unable to sign out right now.', 'error');
    }
  }, [navigate, notify, route]);

  const toggleSaveScheme = useCallback(
    async (schemeId: number, schemeName?: string) => {
      if (!auth.currentUser) {
        notify('Please sign in with Google to save schemes to your personal dashboard.', 'info');
        return;
      }
      const alreadySaved = savedSchemeIds.includes(schemeId);
      try {
        if (alreadySaved) {
          await apiRequest(`/api/saved-schemes/${schemeId}`, { method: 'DELETE' });
          setSavedSchemeIds((prev) => prev.filter((id) => id !== schemeId));
          notify(
            schemeName ? `Removed "${schemeName}" from saved schemes.` : 'Removed from saved schemes.',
            'info'
          );
        } else {
          await apiRequest(`/api/saved-schemes/${schemeId}`, { method: 'POST' });
          setSavedSchemeIds((prev) => [...prev, schemeId]);
          notify(
            schemeName ? `Saved "${schemeName}" to your dashboard.` : 'Scheme saved to dashboard.',
            'success'
          );
        }
      } catch (err: unknown) {
        notify(err instanceof Error ? err.message : 'Could not update saved schemes.', 'error');
      }
    },
    [notify, savedSchemeIds]
  );

  const persistCompare = (next: number[]) => {
    setCompareIds(next);
    try {
      sessionStorage.setItem('ys_compare_ids', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const toggleCompareScheme = useCallback(
    (schemeId: number, schemeName?: string) => {
      if (compareIds.includes(schemeId)) {
        persistCompare(compareIds.filter((id) => id !== schemeId));
        notify(
          schemeName ? `Removed "${schemeName}" from comparison.` : 'Removed from comparison.',
          'info'
        );
        return;
      }
      if (compareIds.length >= 3) {
        notify('You can compare up to 3 schemes at a time. Remove one to add another.', 'error');
        return;
      }
      persistCompare([...compareIds, schemeId]);
      notify(
        schemeName
          ? `Added "${schemeName}" to comparison (${compareIds.length + 1}/3).`
          : `Added to comparison (${compareIds.length + 1}/3).`,
        'success'
      );
    },
    [compareIds, notify]
  );

  const removeCompareScheme = useCallback(
    (schemeId: number) => {
      persistCompare(compareIds.filter((id) => id !== schemeId));
    },
    [compareIds]
  );

  const clearCompare = useCallback(() => {
    persistCompare([]);
  }, []);

  const recordSchemeView = useCallback(
    (scheme: Pick<SchemeRecord, 'id' | 'slug' | 'name' | 'category'>) => {
      setRecentlyViewed((prev) => {
        const filtered = prev.filter((item) => item.id !== scheme.id);
        const next = [
          { id: scheme.id, slug: scheme.slug, name: scheme.name, category: scheme.category },
          ...filtered,
        ].slice(0, 6);
        try {
          sessionStorage.setItem('ys_recently_viewed', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    []
  );

  const askAssistant = useCallback(
    (question: string) => {
      setPrefillAssistantQuestion(question);
      navigate('/assistant');
    },
    [navigate]
  );

  const consumePrefillQuestion = useCallback(() => {
    setPrefillAssistantQuestion(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        route,
        navigate,
        firebaseUser,
        dbUser,
        authLoading,
        profileCompletion,
        signInWithGoogle,
        signOut,
        refreshUser,
        savedSchemeIds,
        toggleSaveScheme,
        compareIds,
        toggleCompareScheme,
        removeCompareScheme,
        clearCompare,
        activeProfile,
        setActiveProfile,
        latestEligibilityResult,
        setLatestEligibilityResult,
        recentlyViewed,
        recordSchemeView,
        notify,
        toast,
        dismissToast,
        prefillAssistantQuestion,
        askAssistant,
        consumePrefillQuestion,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
