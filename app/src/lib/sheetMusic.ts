import { SHEET_MUSIC_BASE } from '../constants';
import type { Poem } from '../types';

export function getSheetMusicUrl(poem: Poem): string | null {
  if (!poem.sheetMusicPath) return null;
  return `${SHEET_MUSIC_BASE}${poem.sheetMusicPath}`;
}
