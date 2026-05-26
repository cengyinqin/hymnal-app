import { create } from 'zustand';
import { HISTORY_MAX } from '../constants';

// Storage adapter — uses MMKV in production, falls back to in-memory for dev/typing
let mmkvStorage: any = null;
try {
  const { MMKV } = require('react-native-mmkv');
  mmkvStorage = new MMKV({ id: 'hymnal-user-store' });
} catch {
  // MMKV not available (e.g., during TypeScript checks)
}

function getItem<T>(key: string, fallback: T): T {
  try {
    if (mmkvStorage) {
      const raw = mmkvStorage.getString(key);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return fallback;
}

function setItem(key: string, value: unknown) {
  try {
    if (mmkvStorage) {
      mmkvStorage.set(key, JSON.stringify(value));
    }
  } catch {}
}

export type FontSize = 'small' | 'medium' | 'large';
export type ThemeMode = 'light' | 'dark' | 'system';

interface HistoryEntry {
  poemId: string;
  timestamp: number;
}

interface UserState {
  favorites: string[];
  history: HistoryEntry[];
  fontSize: FontSize;
  theme: ThemeMode;

  // Favorites
  toggleFavorite: (poemId: string) => void;
  isFavorite: (poemId: string) => boolean;

  // History
  addToHistory: (poemId: string) => void;
  removeFromHistory: (poemId: string) => void;
  clearHistory: () => void;
  recentHistory: () => string[];

  // Settings
  setFontSize: (size: FontSize) => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  favorites: getItem<string[]>('favorites', []),
  history: getItem<HistoryEntry[]>('history', []),
  fontSize: getItem<FontSize>('fontSize', 'medium'),
  theme: getItem<ThemeMode>('theme', 'system'),

  toggleFavorite: (poemId: string) => {
    const current = get().favorites;
    const idx = current.indexOf(poemId);
    let next: string[];
    if (idx >= 0) {
      next = [...current];
      next.splice(idx, 1);
    } else {
      next = [poemId, ...current];
    }
    setItem('favorites', next);
    set({ favorites: next });
  },

  isFavorite: (poemId: string) => get().favorites.includes(poemId),

  addToHistory: (poemId: string) => {
    const current = get().history.filter(h => h.poemId !== poemId);
    const next = [{ poemId, timestamp: Date.now() }, ...current].slice(0, HISTORY_MAX);
    setItem('history', next);
    set({ history: next });
  },

  removeFromHistory: (poemId: string) => {
    const next = get().history.filter(h => h.poemId !== poemId);
    setItem('history', next);
    set({ history: next });
  },

  clearHistory: () => {
    setItem('history', []);
    set({ history: [] });
  },

  recentHistory: () => get().history.slice(0, 20).map(h => h.poemId),

  setFontSize: (size: FontSize) => {
    setItem('fontSize', size);
    set({ fontSize: size });
  },

  setTheme: (mode: ThemeMode) => {
    setItem('theme', mode);
    set({ theme: mode });
  },
}));
