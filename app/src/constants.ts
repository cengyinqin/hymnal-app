import type { CollectionMeta } from './types';

export const COLLECTIONS: Record<string, CollectionMeta> = {
  da:   { slug: 'da',   name: '大本诗歌', language: 'zh-CN', totalCount: 770,  categoryCount: 30 },
  bu:   { slug: 'bu',   name: '补充诗歌', language: 'zh-CN', totalCount: 422,  categoryCount: 11 },
  en:   { slug: 'en',   name: '英文诗歌', language: 'en',     totalCount: 1340, categoryCount: 0 },
  er:   { slug: 'er',   name: '儿童诗歌', language: 'zh-CN', totalCount: 330,  categoryCount: 13 },
  xin:  { slug: 'xin',  name: '新歌颂咏', language: 'zh-CN', totalCount: 167,  categoryCount: 6 },
  csr:  { slug: 'csr',  name: '新诗',     language: 'zh-CN', totalCount: 205,  categoryCount: 0 },
  by:   { slug: 'by',   name: '标语诗歌', language: 'zh-CN', totalCount: 58,   categoryCount: 0 },
};

export const COLLECTION_ORDER = ['da', 'bu', 'en', 'er', 'xin', 'csr', 'by'] as const;

export const SHEET_MUSIC_BASE = 'https://logos-rhema.com';

export const HISTORY_MAX = 200;
export const SEARCH_RESULT_MAX = 50;
export const SEARCH_DEBOUNCE_MS = 200;
