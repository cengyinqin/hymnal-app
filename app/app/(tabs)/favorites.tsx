import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useDataStore } from '../../src/store/useDataStore';
import { useUserStore } from '../../src/store/useUserStore';
import { COLLECTIONS } from '../../src/constants';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

export default function FavoritesScreen() {
  const favorites = useUserStore(s => s.favorites);
  const getPoem = useDataStore(s => s.getPoem);
  const fontSize = useUserStore(s => s.fontSize);
  const scale = fontSize === 'large' ? 1.2 : fontSize === 'small' ? 0.85 : 1;

  const poems = favorites.map(id => getPoem(id)).filter(Boolean);

  return (
    <View style={styles.container}>
      <FlatList
        data={poems}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { fontSize: 18 * scale }]}>暂无收藏</Text>
            <Text style={[styles.emptySub, { fontSize: 14 * scale }]}>
              浏览诗歌时点击心形图标即可收藏
            </Text>
          </View>
        }
        renderItem={({ item }: any) => {
          const col = COLLECTIONS[item.collectionSlug];
          return (
            <Link href={`/poem/${item.id}`} asChild>
              <TouchableOpacity style={styles.item} activeOpacity={0.7}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { fontSize: 16 * scale }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemNumber, { fontSize: 13 * scale }]}>
                    #{item.numberDisplay}
                  </Text>
                </View>
                <View style={styles.itemMeta}>
                  <Text style={[styles.collectionName, { fontSize: 12 * scale }]}>
                    {col?.name || item.collectionSlug}
                  </Text>
                  {item.category ? (
                    <Text style={[styles.categoryName, { fontSize: 12 * scale }]}>
                      {item.category}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            </Link>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyTitle: { fontWeight: '600', color: colors.text },
  emptySub: { color: colors.textSecondary, marginTop: spacing.sm },
  item: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: { fontWeight: '600', color: colors.text, flex: 1 },
  itemNumber: { color: colors.textTertiary, marginLeft: spacing.sm },
  itemMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  collectionName: { color: colors.textSecondary },
  categoryName: { color: colors.textTertiary },
});
