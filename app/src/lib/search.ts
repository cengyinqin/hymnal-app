import type { SearchIndexEntry, SearchResult } from '../types';
import { SEARCH_RESULT_MAX } from '../constants';

const COLLECTION_PRIORITY: Record<string, number> = {
  da: 0, bu: 1, en: 2, er: 3, xin: 4, csr: 5, by: 6,
};

export function search(
  query: string,
  index: SearchIndexEntry[],
  activeCollection?: string,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const entry of index) {
    if (activeCollection && entry.collectionSlug !== activeCollection) continue;

    let score = 0;
    const titleLower = entry.title.toLowerCase();

    // Title match
    if (titleLower.includes(q)) {
      score += 100;
      if (titleLower.startsWith(q)) score += 50;
    }

    // Pinyin match
    if (entry.titlePinyin && entry.titlePinyin.includes(q)) {
      score += 80;
    }

    // Lyrics match
    const lyricIdx = entry.searchText.indexOf(q);
    if (lyricIdx !== -1) {
      score += 20;
      if (lyricIdx < 50) score += 5;
    }

    if (score > 0) {
      results.push({
        poemId: entry.poemId,
        title: entry.title,
        collectionSlug: entry.collectionSlug,
        number: entry.number,
        numberDisplay: entry.numberDisplay,
        category: entry.category,
        score,
        matchInTitle: titleLower.includes(q),
      });
    }
  }

  results.sort(
    (a, b) =>
      b.score - a.score ||
      (COLLECTION_PRIORITY[a.collectionSlug] ?? 99) -
        (COLLECTION_PRIORITY[b.collectionSlug] ?? 99),
  );

  return results.slice(0, SEARCH_RESULT_MAX);
}
