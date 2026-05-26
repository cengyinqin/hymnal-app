import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View, Text } from 'react-native';
import { useDataStore } from '../src/store/useDataStore';
import { useUserStore } from '../src/store/useUserStore';
import { colors, typography, spacing } from '../src/theme';

export default function RootLayout() {
  const { isLoading, error, loadData } = useDataStore();
  const fontSize = useUserStore(s => s.fontSize);
  const theme = useUserStore(s => s.theme);

  const [fontsLoaded] = useFonts({
    // System fonts are used by default; load custom fonts here if needed
  });

  useEffect(() => {
    loadData();
  }, []);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textSecondary, fontSize: typography.body.fontSize * (fontSize === 'large' ? 1.2 : fontSize === 'small' ? 0.85 : 1) }}>
          加载中...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg }}>
        <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>加载失败</Text>
        <Text style={typography.caption}>{error}</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="poem/[id]"
        options={{ title: '诗歌', headerBackTitle: '返回' }}
      />
      <Stack.Screen
        name="collection/[slug]"
        options={{ title: '目录', headerBackTitle: '返回' }}
      />
      <Stack.Screen
        name="sheet-music/[id]"
        options={{ title: '乐谱', headerBackTitle: '返回', presentation: 'modal' }}
      />
    </Stack>
  );
}
