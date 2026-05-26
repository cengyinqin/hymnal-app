import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useDataStore } from '../../src/store/useDataStore';
import { useUserStore } from '../../src/store/useUserStore';
import { COLLECTION_ORDER } from '../../src/constants';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

export default function HomeScreen() {
  const collections = useDataStore(s => s.collections);
  const getPoem = useDataStore(s => s.getPoem);
  const recentHistoryFn = useUserStore(s => s.recentHistory);
  const fontSize = useUserStore(s => s.fontSize);
  const scale = fontSize === 'large' ? 1.2 : fontSize === 'small' ? 0.85 : 1;

  const recentIds = recentHistoryFn();
  const recentPoems = recentIds.map(id => getPoem(id)).filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { fontSize: typography.title.fontSize * scale }]}>
        诗歌选集
      </Text>
      <View style={styles.collectionGrid}>
        {COLLECTION_ORDER.map(slug => {
          const col = collections[slug];
          if (!col) return null;
          return (
            <Link key={slug} href={`/collection/${slug}`} asChild>
              <TouchableOpacity style={styles.collectionCard} activeOpacity={0.7}>
                <Text style={[styles.collectionName, { fontSize: 17 * scale }]}>
                  {col.name}
                </Text>
                <Text style={[styles.collectionCount, { fontSize: 13 * scale }]}>
                  {col.totalCount} 首
                </Text>
                {col.categoryCount > 0 && (
                  <Text style={[styles.collectionMeta, { fontSize: 11 * scale }]}>
                    {col.categoryCount} 个分类
                  </Text>
                )}
              </TouchableOpacity>
            </Link>
          );
        })}
      </View>

      {recentPoems.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { fontSize: typography.title.fontSize * scale, marginTop: spacing.lg }]}>
            最近浏览
          </Text>
          {recentPoems.slice(0, 10).map((poem: any) => {
            const col = collections[poem.collectionSlug];
            return (
              <Link key={poem.id} href={`/poem/${poem.id}`} asChild>
                <TouchableOpacity style={styles.recentItem} activeOpacity={0.7}>
                  <View style={styles.recentMeta}>
                    <Text style={[styles.recentCollection, { fontSize: 12 * scale }]}>
                      {col?.name || poem.collectionSlug}
                    </Text>
                    <Text style={[styles.recentNumber, { fontSize: 12 * scale }]}>
                      #{poem.numberDisplay}
                    </Text>
                  </View>
                  <Text style={[styles.recentTitle, { fontSize: 16 * scale }]} numberOfLines={1}>
                    {poem.title}
                  </Text>
                </TouchableOpacity>
              </Link>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  collectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  collectionName: { fontWeight: '600', color: colors.text },
  collectionCount: { color: colors.textSecondary, marginTop: 2 },
  collectionMeta: { color: colors.textTertiary, marginTop: 1 },
  recentItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.xs,
  },
  recentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  recentCollection: { color: colors.textTertiary },
  recentNumber: { color: colors.textTertiary },
  recentTitle: { fontWeight: '500', color: colors.text },
});
