import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, Link, Stack } from 'expo-router';
import { useDataStore } from '../../../src/store/useDataStore';
import { useUserStore } from '../../../src/store/useUserStore';
import { getSheetMusicUrl } from '../../../src/lib/sheetMusic';
import { COLLECTIONS } from '../../../src/constants';
import { colors, typography, spacing, borderRadius } from '../../../src/theme';

export default function PoemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getPoem = useDataStore(s => s.getPoem);
  const poem = getPoem(id || '');
  const favorites = useUserStore(s => s.favorites);
  const toggleFavorite = useUserStore(s => s.toggleFavorite);
  const addToHistory = useUserStore(s => s.addToHistory);
  const fontSize = useUserStore(s => s.fontSize);

  const scale = fontSize === 'large' ? 1.2 : fontSize === 'small' ? 0.85 : 1;
  const isFavorite = poem ? favorites.includes(poem.id) : false;

  useEffect(() => {
    if (poem) {
      addToHistory(poem.id);
    }
  }, [poem?.id]);

  if (!poem) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>未找到诗歌</Text>
      </View>
    );
  }

  const col = COLLECTIONS[poem.collectionSlug];
  const sheetMusicUrl = getSheetMusicUrl(poem);
  const verses = poem.lyrics.verses;

  return (
    <>
      <Stack.Screen
        options={{
          title: poem.title,
          headerRight: () => (
            <TouchableOpacity onPress={() => toggleFavorite(poem.id)} style={styles.heartBtn}>
              <Text style={[styles.heart, isFavorite && styles.heartActive]}>
                {isFavorite ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.collectionBadge}>
              <Text style={styles.collectionBadgeText}>{col?.name || poem.collectionSlug}</Text>
            </View>
            <Text style={[styles.numberText, { fontSize: 14 * scale }]}>
              #{poem.numberDisplay}
            </Text>
          </View>
          {poem.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{poem.category}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metadata}>
          {poem.author ? (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { fontSize: 11 * scale }]}>作者</Text>
              <Text style={[styles.metaValue, { fontSize: 13 * scale }]}>{poem.author}</Text>
            </View>
          ) : null}
          {poem.composer ? (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { fontSize: 11 * scale }]}>作曲</Text>
              <Text style={[styles.metaValue, { fontSize: 13 * scale }]}>{poem.composer}</Text>
            </View>
          ) : null}
          {poem.keySignature ? (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { fontSize: 11 * scale }]}>调号</Text>
              <Text style={[styles.metaValue, { fontSize: 13 * scale }]}>{poem.keySignature}</Text>
            </View>
          ) : null}
          {poem.timeSignature ? (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { fontSize: 11 * scale }]}>拍号</Text>
              <Text style={[styles.metaValue, { fontSize: 13 * scale }]}>{poem.timeSignature}</Text>
            </View>
          ) : null}
          {poem.meter ? (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { fontSize: 11 * scale }]}>韵律</Text>
              <Text style={[styles.metaValue, { fontSize: 13 * scale }]}>{poem.meter}</Text>
            </View>
          ) : null}
        </View>

        {sheetMusicUrl && (
          <Link href={`/sheet-music/${poem.id}`} asChild>
            <TouchableOpacity style={styles.sheetMusicBtn} activeOpacity={0.7}>
              <Text style={[styles.sheetMusicText, { fontSize: 14 * scale }]}>查看乐谱</Text>
            </TouchableOpacity>
          </Link>
        )}

        <View style={styles.lyricsContainer}>
          {verses.map((verse, idx) => (
            <View key={idx} style={styles.verseBlock}>
              {verse.verseLabel !== '0' && !verse.isChorus && (
                <Text style={[styles.verseLabel, { fontSize: 14 * scale }]}>
                  {verse.verseLabel}
                </Text>
              )}
              {verse.isChorus && (
                <Text style={[styles.chorusLabel, { fontSize: 13 * scale }]}>副歌</Text>
              )}
              {verse.lines.map((line, li) => (
                <Text
                  key={li}
                  style={[
                    styles.verseLine,
                    { fontSize: typography.body.fontSize! * scale, lineHeight: (typography.body.fontSize! * scale) * 1.8 },
                    verse.isChorus && styles.chorusLine,
                  ]}
                >
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  heartBtn: { padding: spacing.xs },
  heart: { fontSize: 24, color: colors.heartEmpty },
  heartActive: { color: colors.heart },

  header: { marginBottom: spacing.md },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  collectionBadge: {
    backgroundColor: colors.badge,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  collectionBadgeText: { fontSize: 12, color: colors.badgeText, fontWeight: '500' },
  numberText: { color: colors.textSecondary },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chipInactive,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: { fontSize: 12, color: colors.textSecondary },

  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  metaLabel: { color: colors.textTertiary, textTransform: 'uppercase' },
  metaValue: { color: colors.text, fontWeight: '500' },

  sheetMusicBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetMusicText: { color: '#fff', fontWeight: '600' },

  lyricsContainer: { marginTop: spacing.sm },
  verseBlock: { marginBottom: spacing.md },
  verseLabel: {
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  chorusLabel: {
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  verseLine: {
    color: colors.text,
    paddingLeft: spacing.md,
  },
  chorusLine: {
    color: colors.textSecondary,
  },
});
