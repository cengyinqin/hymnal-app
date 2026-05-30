import type { Poem, SearchResult } from '../types';
import { SEARCH_RESULT_MAX } from '../constants';

const COLLECTION_PRIORITY: Record<string, number> = {
  da: 0, bu: 1, en: 2, er: 3, xin: 4, csr: 5, by: 6,
};

// Cache flattened verse text per poem to avoid re-joining on every search
const textCache = new Map<string, string>();

function getSearchText(poem: Poem): string {
  const cached = textCache.get(poem.id);
  if (cached) return cached;
  const lines: string[] = [];
  for (const v of poem.lyrics?.verses || []) {
    lines.push(...v.lines);
  }
  const text = lines.join(' ');
  textCache.set(poem.id, text);
  return text;
}

export function search(
  query: string,
  poems: Poem[],
  activeCollection?: string,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const poem of poems) {
    if (activeCollection && poem.collectionSlug !== activeCollection) continue;

    let score = 0;
    const titleLower = poem.title.toLowerCase();

    if (titleLower.includes(q)) {
      score += 100;
      if (titleLower.startsWith(q)) score += 50;
    }

    const lyrics = getSearchText(poem).toLowerCase();
    const lyricIdx = lyrics.indexOf(q);
    if (lyricIdx !== -1) {
      score += 20;
      if (lyricIdx < 50) score += 5;
    }

    if (poem.category && poem.category.includes(q)) {
      score += 10;
    }

    if (score > 0) {
      results.push({
        poemId: poem.id,
        title: poem.title,
        collectionSlug: poem.collectionSlug,
        number: poem.number,
        numberDisplay: poem.numberDisplay,
        category: poem.category,
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
