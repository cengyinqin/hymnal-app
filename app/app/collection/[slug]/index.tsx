import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, Link, Stack } from 'expo-router';
import { useDataStore } from '../../../src/store/useDataStore';
import { useUserStore } from '../../../src/store/useUserStore';
import { colors, typography, spacing, borderRadius } from '../../../src/theme';

export default function CollectionDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const collections = useDataStore(s => s.collections);
  const getPoemsByCollection = useDataStore(s => s.getPoemsByCollection);
  const getPoemsByCategory = useDataStore(s => s.getPoemsByCategory);
  const fontSize = useUserStore(s => s.fontSize);
  const scale = fontSize === 'large' ? 1.2 : fontSize === 'small' ? 0.85 : 1;

  const col = collections[slug || ''];
  const allPoems = getPoemsByCollection(slug || '');
  const categories = col?.categories || [];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const poems = selectedCategory
    ? getPoemsByCategory(slug || '', selectedCategory)
    : allPoems;

  if (!col) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>未找到选集</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: col.name }} />
      <View style={styles.container}>
        {categories.length > 0 && (
          <View style={styles.filterRow}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ name: '全部', poemIds: [] }, ...categories] as any[]}
              keyExtractor={(item: any) => item.name}
              contentContainerStyle={styles.filterContent}
              renderItem={({ item }: any) => {
                const isActive = item.name === '全部'
                  ? !selectedCategory
                  : selectedCategory === item.name;
                return (
                  <TouchableOpacity
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setSelectedCategory(item.name === '全部' ? null : item.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {item.name}
                    </Text>
                    {item.name !== '全部' && item.poemIds?.length > 0 && (
                      <Text style={[styles.chipCount, isActive && styles.chipTextActive]}>
                        ({item.poemIds.length})
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        <FlatList
          data={poems}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          renderItem={({ item }: any) => (
            <Link href={`/poem/${item.id}`} asChild>
              <TouchableOpacity style={styles.poemItem} activeOpacity={0.7}>
                <Text style={[styles.poemNumber, { fontSize: 13 * scale }]}>
                  {item.numberDisplay}
                </Text>
                <View style={styles.poemInfo}>
                  <Text style={[styles.poemTitle, { fontSize: 16 * scale }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.category && (
                    <Text style={[styles.poemCategory, { fontSize: 12 * scale }]}>
                      {item.category}
                    </Text>
                  )}
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            </Link>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  filterRow: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.chipInactive,
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.chipActive },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  chipCount: { fontSize: 11, color: colors.textTertiary, marginLeft: 2 },
  listContent: { paddingBottom: spacing.xl },
  poemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  poemNumber: {
    color: colors.textTertiary,
    width: 40,
    textAlign: 'right',
    marginRight: spacing.sm + 4,
  },
  poemInfo: { flex: 1 },
  poemTitle: { fontWeight: '500', color: colors.text },
  poemCategory: { color: colors.textTertiary, marginTop: 1 },
  arrow: { fontSize: 20, color: colors.textTertiary },
});
