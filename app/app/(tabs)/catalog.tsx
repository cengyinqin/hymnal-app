import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useDataStore } from '../../src/store/useDataStore';
import { useUserStore } from '../../src/store/useUserStore';
import { COLLECTION_ORDER } from '../../src/constants';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

export default function CatalogScreen() {
  const collections = useDataStore(s => s.collections);
  const fontSize = useUserStore(s => s.fontSize);
  const scale = fontSize === 'large' ? 1.2 : fontSize === 'small' ? 0.85 : 1;

  const colList = COLLECTION_ORDER.map(slug => collections[slug]).filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { fontSize: typography.title.fontSize * scale }]}>
        诗歌目录
      </Text>
      <Text style={[styles.subtitle, { fontSize: typography.caption.fontSize * scale }]}>
        共 7 个选集，3292 首诗歌
      </Text>

      {colList.map(col => (
        <Link key={col.slug} href={`/collection/${col.slug}`} asChild>
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { fontSize: 18 * scale }]}>
                {col.name}
              </Text>
              <Text style={styles.arrow}>›</Text>
            </View>
            <View style={styles.cardMeta}>
              <Text style={[styles.cardCount, { fontSize: 14 * scale }]}>
                {col.totalCount} 首诗歌
              </Text>
              {col.categoryCount > 0 && (
                <Text style={[styles.cardCategories, { fontSize: 14 * scale }]}>
                  {col.categoryCount} 个分类
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: { fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontWeight: '600', color: colors.text },
  arrow: { fontSize: 24, color: colors.textTertiary, lineHeight: 24 },
  cardMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  cardCount: { color: colors.textSecondary },
  cardCategories: { color: colors.textTertiary },
});
