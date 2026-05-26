// ─── Collection ──────────────────────────────────────────

export interface CollectionMeta {
  slug: string;
  name: string;
  language: 'zh-CN' | 'en';
  totalCount: number;
  categoryCount: number;
}

export interface Category {
  name: string;
  poemIds: string[];
  sortOrder: number;
  start?: number;
  end?: number;
}

// ─── Lyrics / Verses ─────────────────────────────────────

export interface Verse {
  verseNumber: number;
  verseLabel: string;
  lines: string[];
  isChorus: boolean;
}

export interface Lyrics {
  verses: Verse[];
  hasChorus: boolean;
}

// ─── Poem ────────────────────────────────────────────────

export interface Poem {
  id: string;
  collectionSlug: string;
  number: number;
  numberDisplay: string;
  title: string;
  titleEn?: string;
  category?: string;
  lyrics: Lyrics;
  keySignature?: string;
  timeSignature?: string;
  author?: string;
  composer?: string;
  meter?: string;
  sheetMusicPath?: string;
  sortOrder: number;
}

// ─── Search ──────────────────────────────────────────────

export interface SearchIndexEntry {
  poemId: string;
  collectionSlug: string;
  number: number;
  numberDisplay: string;
  title: string;
  titlePinyin: string;
  searchText: string;
  category: string;
}

export interface SearchResult {
  poemId: string;
  title: string;
  collectionSlug: string;
  number: number;
  numberDisplay: string;
  category: string;
  score: number;
  matchInTitle: boolean;
}
