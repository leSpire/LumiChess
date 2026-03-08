import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface Progress {
  level: number;
  streak: number;
  xp: number;
  completedLessons: number;
}

interface User {
  name: string;
  email: string;
  guest: boolean;
}

interface AppState {
  user: User | null;
  progress: Progress;
  setUser: (user: User | null) => void;
  completeLesson: () => void;
}

const defaultProgress: Progress = {
  level: 7,
  streak: 12,
  xp: 2680,
  completedLessons: 34
};

const STORAGE_KEY = 'lumichess-state-v2';

const AppStore = createContext<AppState | null>(null);

function readStorage(): { user: User | null; progress: Progress } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { user: { name: 'Invité', email: '', guest: true }, progress: defaultProgress };
  try {
    return JSON.parse(raw);
  } catch {
    return { user: { name: 'Invité', email: '', guest: true }, progress: defaultProgress };
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readStorage);

  const setUser = (user: User | null) => {
    setState((prev) => {
      const next = { ...prev, user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const completeLesson = () => {
    setState((prev) => {
      const next = {
        ...prev,
        progress: {
          ...prev.progress,
          completedLessons: prev.progress.completedLessons + 1,
          xp: prev.progress.xp + 40
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(() => ({ user: state.user, progress: state.progress, setUser, completeLesson }), [state]);

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStore);
  if (!ctx) throw new Error('AppStoreProvider missing');
  return ctx;
}
