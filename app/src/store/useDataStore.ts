import { create } from 'zustand';
import type { Poem, Category, CollectionMeta } from '../types';
import { COLLECTIONS } from '../constants';

interface DataState {
  collections: Record<string, CollectionMeta & { categories: Category[] }>;
  poemsById: Record<string, Poem>;
  poemsList: Poem[];
  poemIdsByCollection: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  getPoem: (id: string) => Poem | undefined;
  getPoemsByCollection: (slug: string) => Poem[];
  getPoemsByCategory: (slug: string, categoryName: string) => Poem[];
  getCollectionPoemIds: (slug: string) => string[];
}

export const useDataStore = create<DataState>((set, get) => ({
  collections: {},
  poemsById: {},
  poemsList: [],
  poemIdsByCollection: {},
  isLoading: true,
  error: null,

  loadData: async () => {
    try {
      const [collectionsData, poemsArr] = await Promise.all([
        import('../../assets/data/collections.json') as Promise<any>,
        import('../../assets/data/poems.min.json') as Promise<any>,
      ]);

      const poemsById: Record<string, Poem> = {};
      const poemIdsByCollection: Record<string, string[]> = {};

      const poemList: Poem[] = poemsArr.default || poemsArr;
      for (const poem of poemList) {
        poemsById[poem.id] = poem;
        if (!poemIdsByCollection[poem.collectionSlug]) {
          poemIdsByCollection[poem.collectionSlug] = [];
        }
        poemIdsByCollection[poem.collectionSlug].push(poem.id);
      }

      const colData = (collectionsData.default || collectionsData) as Record<string, any>;
      const mergedCollections: Record<string, any> = {};

      for (const slug of Object.keys(COLLECTIONS)) {
        const meta = colData[slug] || {};
        mergedCollections[slug] = {
          ...COLLECTIONS[slug],
          categories: meta.categories || [],
        };
      }

      set({
        collections: mergedCollections,
        poemsById,
        poemsList: poemList,
        poemIdsByCollection,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to load data' });
    }
  },

  getPoem: (id: string) => get().poemsById[id],

  getPoemsByCollection: (slug: string) => {
    const ids = get().poemIdsByCollection[slug] || [];
    const byId = get().poemsById;
    return ids.map(id => byId[id]).filter(Boolean);
  },

  getPoemsByCategory: (slug: string, categoryName: string) => {
    return get()
      .getPoemsByCollection(slug)
      .filter(p => p.category === categoryName);
  },

  getCollectionPoemIds: (slug: string) => {
    return get().poemIdsByCollection[slug] || [];
  },
}));
