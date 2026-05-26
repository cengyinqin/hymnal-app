import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useDataStore } from '../../src/store/useDataStore';
import { useSearch } from '../../src/hooks/useSearch';
import { COLLECTIONS } from '../../src/constants';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import type { SearchResult } from '../../src/types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeCollection, setActiveCollection] = useState<string | undefined>();
  const searchIndex = useDataStore(s => s.searchIndex);
  const results = useSearch(query, searchIndex, activeCollection);

  const toggleCollection = useCallback((slug: string) => {
    setActiveCollection(prev => (prev === slug ? undefined : slug));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="搜索诗歌标题、歌词..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>选集:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['全部', ...Object.keys(COLLECTIONS)]}
          keyExtractor={item => item}
          renderItem={({ item }) => {
            const isActive = item === '全部'
              ? !activeCollection
              : activeCollection === item;
            const label = item === '全部' ? '全部' : COLLECTIONS[item]?.name || item;
            return (
              <TouchableOpacity
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveCollection(item === '全部' ? undefined : item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={item => item.poemId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          query.length > 0 ? (
            <View style={styles.empty}>
              <Text style={typography.body}>未找到相关诗歌</Text>
            </View>
          ) : null
        }
        renderItem={({ item }: { item: SearchResult }) => (
          <Link href={`/poem/${item.poemId}`} asChild>
            <TouchableOpacity style={styles.resultItem} activeOpacity={0.7}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.resultNumber}>#{item.numberDisplay}</Text>
              </View>
              <View style={styles.resultMeta}>
                <View style={styles.collectionBadge}>
                  <Text style={styles.collectionBadgeText}>
                    {COLLECTIONS[item.collectionSlug]?.name || item.collectionSlug}
                  </Text>
                </View>
                {item.category ? (
                  <Text style={styles.categoryText}>{item.category}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    padding: spacing.sm + 4,
    fontSize: typography.body.fontSize,
    color: colors.text,
  },
  clearBtn: { padding: spacing.sm + 4 },
  clearText: { fontSize: 16, color: colors.textTertiary },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filterLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.chipInactive,
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.chipActive },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  resultItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.xs,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  resultNumber: { fontSize: 13, color: colors.textTertiary, marginLeft: spacing.sm },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  collectionBadge: {
    backgroundColor: colors.badge,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  collectionBadgeText: { fontSize: 11, color: colors.badgeText },
  categoryText: { fontSize: 12, color: colors.textTertiary },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
});
