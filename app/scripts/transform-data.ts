/**
 * Transforms raw scraper output into cleaned, minified app bundles.
 * Run: npx tsx scripts/transform-data.ts
 */
import fs from 'fs';
import path from 'path';

const SCRAPER_OUTPUT = path.resolve(__dirname, '../../scraper/output');
const ASSETS_DATA = path.resolve(__dirname, '../assets/data');

interface RawPoem {
  id: string;
  collectionSlug: string;
  number: number;
  numberDisplay: string;
  title: string;
  titleEn?: string;
  category?: string;
  lyrics: { verses: RawVerse[]; hasChorus: boolean };
  keySignature?: string;
  timeSignature?: string;
  author?: string;
  composer?: string;
  meter?: string;
  sheetMusicPath?: string;
  sortOrder: number;
}

interface RawVerse {
  verseNumber: number;
  verseLabel: string;
  lines: string[];
  isChorus: boolean;
}

interface CleanedVerse {
  verseNumber: number;
  verseLabel: string;
  lines: string[];
  isChorus: boolean;
}

// ─── Cleaning ────────────────────────────────────────────

const JS_NOISE = /^(box|go_hymn_box)\(.*\)\s*;?\s*$/;
const HEADER_PATTERNS = [
  /^大本,#\d+.*/, /^补充本?,?#?\d+.*/, /^新歌,#\d+.*/,
  /^标语,#\d+.*/, /^儿童,#\d+.*/, /^新诗,#\d+.*/,
];
const DATE_STAMP = /20\d{2}\.\d{1,2}\.\d{1,2}/;
const NAV_PATTERNS = [
  /首页.*丨.*转到.*丨.*上一首.*丨.*下一首/,
  /首页\|\s*上一首\|\s*下一首/,
  /首页\| 转到\| 上一首\| 下一首/,
];
const METADATA_INLINE = /^[ETR]\d+\s/;
const VERSE_INDEX_ONLY = /^[\s一二三四五六七八九十]+$/u;
const TRAILING_VERSE_NUMBERS = /[  ]*[一二三四五六七八九十]+\s*[一二三四五六七八九十\s]*$/u;

function isNoiseLine(line: string): boolean {
  const s = line.trim();
  if (!s || s.length <= 2) return true;
  if (JS_NOISE.test(s)) return true;
  if (DATE_STAMP.test(s) && s.length <= 15) return true;
  if (METADATA_INLINE.test(s) && s.length < 40) return true;
  if (VERSE_INDEX_ONLY.test(s)) return true;
  for (const p of HEADER_PATTERNS) {
    if (p.test(s)) return true;
  }
  for (const p of NAV_PATTERNS) {
    if (p.test(s)) return true;
  }
  return false;
}

function cleanLine(line: string): string {
  let s = line;
  s = s.replace(TRAILING_VERSE_NUMBERS, '').trim();
  s = s.replace(/[丨|]\s*$/, '').trim();
  s = s.replace(DATE_STAMP, '').trim();
  return s;
}

function cleanVerses(raw: RawVerse[]): CleanedVerse[] {
  return raw
    .filter(v => v.verseLabel !== 'hymn') // Remove pseudo-verse
    .map(v => ({
      ...v,
      lines: v.lines
        .map(cleanLine)
        .filter(l => !isNoiseLine(l)),
    }))
    .filter(v => v.lines.length > 0);
}

// ─── Pinyin (simple) ─────────────────────────────────────

const PINYIN_MAP: Record<string, string> = {};
// Basic pinyin map built from common title characters
function buildPinyinMap() {
  const map = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则取任处据南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严';

  // Simple tone-marked pinyin mapping (partial - focused on hymn title vocabulary)
  const words: [string, string][] = [
    ['颂赞', 'songzan'], ['三一神', 'sanyishen'], ['敬拜', 'jingbai'], ['父', 'fu'],
    ['赞美', 'zanmei'], ['经历', 'jingli'], ['基督', 'jidu'], ['教会', 'jiaohui'],
    ['福音', 'fuyin'], ['祷告', 'daogao'], ['圣灵', 'shengling'], ['生命', 'shengming'],
    ['爱', 'ai'], ['主', 'zhu'], ['神', 'shen'], ['诗歌', 'shige'],
    ['英文', 'yingwen'], ['大本', 'daben'], ['补充', 'buchong'], ['儿童', 'ertong'],
    ['新歌', 'xinge'], ['新诗', 'xinshi'], ['标语', 'biaoyu'], ['颂咏', 'songyong'],
    ['和平', 'heping'], ['恩典', 'endian'], ['救赎', 'jiushu'], ['十架', 'shijia'],
    ['复活', 'fuhuo'], ['荣耀', 'rongyao'], ['盼望', 'panwang'], ['信心', 'xinxin'],
    ['真理', 'zhenli'], ['道路', 'daolu'], ['光明', 'guangming'], ['平安', 'pingan'],
    ['喜乐', 'xile'], ['感恩', 'ganen'], ['奉献', 'fengxian'], ['跟随', 'gensui'],
    ['见证', 'jianzheng'], ['国度', 'guodu'], ['建造', 'jianzao'], ['合一', 'heyi'],
    ['祝福', 'zhufu'], ['盼望', 'panwang'], ['安慰', 'anwei'], ['引领', 'yinling'],
    ['同在', 'tongzai'], ['宝血', 'baoxue'], ['羔羊', 'gaoyang'], ['新郎', 'xinlang'],
    ['新妇', 'xinfu'], ['永远', 'yongyuan'], ['圣别', 'shengbie'], ['变化', 'bianhua'],
    ['天', 'tian'], ['地', 'di'], ['光', 'guang'], ['水', 'shui'],
    ['火', 'huo'], ['风', 'feng'], ['家', 'jia'], ['新', 'xin'],
    ['旧', 'jiu'], ['大', 'da'], ['小', 'xiao'], ['高', 'gao'],
    ['深', 'shen'], ['约', 'yue'], ['血', 'xue'], ['灵', 'ling'],
    ['祭坛', 'jitan'], ['祭司', 'jisi'], ['圣所', 'shengsuo'], ['至圣', 'zhisheng'],
  ];

  for (const [cn, py] of words) {
    PINYIN_MAP[cn] = py;
  }
}

