import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useUserStore, FontSize, ThemeMode } from '../../src/store/useUserStore';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

export default function SettingsScreen() {
  const fontSize = useUserStore(s => s.fontSize);
  const theme = useUserStore(s => s.theme);
  const setFontSize = useUserStore(s => s.setFontSize);
  const setTheme = useUserStore(s => s.setTheme);
  const favorites = useUserStore(s => s.favorites);
  const clearHistory = useUserStore(s => s.clearHistory);

  const fontOptions: { key: FontSize; label: string; desc: string }[] = [
    { key: 'small', label: '小', desc: '较小字体' },
    { key: 'medium', label: '中', desc: '默认大小' },
    { key: 'large', label: '大', desc: '较大字体' },
  ];

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'system', label: '跟随系统' },
    { key: 'light', label: '浅色' },
    { key: 'dark', label: '深色' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>字体大小</Text>
      <View style={styles.optionRow}>
        {fontOptions.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionBtn, fontSize === opt.key && styles.optionBtnActive]}
            onPress={() => setFontSize(opt.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.optionLabel, fontSize === opt.key && styles.optionLabelActive]}
            >
              {opt.label}
            </Text>
            <Text style={[styles.optionDesc, fontSize === opt.key && styles.optionLabelActive]}>
              {opt.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>主题</Text>
      <View style={styles.optionRow}>
        {themeOptions.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionBtn, theme === opt.key && styles.optionBtnActive]}
            onPress={() => setTheme(opt.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.optionLabel, theme === opt.key && styles.optionLabelActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>数据</Text>
      <TouchableOpacity style={styles.actionBtn} onPress={clearHistory} activeOpacity={0.7}>
        <Text style={styles.actionBtnText}>清除浏览历史</Text>
      </TouchableOpacity>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>应用信息</Text>
        <Text style={styles.statsText}>收藏: {favorites.length} 首</Text>
        <Text style={styles.statsText}>数据版本: 1.0.0</Text>
        <Text style={styles.statsText}>诗歌总数: 3292</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionLabelActive: { color: colors.primary },
  optionDesc: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  actionBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: { fontSize: 15, color: colors.accent },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  statsTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  statsText: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
});
