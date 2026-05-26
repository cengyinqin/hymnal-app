import { useState, useEffect, useMemo } from 'react';
import type { SearchIndexEntry, SearchResult } from '../types';
import { search } from '../lib/search';
import { SEARCH_DEBOUNCE_MS } from '../constants';

export function useSearch(
  query: string,
  index: SearchIndexEntry[],
  activeCollection?: string,
): SearchResult[] {
  const debounced = useDebounce(query, SEARCH_DEBOUNCE_MS);
  return useMemo(
    () => search(debounced, index, activeCollection),
    [debounced, index, activeCollection],
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export { useDebounce };
