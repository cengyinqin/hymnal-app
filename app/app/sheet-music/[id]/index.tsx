import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useDataStore } from '../../../src/store/useDataStore';
import { getSheetMusicUrl } from '../../../src/lib/sheetMusic';
import { colors, spacing } from '../../../src/theme';

export default function SheetMusicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getPoem = useDataStore(s => s.getPoem);
  const poem = getPoem(id || '');
  const { width, height } = useWindowDimensions();

  const url = poem ? getSheetMusicUrl(poem) : null;

  if (!url) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>暂无乐谱</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: poem?.title || '乐谱' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={5}
        minimumZoomScale={1}
        bouncesZoom
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: url }}
          style={{ width: width, height: height * 0.85 }}
          contentFit="contain"
          transition={200}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