function toPinyin(text: string): string {
  let result = text;
  // Sort by length descending to match longer phrases first
  const entries = Object.entries(PINYIN_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [cn, py] of entries) {
    result = result.split(cn).join(' ' + py + ' ');
  }
  // Remove remaining Chinese characters
  result = result.replace(/[一-鿿]+/g, '');
  return result.replace(/\s+/g, ' ').trim().toLowerCase();
}

// ─── Main transform ──────────────────────────────────────

function transform() {
  buildPinyinMap();

  if (!fs.existsSync(ASSETS_DATA)) {
    fs.mkdirSync(ASSETS_DATA, { recursive: true });
  }

  const slugs = ['da', 'bu', 'en', 'er', 'xin', 'csr', 'by'];

  const collections: Record<string, unknown> = {};
  const allPoems: Record<string, unknown>[] = [];
  const searchIndex: Record<string, unknown>[] = [];

  for (const slug of slugs) {
    const poemsPath = path.join(SCRAPER_OUTPUT, `${slug}-poems.json`);
    const categoriesPath = path.join(SCRAPER_OUTPUT, `${slug}-categories.json`);
    const collectionPath = path.join(SCRAPER_OUTPUT, `${slug}-collection.json`);

    if (!fs.existsSync(poemsPath)) {
      console.warn(`Skip ${slug}: no poems file`);
      continue;
    }

    const rawPoems: RawPoem[] = JSON.parse(fs.readFileSync(poemsPath, 'utf-8'));
    const categories = fs.existsSync(categoriesPath)
      ? JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))
      : [];
    const colMeta = fs.existsSync(collectionPath)
      ? JSON.parse(fs.readFileSync(collectionPath, 'utf-8'))
      : {};

    // Clean poems
    const cleanedPoems = rawPoems.map(p => ({
      ...p,
      lyrics: {
        verses: cleanVerses(p.lyrics?.verses || []),
        hasChorus: p.lyrics?.hasChorus || false,
      },
    }));

    // Ensure category has poemIds
    const catMap = new Map<string, string[]>();
    for (const c of categories) {
      if (c.poemIds && c.poemIds.length > 0) {
        catMap.set(c.name, c.poemIds);
      }
    }
    // Build from poem data if categories are empty
    if (catMap.size === 0) {
      for (const p of cleanedPoems) {
        const cat = p.category || '未分类';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(p.id);
      }
    }

    const categoriesOut = Array.from(catMap.entries()).map(([name, poemIds], i) => ({
      name,
      poemIds,
      sortOrder: i + 1,
    }));

    collections[slug] = {
      slug,
      name: colMeta.name || slug,
      language: colMeta.language || 'zh-CN',
      totalCount: cleanedPoems.length,
      categoryCount: categoriesOut.length,
      categories: categoriesOut,
    };

    allPoems.push(...cleanedPoems);

    // Build search index
    for (const p of cleanedPoems) {
      const allText = p.lyrics.verses
        .flatMap(v => v.lines)
        .join(' ');
      searchIndex.push({
        poemId: p.id,
        collectionSlug: p.collectionSlug,
        number: p.number,
        numberDisplay: p.numberDisplay,
        title: p.title,
        titlePinyin: toPinyin(p.title),
        searchText: `${p.title} ${allText}`.toLowerCase(),
        category: p.category || '',
      });
    }

    console.log(`[${slug}] ${cleanedPoems.length} poems, ${categoriesOut.length} categories`);
  }

  // Write output
  fs.writeFileSync(path.join(ASSETS_DATA, 'collections.json'), JSON.stringify(collections), 'utf-8');
  fs.writeFileSync(path.join(ASSETS_DATA, 'poems.min.json'), JSON.stringify(allPoems), 'utf-8');
  fs.writeFileSync(path.join(ASSETS_DATA, 'search-index.json'), JSON.stringify(searchIndex), 'utf-8');

  const totalKB = (JSON.stringify(allPoems).length + JSON.stringify(collections).length + JSON.stringify(searchIndex).length) / 1024;
  console.log(`\nDone: ${allPoems.length} poems, ${Object.keys(collections).length} collections, ${searchIndex.length} search entries`);
  console.log(`Output: ${totalKB.toFixed(0)}KB total`);
}

transform();
