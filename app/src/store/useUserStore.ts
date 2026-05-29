import { create } from 'zustand';
import { Platform } from 'react-native';
import { HISTORY_MAX } from '../constants';

// Storage path
const STORE_FILE = 'hymnal-user-data.json';

// Async file persistence using expo-file-system
let fsReady = false;
let docDir = '';

async function initFS() {
  if (Platform.OS === 'web') return;
  try {
    const FS = require('expo-file-system');
    docDir = FS.documentDirectory;
    fsReady = true;
  } catch {}
}

async function loadFromFile(): Promise<Record<string, any>> {
  if (Platform.OS === 'web') {
    try {
      const raw = localStorage.getItem('hymnal-user');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }
  if (!fsReady) await initFS();
  if (!fsReady) return {};
  try {
    const FS = require('expo-file-system');
    const info = await FS.getInfoAsync(docDir + STORE_FILE);
    if (!info.exists) return {};
    const raw = await FS.readAsStringAsync(docDir + STORE_FILE);
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveToFile(data: Record<string, any>) {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem('hymnal-user', JSON.stringify(data));
    } catch {}
    return;
  }
  if (!fsReady) await initFS();
  if (!fsReady) return;
  try {
    const FS = require('expo-file-system');
    await FS.writeAsStringAsync(docDir + STORE_FILE, JSON.stringify(data));
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
  ready: boolean;

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

async function persist(state: Partial<UserState>) {
  await saveToFile({
    favorites: state.favorites,
    history: state.history,
    fontSize: state.fontSize,
    theme: state.theme,
  });
}

export const useUserStore = create<UserState>((set, get) => ({
  favorites: [],
  history: [],
  fontSize: 'medium',
  theme: 'system',
  ready: false,

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
    set({ favorites: next });
    persist({ favorites: next });
  },

  isFavorite: (poemId: string) => get().favorites.includes(poemId),

  addToHistory: (poemId: string) => {
    const current = get().history.filter(h => h.poemId !== poemId);
    const next = [{ poemId, timestamp: Date.now() }, ...current].slice(0, HISTORY_MAX);
    set({ history: next });
    persist({ history: next });
  },

  removeFromHistory: (poemId: string) => {
    const next = get().history.filter(h => h.poemId !== poemId);
    set({ history: next });
    persist({ history: next });
  },

  clearHistory: () => {
    set({ history: [] });
    persist({ history: [] });
  },

  recentHistory: () => get().history.slice(0, 20).map(h => h.poemId),

  setFontSize: (size: FontSize) => {
    set({ fontSize: size });
    persist({ fontSize: size });
  },

  setTheme: (mode: ThemeMode) => {
    set({ theme: mode });
    persist({ theme: mode });
  },
}));

// Load persisted data on startup
loadFromFile().then(data => {
  if (data && Object.keys(data).length > 0) {
    useUserStore.setState({
      favorites: data.favorites || [],
      history: data.history || [],
      fontSize: data.fontSize || 'medium',
      theme: data.theme || 'system',
      ready: true,
    });
  } else {
    useUserStore.setState({ ready: true });
  }
});
