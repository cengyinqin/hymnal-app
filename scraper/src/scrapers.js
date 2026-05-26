import { fetchPage, saveJSON, loadJSON, normalizeLyricsText, chineseToNumber } from './utils.js';
import { COLLECTIONS } from './types.js';

const CONCURRENCY = 4;

// ─── Helpers ───────────────────────────────────────────────

const NOISE_PATTERNS = [
  /^首页/, /^转到/, /^上一首/, /^下一首/, /^诗歌目录/, /^诗歌首句索引/,
  /^大本诗歌/, /^补充本?诗歌/, /^儿童诗歌/, /^新歌颂咏/, /^新诗/,
  /^\d{4}\.\d{2}$/, /^https?:\/\//, /^\(function/, /^\|\s*$/, /^\^*$/,
  /^歌词$/, /^歌谱$/, /^教唱$/, /^带动唱$/, /^相关$/, /^E\d+$/, /^T\d+/, /^R\d+$/,
  /^儿童,#/, /^var /, /^document\./, /^window\./,
  /^[a-z_]+\(.*\)\s*;?\s*$/, /^go_hymn_/, /^box\(/, /^#\d+/, /^\d+[丨|]\s*$/,
  /^[A-Z]\d+\s/, /^新歌,/, /^标语,/, /^补充本?,/,
  /^[一二三四五六七八九十]\s+[一二三四五六七八九十]\s+[一二三四五六七八九十]/,
  /^\d{4}\.\d{2}$/,
];

function isNoise(line) {
  const s = line.trim();
  if (!s || s.length <= 1) return true;
  for (const p of NOISE_PATTERNS) {
    if (p.test(s)) return true;
  }
  if (/^(首页|转到|上一首|下一首)[/\s]/.test(s)) return true;
  if (/^[\d\s一二三四五六七八九十、,\s]+$/.test(s) && s.length < 12) return true;
  return false;
}

function cleanText(text) {
  return text.split('\n').map(l => l.trim()).filter(l => !isNoise(l)).join('\n').trim();
}

// Parse "#N" from link text
function parseHashNum(text) {
  const m = text.match(/^#(\d+[a-z]?)/);
  return m ? m[1] : null;
}

// Parse verses from body text with _一_ / _二_ markers
function parseVerses(text) {
  const cleaned = cleanText(text);
  const parts = cleaned.split(/_(.{1,4})_\s*\n?/);
  const verses = [];
  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i].trim();
    const content = parts[i + 1] || '';
    const vNum = chineseToNumber(label) || Math.ceil(i / 2);
    const isChorus = /副|Chorus/i.test(label);
    const lines = normalizeLyricsText(content);
    // Filter: require at least 3 meaningful lines per verse to avoid script/header noise
    const meaningful = lines.filter(l => l.length > 3 && !/^[a-z_]+\(\)/.test(l) && !/^\w+,\s*#/.test(l));
    if (meaningful.length >= 2 || (lines.length >= 3 && meaningful.length >= 2)) {
      verses.push({ verseNumber: vNum, verseLabel: label, lines: meaningful.length >= lines.length * 0.5 ? lines : meaningful, isChorus: !!isChorus });
    }
  }
  return verses;
}

// Parse "一、" "二、" style verses
function parseVersesCN(text) {
  const cleaned = cleanText(text);
  const parts = cleaned.split(/([一二三四五六七八九十]{1,3})[、，]\s*/);
  const verses = [];
  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i].trim();
    const content = parts[i + 1] || '';
    const vNum = chineseToNumber(label) || Math.ceil(i / 2);
    const lines = normalizeLyricsText(content);
    if (lines.length >= 2) {
      verses.push({ verseNumber: vNum, verseLabel: label, lines, isChorus: false });
    }
  }
  return verses;
}

// Parse English numbered verses
function parseVersesEn(text) {
  const verses = [];
  const lines = text.split('\n');
  let currentV = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (currentV) currentV.lines.push('');
      continue;
    }
    // Match "N. text" or "N" on its own line
    let vm = line.match(/^(\d{1,2})\.\s+(.*)/);
    if (!vm) vm = line.match(/^(\d{1,2})$/);
    if (vm) {
      if (currentV && currentV.lines.length > 0) verses.push(currentV);
      currentV = { verseNumber: parseInt(vm[1]), verseLabel: vm[1], lines: [], isChorus: false };
      if (vm[2]) currentV.lines.push(vm[2]);
      continue;
    }
    if (isNoise(line)) continue;
    if (currentV) currentV.lines.push(line);
  }
  if (currentV && currentV.lines.length > 0) verses.push(currentV);
  return verses.map(v => {
    while (v.lines.length && !v.lines[v.lines.length - 1]) v.lines.pop();
    return v;
  });
}

// ─── HTML parsing helpers ─────────────────────────────────

/**
 * Parse a single <div id=con> entry.
 * Structure: <div id=con><a name="N"></a><a href="#top">^</a> TITLE <a id=linkfont href="path">#N</a></div>
 * Returns { title, href, numberDisplay, number } or null.
 */
function parseConEntry($, el) {
  const $el = $(el);
  // Find the poem link FIRST (before removing anything)
  // Look for a[id=linkfont], fallback to last a[href] that looks like a poem link
  let poemLink = $el.find('a[id=linkfont]');
  if (poemLink.length === 0) {
    // Fallback: find last <a> with an href that points to a poem page
    const allLinks = $el.find('a[href]');
    poemLink = allLinks.last();
  }
  const href = poemLink.attr('href');
  const hashNum = poemLink.text().trim();
  const num = parseHashNum(hashNum);

  if (!href || !num) return null;

  // Now get title from text nodes (everything except the links)
  const clone = $el.clone();
  clone.find('a').remove();
  const title = clone.text().trim();

  if (!title) return null;
  return { title, href, numberDisplay: num, number: parseInt(num) };
}

/**
 * Parse <div id=con> entries from index pages (bu, er, xin patterns).
 */
function parseDivConEntries($) {
  const entries = [];
  $('div[id=con]').each((_, el) => {
    const entry = parseConEntry($, el);
    if (entry) entries.push(entry);
  });
  return entries;
}

/**
 * Parse category headers from index pages.
 * Pattern: <div id=titleback><a id=titlefont href="...">CategoryName</a></div>
 * OR: <li><a href="...">CategoryName</a></li>
 */
function parseCategoriesFromIndex($, excludeNames = []) {
  const cats = [];
  // Method 1: titleback divs with titlefont links (section headers)
  $('div[id=titleback] a[id=titlefont]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && !excludeNames.includes(text) && !cats.find(c => c.name === text)) {
      cats.push({ name: text, poemIds: [], sortOrder: cats.length + 1 });
    }
  });
  // Method 2: li entries in href div
  $('div[id=href] li a').each((_, el) => {
    const text = $(el).text().trim();
    if (text && !cats.find(c => c.name === text)) {
      cats.push({ name: text, poemIds: [], sortOrder: cats.length + 1 });
    }
  });
  return cats;
}

/**
 * Parse range pages for da collection.
 * Get all poem links from a range page like da001-049.htm.
 */
function parseRangeLinks($) {
  const links = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && /^(da|daf)\d+\.htm$/.test(href)) {
      const dm = href.match(/^(daf?)(\d+)\.htm$/);
      if (dm) {
        const num = parseInt(dm[2]);
        links.push({
          href,
          number: num,
          numberDisplay: dm[1] === 'daf' ? `附${dm[2]}` : dm[2],
          isAppendix: dm[1] === 'daf',
        });
      }
    }
  });
  return links;
}

// ─── Metadata extraction from poem pages ──────────────────

function extractMeta(bodyText, html) {
  let keySignature = '', timeSignature = '', author = '', composer = '';
  const mm = bodyText.match(/([A-G][#b]?\s*(?:大调|小调|major|minor))\s*(\d+\/\d+)/i);
  if (mm) { keySignature = mm[1]; timeSignature = mm[2]; }
  const am = bodyText.match(/(?:词|Lyrics?)[：:\s]+([^\n]+)/i);
  if (am) author = am[1].trim().substring(0, 100);
  const cm = bodyText.match(/(?:曲|Music)[：:\s]+([^\n]+)/i);
  if (cm) composer = cm[1].trim().substring(0, 100);
  return { keySignature, timeSignature, author, composer };
}

function extractSheetMusic(html, slug) {
  const patterns = [
    new RegExp(`/static/sg/${slug}/[^"'\\s]+\\.(?:jpg|png|jpeg)`, 'i'),
    new RegExp(`/static/sg/[a-z]+/[^"'\\s]+\\.(?:jpg|png|jpeg)`, 'i'),
    /\/static\/sg\/[^"'\s]+\.(?:jpg|png|jpeg)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[0];
  }
  return '';
}

// ─── DA: 大本诗歌 ──────────────────────────────────────────

export async function scrapeDA() {
  const cfg = COLLECTIONS.da;
  const base = cfg.baseUrl;
  const cf = 'da-collection.json';
  const cached = loadJSON(cf);
  if (cached) { console.log(`[da] cached ${cached.poems.length}`); return cached; }

  console.log('[da] Fetching index...');
  const $ = await fetchPage(`${base}/daindex.htm`);

  // Parse range page links
  const rangeLinks = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && /da\/da\d+-\d+\.htm/.test(href)) {
      rangeLinks.push(href);
    }
  });
  // Add appendix range
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && /da\/daf\d+-\d+\.htm/.test(href)) {
      rangeLinks.push(href);
    }
  });

  // Parse categories
  const categories = parseCategoriesFromIndex($, ['大本诗歌', '诗歌首句索引']);

  // If categories found from index menu links, use those instead
  if (categories.length === 0) {
    // Get from the href links in the first-line index section
    $('div[id=href] a').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text !== '^' && !text.match(/^_/)) {
        if (!categories.find(c => c.name === text)) {
          categories.push({ name: text, poemIds: [], sortOrder: categories.length + 1 });
        }
      }
    });
  }

  // Map poem number ranges to categories
  // 大本 categories and their approximate ranges
  const catRanges = [
    { name: '颂赞三一神', start: 1, end: 7 },
    { name: '敬拜父', start: 8, end: 57 },
    { name: '赞美主', start: 58, end: 167 },
    { name: '圣灵的丰满', start: 168, end: 228 },
    { name: '得救的证实与快乐', start: 229, end: 269 },
    { name: '羡慕', start: 270, end: 331 },
    { name: '奉献', start: 332, end: 360 },
    { name: '与基督的联合', start: 361, end: 383 },
    { name: '经历基督', start: 384, end: 400 },
    { name: '经历神', start: 401, end: 424 },
    { name: '十字架的夸耀', start: 425, end: 454 },
    { name: '十字架的道路', start: 455, end: 470 },
    { name: '复活的生命', start: 471, end: 479 },
    { name: '鼓励', start: 480, end: 514 },
    { name: '试炼中的安慰', start: 515, end: 539 },
    { name: '里面生命的各方面', start: 540, end: 592 },
    { name: '神医', start: 593, end: 603 },
    { name: '祷告', start: 604, end: 615 },
    { name: '读经', start: 616, end: 622 },
    { name: '召会', start: 623, end: 637 },
    { name: '聚会', start: 638, end: 646 },
    { name: '属灵的争战', start: 647, end: 662 },
    { name: '事奉', start: 663, end: 679 },
    { name: '传扬福音', start: 680, end: 706 },
    { name: '福音', start: 707, end: 733 },
    { name: '受浸', start: 734, end: 742 },
    { name: '国度', start: 743, end: 760 },
    { name: '荣耀的盼望', start: 761, end: 768 },
    { name: '终极的显出', start: 769, end: 780 },
  ];

  if (rangeLinks.length === 0) {
    console.log('[da] No range links found, trying direct approach...');
    // Fallback: generate range links from known pattern
    const ranges = [
      'da/da001-049.htm', 'da/da050-099.htm', 'da/da100-149.htm', 'da/da150-199.htm',
      'da/da200-249.htm', 'da/da250-299.htm', 'da/da300-349.htm', 'da/da350-399.htm',
      'da/da400-449.htm', 'da/da450-499.htm', 'da/da500-549.htm', 'da/da550-599.htm',
      'da/da600-649.htm', 'da/da650-699.htm', 'da/da700-749.htm', 'da/da750-780.htm',
      'da/daf1-6.htm',
    ];
    rangeLinks.push(...ranges);
  }

  console.log(`[da] ${rangeLinks.length} range pages`);

  // Crawl all range pages to collect poem links
  const allLinks = [];
  const seenHrefs = new Set();
  for (const range of rangeLinks) {
    try {
      const r$ = await fetchPage(`${base}/${range}`);
      const links = parseRangeLinks(r$);
      for (const l of links) {
        if (!seenHrefs.has(l.href)) {
          seenHrefs.add(l.href);
          allLinks.push(l);
        }
      }
      console.log(`[da] Range ${range}: ${links.length} links, total ${allLinks.length}`);
    } catch (err) {
      console.error(`[da] Err range ${range}: ${err.message}`);
    }
  }

  // Assign categories based on number ranges
  for (const link of allLinks) {
    if (!link.isAppendix) {
      const cat = catRanges.find(c => link.number >= c.start && link.number <= c.end);
      link.category = cat ? cat.name : '未分类';
    } else {
      link.category = '附';
    }
    link.title = ''; // Will be filled from detail page
  }

  // Update categories to match catRanges
  const finalCats = catRanges.filter(c => allLinks.some(l => l.number >= c.start && l.number <= c.end));
  finalCats.push({ name: '附', poemIds: [], sortOrder: finalCats.length + 1 });
  for (const c of finalCats) c.poemIds = [];

  console.log(`[da] Total poems: ${allLinks.length}`);

  // Scrape each poem
  const poems = [];
  for (let i = 0; i < allLinks.length; i++) {
    try {
      const p = await scrapeDaPoem(base, allLinks[i]);
      poems.push(p);
      if ((i + 1) % 50 === 0) {
        console.log(`[da] ${i + 1}/${allLinks.length}`);
        saveJSON(cf, { slug: cfg.slug, name: cfg.name, language: cfg.language, totalCount: poems.length, categories: finalCats, poems });
      }
    } catch (err) {
      console.error(`[da] Err #${allLinks[i].number}: ${err.message}`);
    }
  }

  // Map poems to categories
  for (const cat of finalCats) {
    cat.poemIds = poems.filter(p => p.category === cat.name).map(p => p.id);
  }
  const result = { slug: cfg.slug, name: cfg.name, language: cfg.language, totalCount: poems.length, categories: finalCats.filter(c => c.poemIds.length > 0), poems };
  saveJSON(cf, result);
  return result;
}

async function scrapeDaPoem(base, link) {
  // Range page links are relative (e.g., "da001.htm" or "da2.htm" from da/da001-049.htm)
  // Strip leading zeros from the numeric part: da001.htm → da1.htm
  let href = link.href;
  href = href.replace(/^(daf?)0+(\d+\.htm)$/, '$1$2');
  const poemPath = href.includes('/') ? href : `da/${href}`;
  const $ = await fetchPage(`${base}/${poemPath}`);
  const body = $('body').text();
  const html = $('body').html() || '';

  // Title from page: "大本诗歌第1首丨颂赞三一神——祂的计划"
  let title = '';
  const tm = $('title').text().match(/大本诗歌第\d+首[丨|\s]+(.+)/);
  if (tm) title = tm[1].trim();
  else {
    // Try body text
    const bm = body.match(/大本诗歌第\d+首[丨|\s]+(.+)/);
    if (bm) title = bm[1].trim().split('\n')[0];
  }
  if (!title) title = link.title || `第${link.number}首`;

  const verses = parseVerses(body);
  const meta = extractMeta(body, html);
  const sheetMusicPath = extractSheetMusic(html, 'da');

  return {
    id: `da-${link.number}`, collectionSlug: 'da', number: link.number,
    numberDisplay: link.numberDisplay, title, category: link.category,
    lyrics: { verses, hasChorus: verses.some(v => v.isChorus) },
    ...meta, sheetMusicPath, sortOrder: link.number,
  };
}

// ─── BU: 补充诗歌 ──────────────────────────────────────────

export async function scrapeBU() {
  const cfg = COLLECTIONS.bu;
  const base = cfg.baseUrl;
  const cf = 'bu-collection.json';
  const cached = loadJSON(cf);
  if (cached) { console.log(`[bu] cached ${cached.poems.length}`); return cached; }

  console.log('[bu] Fetching index...');
  const $ = await fetchPage(`${base}/buindex.htm`);

  // Parse categories from section headers
  const categories = [];
  const catExclude = ['补充本诗歌', '补充本诗歌目录'];
  $('div[id=titleback] a[id=titlefont]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && !catExclude.includes(text)) {
      categories.push({ name: text, poemIds: [], sortOrder: categories.length + 1 });
    }
  });

  // Parse <div id=con> entries: title is text node, link is #N
  const entries = parseDivConEntries($);
  // Assign categories based on section ordering (buindex has sections with categories then div#con entries)

  // Re-parse with category tracking by reading div#con within each section
  let currentCat = null;
  const poemLinks = [];

  $('body').children().each((_, el) => {
    const tag = ($(el).prop('tagName') || '').toLowerCase();
    const id = $(el).attr('id');
    const cls = $(el).attr('class');

    // Category header
    if (tag === 'div' && id === 'titleback') {
      const linkText = $(el).find('a[id=titlefont]').text().trim();
      if (linkText && linkText !== '补充本诗歌' && linkText !== '补充本诗歌目录') {
        currentCat = linkText;
      }
    }

    // Poem entry
    if (tag === 'div' && id === 'con') {
      const entry = parseConEntry($, el);
      if (entry) {
        poemLinks.push({ ...entry, category: currentCat || '未分类' });
      }
    }
  });

  const seen = new Set();
  const unique = poemLinks.filter(p => { if (seen.has(p.number)) return false; seen.add(p.number); return true; });
  console.log(`[bu] ${unique.length} poems, ${categories.length} categories`);

  const poems = [];
  for (let i = 0; i < unique.length; i++) {
    try {
      const p = await scrapeBuPoem(base, unique[i]);
      poems.push(p);
      if ((i + 1) % 30 === 0) { console.log(`[bu] ${i + 1}/${unique.length}`); saveJSON(cf, buildResult(cfg, poems, categories)); }
    } catch (err) { console.error(`[bu] Err #${unique[i].number}: ${err.message}`); }
  }

  assignCats(poems, categories);
  const result = buildResult(cfg, poems, categories);
  saveJSON(cf, result);
  return result;
}

async function scrapeBuPoem(base, link) {
  const $ = await fetchPage(`${base}/${link.href}`);
  const body = $('body').text();
  const html = $('body').html() || '';

  let title = link.title;
  const tm = body.match(/补充本?诗歌?第?\d+首[丨|\s]+(.+)/);
  if (tm) title = tm[1].trim().split('\n')[0];

  const verses = parseVerses(body);
  const meta = extractMeta(body, html);
  const sheetMusicPath = extractSheetMusic(html, 'bu');

  return {
    id: `bu-${link.number}`, collectionSlug: 'bu', number: link.number,
    numberDisplay: link.numberDisplay, title, category: link.category,
    lyrics: { verses, hasChorus: verses.some(v => v.isChorus) },
    ...meta, sheetMusicPath, sortOrder: link.number,
  };
}

// ─── EN: 英文诗歌 ──────────────────────────────────────────

export async function scrapeEN() {
  const cfg = COLLECTIONS.en;
  const base = cfg.baseUrl;
  const cf = 'en-collection.json';
  const cached = loadJSON(cf);
  if (cached) { console.log(`[en] cached ${cached.poems.length}`); return cached; }

  console.log('[en] Fetching index...');
  const $ = await fetchPage(`${base}/a.htm`);

  const rangeLinks = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && /numlinks\/\d+\.htm/.test(href)) {
      const m = href.match(/numlinks\/(\d+)\.htm/);
      if (m) rangeLinks.push({ href, start: parseInt(m[1]) });
    }
  });
  rangeLinks.sort((a, b) => a.start - b.start);
  console.log(`[en] ${rangeLinks.length} range pages`);

  const allLinks = [];
  const seenNums = new Set();
  for (const r of rangeLinks) {
    try {
      const r$ = await fetchPage(`${base}/${r.href}`);
      r$('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && /hymns\/\d+\.htm/.test(href)) {
          const m = href.match(/hymns\/(\d+)\.htm/);
          if (m) {
            const num = parseInt(m[1]);
            if (!seenNums.has(num)) {
              seenNums.add(num);
              allLinks.push({ number: num, href: href.startsWith('../') ? href.slice(3) : `hymns/${num}.htm` });
            }
          }
        }
      });
      console.log(`[en] Range ${r.start}: total ${allLinks.length}`);
    } catch (err) { console.error(`[en] Err range ${r.start}: ${err.message}`); }
  }
  allLinks.sort((a, b) => a.number - b.number);
  console.log(`[en] ${allLinks.length} total`);

  const poems = [];
  for (let i = 0; i < allLinks.length; i++) {
    try {
      const p = await scrapeEnPoem(base, allLinks[i]);
      poems.push(p);
      if ((i + 1) % 100 === 0) { console.log(`[en] ${i + 1}/${allLinks.length}`); saveJSON(cf, buildResult(cfg, poems, [])); }
    } catch (err) { console.error(`[en] Err #${allLinks[i].number}: ${err.message}`); }
  }

  const result = buildResult(cfg, poems, []);
  saveJSON(cf, result);
  return result;
}

async function scrapeEnPoem(base, link) {
  const $ = await fetchPage(`${base}/${link.href}`);

  // Parse title from <title> tag
  let title = $('title').text().trim();
  if (/^Hymn\s*\d+$/i.test(title)) {
    // Try to find subtitle after "Hymns, #N"
    const bodyText = $('body').text();
    const subMatch = bodyText.match(/Hymns?,\s*#\d+\s*\n\s*(.+)/i);
    if (subMatch) title = subMatch[1].trim().split('\n')[0];
    else title = title.replace(/^Hymn\s*/i, '').trim();
  }
  if (!title || /^\d+$/.test(title)) title = `Hymn ${link.number}`;

  // Parse verses from DOM: <a class=br name=N> followed by <div class=verse>
  const verses = [];
  $('div[class=verse]').each((_, el) => {
    // Find preceding <a class=br> to get verse number
    let num = null;
    const prev = $(el).prev('a[class=br]');
    if (prev.length) {
      const n = parseInt(prev.attr('name'));
      if (!isNaN(n)) num = n;
    }

    const lines = [];
    $(el).find('p').each((_, p) => {
      // Extract line text, excluding the verse number link text
      let line = '';
      $(p).contents().each((_, node) => {
        if (node.type === 'text') {
          line += $(node).text();
        }
      });
      line = line.trim();
      // Also try .text() minus the greenbox link text
      if (!line || line.length < 2) {
        const full = $(p).text().trim();
        const gb = $(p).find('a[class=greenbox]').text().trim();
        line = full.replace(gb, '').trim();
      }
      if (line && line.length >= 2 && !/^\d+$/.test(line)) {
        lines.push(line);
      }
    });

    if (lines.length > 0) {
      const vNum = num || verses.length + 1;
      verses.push({ verseNumber: vNum, verseLabel: String(vNum), lines, isChorus: false });
    }
  });

  // Fallback: try text-based parsing
  if (verses.length === 0) {
    const body = $('body').text();
    const v2 = parseVersesEn(body);
    verses.push(...v2);
  }

  // Metadata
  const body = $('body').text();
  let author = '', composer = '', meter = '';
  const am = body.match(/Lyrics?:?\s*(.+)/i);
  if (am) author = am[1].trim().substring(0, 120);
  const cm = body.match(/Music:?\s*(.+)/i);
  if (cm) composer = cm[1].trim().substring(0, 120);
  const mm = body.match(/Meter:?\s*(.+)/i);
  if (mm) meter = mm[1].trim();

  return {
    id: `en-${link.number}`, collectionSlug: 'en', number: link.number,
    numberDisplay: String(link.number), title, titleEn: title,
    lyrics: { verses, hasChorus: false },
    author, composer, meter, sortOrder: link.number,
  };
}

// ─── ER: 儿童诗歌 ──────────────────────────────────────────

export async function scrapeER() {
  const cfg = COLLECTIONS.er;
  const base = cfg.baseUrl;
  const cf = 'er-collection.json';
  const cached = loadJSON(cf);
  if (cached) { console.log(`[er] cached ${cached.poems.length}`); return cached; }

  console.log('[er] Fetching index...');
  const $ = await fetchPage(`${base}/erindex.htm`);

  // Parse with section tracking
  let currentCat = null;
  const poemLinks = [];
  const categories = [];

  $('body').children().each((_, el) => {
    const tag = ($(el).prop('tagName') || '').toLowerCase();
    const id = $(el).attr('id');

    // Category section header
    if (tag === 'div' && id === 'titleback') {
      const linkText = $(el).find('a[id=titlefont]').text().trim();
      if (linkText && linkText !== '儿童诗歌' && linkText !== '儿童诗歌目录') {
        currentCat = linkText;
        if (!categories.find(c => c.name === currentCat)) {
          categories.push({ name: currentCat, poemIds: [], sortOrder: categories.length + 1 });
        }
      }
    }

    // Poem entry
    if (tag === 'div' && id === 'con') {
      const entry = parseConEntry($, el);
      if (entry) {
        poemLinks.push({ ...entry, category: currentCat || '未分类' });
      }
    }
  });

  // If no div#con found, try direct link parsing (erindex may use different structure)
  if (poemLinks.length === 0) {
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && /^er\/er\d+\.htm$/.test(href) && text && text !== '^') {
        const m = href.match(/er\/er(\d+)\.htm/);
        if (m) {
          poemLinks.push({ title: text, href, numberDisplay: m[1], number: parseInt(m[1]), category: currentCat || '未分类' });
        }
      }
    });
  }

  // Also parse categories from href list
  if (categories.length === 0) {
    $('div[id=href] li a').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !categories.find(c => c.name === text)) {
        categories.push({ name: text, poemIds: [], sortOrder: categories.length + 1 });
      }
    });
  }

  const seen = new Set();
  const unique = poemLinks.filter(p => { if (seen.has(p.number)) return false; seen.add(p.number); return true; });
  console.log(`[er] ${unique.length} poems, ${categories.length} categories`);

  const poems = [];
  for (let i = 0; i < unique.length; i++) {
    try {
      const p = await scrapeErPoem(base, unique[i]);
      poems.push(p);
      if ((i + 1) % 50 === 0) { console.log(`[er] ${i + 1}/${unique.length}`); saveJSON(cf, buildResult(cfg, poems, categories)); }
    } catch (err) { console.error(`[er] Err #${unique[i].number}: ${err.message}`); }
  }

  assignCats(poems, categories);
  const result = buildResult(cfg, poems, categories);
  saveJSON(cf, result);
  return result;
}

async function scrapeErPoem(base, link) {
  const $ = await fetchPage(`${base}/${link.href}`);
  const body = $('body').text();
  const html = $('body').html() || '';

  let title = link.title;
  const tm = body.match(/儿童诗歌第\d+首\s*(.+)/);
  if (tm && tm[1].trim()) title = tm[1].trim().split('\n')[0];

  let verses = parseVerses(body);
  // Fallback: single block
  if (verses.length === 0) {
    const lyricsLines = body.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !isNoise(l));
    if (lyricsLines.length > 0) {
      verses.push({ verseNumber: 1, verseLabel: '1', lines: lyricsLines, isChorus: false });
    }
  }

  const meta = extractMeta(body, html);
  const sheetMusicPath = extractSheetMusic(html, 'er');

  return {
    id: `er-${link.number}`, collectionSlug: 'er', number: link.number,
    numberDisplay: link.numberDisplay, title, category: link.category,
    lyrics: { verses, hasChorus: false },
    ...meta, sheetMusicPath, sortOrder: link.number,
  };
}

// ─── XIN: 新歌颂咏 ─────────────────────────────────────────

export async function scrapeXIN() {
  const cfg = COLLECTIONS.xin;
  const base = cfg.baseUrl;
  const cf = 'xin-collection.json';
  const cached = loadJSON(cf);
  if (cached) { console.log(`[xin] cached ${cached.poems.length}`); return cached; }

  console.log('[xin] Fetching index...');
  const $ = await fetchPage(`${base}/xinindex.htm`);

  let currentCat = null;
  const poemLinks = [];
  const categories = [];

  $('body').children().each((_, el) => {
    const tag = ($(el).prop('tagName') || '').toLowerCase();
    const id = $(el).attr('id');

    if (tag === 'div' && id === 'titleback') {
      const linkText = $(el).find('a[id=titlefont]').text().trim();
      if (linkText && linkText !== '新歌颂咏' && linkText !== '新歌颂咏目录') {
        currentCat = linkText;
        if (!categories.find(c => c.name === currentCat)) {
          categories.push({ name: currentCat, poemIds: [], sortOrder: categories.length + 1 });
        }
      }
    }

    if (tag === 'div' && id === 'con') {
      const entry = parseConEntry($, el);
      if (entry) {
        poemLinks.push({ ...entry, category: currentCat || '未分类' });
      }
    }
  });

  // If categories empty, try href list
  if (categories.length === 0) {
    $('div[id=href] li a').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !categories.find(c => c.name === text)) {
        categories.push({ name: text, poemIds: [], sortOrder: categories.length + 1 });
      }
    });
  }

  const seen = new Set();
  const unique = poemLinks.filter(p => { if (seen.has(p.number)) return false; seen.add(p.number); return true; });
  console.log(`[xin] ${unique.length} poems, ${categories.length} categories`);

  const poems = [];
  for (let i = 0; i < unique.length; i++) {
    try {
      const p = await scrapeXinPoem(base, unique[i]);
      poems.push(p);
      if ((i + 1) % 30 === 0) { console.log(`[xin] ${i + 1}/${unique.length}`); saveJSON(cf, buildResult(cfg, poems, categories)); }
    } catch (err) { console.error(`[xin] Err #${unique[i].number}: ${err.message}`); }
  }

  assignCats(poems, categories);
  const result = buildResult(cfg, poems, categories);
  saveJSON(cf, result);
  return result;
}

async function scrapeXinPoem(base, link) {
  const $ = await fetchPage(`${base}/${link.href}`);
  const body = $('body').text();
  const html = $('body').html() || '';

  let title = link.title;
  // Extract title from <title> tag first
  const titleTag = $('title').text().trim();
  if (titleTag && titleTag.includes('首')) {
    const m = titleTag.match(/^新歌颂咏第\d+首\s*(.+)/);
    if (m && m[1]) title = m[1].trim();
  }
  // Fallback: title1 div
  if (!title || title === link.title) {
    const t1 = $('#title1').text().trim();
    if (t1) {
      // Remove leading "新歌,#N" prefix
      const clean = t1.replace(/^新歌,?\s*#?\d+\s*/, '').trim();
      if (clean) title = clean;
    }
  }
  if (!title || title === link.title) {
    const tm = body.match(/新歌颂咏第\d+首\s*(.+)/);
    if (tm && tm[1].trim()) title = tm[1].trim().split('\n')[0];
  }

  // Parse verses from DOM: <div id=chap> markers + <div id=con> content
  const verses = [];
  const chapDivs = [];
  $('div[id=chap]').each((_, el) => {
    // Find the label from the <a> within this div
    let label = '';
    const aEl = $(el).find('a[id=white]');
    if (aEl.length) {
      label = aEl.text().trim();
      // Remove surrounding underscores: _一_ -> 一
      label = label.replace(/^_+|_+$/g, '').trim();
    }
    if (!label) {
      const name = $(el).find('a').first().attr('name');
      if (name) {
        const parts = name.split('_');
        if (parts.length >= 2) label = parts.slice(1).join('_');
      }
    }
    chapDivs.push({ el, label });
  });

  $('div[id=con]').each((i, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    const label = i < chapDivs.length ? chapDivs[i].label : String(i + 1);
    const vNum = chineseToNumber(label) || (i + 1);
    const lines = normalizeLyricsText(text);
    const meaningful = lines.filter(l => l.length > 3);
    if (meaningful.length >= 1) {
      verses.push({ verseNumber: vNum, verseLabel: label, lines: meaningful, isChorus: false });
    }
  });

  // Fallback: try text-based parsing
  if (verses.length === 0) {
    const v2 = parseVerses(body);
    verses.push(...v2);
  }

  const sheetMusicPath = extractSheetMusic(html, 'xin');

  return {
    id: `xin-${link.number}`, collectionSlug: 'xin', number: link.number,
    numberDisplay: link.numberDisplay, title, category: link.category,
    lyrics: { verses, hasChorus: false },
    sheetMusicPath, sortOrder: link.number,
  };
}

// ─── CSR: 新诗 ─────────────────────────────────────────────

export async function scrapeCSR() {
  const cfg = COLLECTIONS.csr;
  const base = cfg.baseUrl;
  const cf = 'csr-collection.json';
  const cached = loadJSON(cf);
  if (cached) { console.log(`[csr] cached ${cached.poems.length}`); return cached; }

  console.log('[csr] Fetching index...');
  const $ = await fetchPage(`${base}/csrindex.htm`);

  // CSR: link text is "#N title"
  const poemLinks = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && /^csr\/csr\d+\.htm$/.test(href) && text && text !== '新诗') {
      const mm = href.match(/csr\/csr(\d+)\.htm/);
      if (mm) {
        const title = text.replace(/^#\d+\s*/, '').trim();
        poemLinks.push({
          title: title || text, href, number: parseInt(mm[1]),
          numberDisplay: mm[1], category: '全部',
        });
      }
    }
  });

  console.log(`[csr] ${poemLinks.length} poems`);

  const poems = [];
  for (let i = 0; i < poemLinks.length; i++) {
    try {
      const p = await scrapeCsrPoem(base, poemLinks[i]);
      poems.push(p);
      if ((i + 1) % 30 === 0) { console.log(`[csr] ${i + 1}/${poemLinks.length}`); saveJSON(cf, buildResult(cfg, poems, [])); }
    } catch (err) { console.error(`[csr] Err #${poemLinks[i].number}: ${err.message}`); }
  }

  const result = buildResult(cfg, poems, []);
  saveJSON(cf, result);
  return result;
}

async function scrapeCsrPoem(base, link) {
  const $ = await fetchPage(`${base}/${link.href}`);
  const body = $('body').text();
  const html = $('body').html() || '';

  let title = link.title;
  // Extract title from <title> tag or title1 div
  const titleTag = $('title').text().trim();
  if (titleTag) {
    const m = titleTag.match(/^新诗分享[,，]\s*(.+)/);
    if (m && m[1]) title = m[1].trim();
  }
  if (!title || title === link.title) {
    const t1 = $('#title1').text().trim();
    if (t1) {
      const clean = t1.replace(/^新诗,?\s*#?\d+\s*/, '').trim();
      if (clean) title = clean;
    }
  }

  // Parse verses from DOM: <div id=chap> markers + <div class=con> content
  const verses = [];
  const chapDivs = [];
  $('div[id=chap]').each((_, el) => {
    let label = '';
    const aEl = $(el).find('a[id=white]');
    if (aEl.length) {
      label = aEl.text().trim();
    }
    if (!label) {
      const name = $(el).find('a').first().attr('name');
      if (name) label = name;
    }
    chapDivs.push(label);
  });

  $('div[class=con]').each((i, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    const label = i < chapDivs.length ? chapDivs[i] : String(i + 1);
    const vNum = chineseToNumber(label) || (i + 1);
    const lines = normalizeLyricsText(text);
    const meaningful = lines.filter(l => l.length > 3);
    if (meaningful.length >= 1) {
      verses.push({ verseNumber: vNum, verseLabel: label, lines: meaningful, isChorus: false });
    }
  });

  // Fallback: try text-based parsing
  if (verses.length === 0) {
    const v2 = parseVersesCN(body);
    if (v2.length > 0) verses.push(...v2);
    else {
      const v3 = parseVerses(body);
      verses.push(...v3);
    }
  }

  const sheetMusicPath = extractSheetMusic(html, 'csr') || extractSheetMusic(html, 'by');

  return {
    id: `csr-${link.number}`, collectionSlug: 'csr', number: link.number,
    numberDisplay: link.numberDisplay, title, category: link.category,
    lyrics: { verses, hasChorus: false },
    sheetMusicPath, sortOrder: link.number,
  };
}

// ─── BY: 标语诗歌 ───────────────────────────────────────────

export async function scrapeBY() {
  const cfg = COLLECTIONS.by;
  const base = cfg.baseUrl;
  const cf = 'by-collection.json';
  const cached = loadJSON(cf);
  if (cached) { console.log(`[by] cached ${cached.poems.length}`); return cached; }

  console.log('[by] Fetching index...');
  const $ = await fetchPage(`${base}/byindex.htm`);

  // BY: link text IS the title
  const poemLinks = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && /^by\/by\d+[a-z]?\.htm$/.test(href) && text && text !== '标语诗歌') {
      const m = href.match(/by\/by(\d+[a-z]?)\.htm/);
      if (m) {
        poemLinks.push({
          title: text, href, code: m[1], numberDisplay: m[1],
          number: poemLinks.length + 1, category: '标语',
        });
      }
    }
  });

  console.log(`[by] ${poemLinks.length} entries`);

  const poems = [];
  for (let i = 0; i < poemLinks.length; i++) {
    try {
      const p = await scrapeByPoem(base, poemLinks[i]);
      poems.push(p);
      if ((i + 1) % 15 === 0) console.log(`[by] ${i + 1}/${poemLinks.length}`);
    } catch (err) { console.error(`[by] Err ${poemLinks[i].code}: ${err.message}`); }
  }

  const result = buildResult(cfg, poems, []);
  saveJSON(cf, result);
  return result;
}

async function scrapeByPoem(base, link) {
  const $ = await fetchPage(`${base}/${link.href}`);
  const body = $('body').text();
  const html = $('body').html() || '';

  const verses = [];
  const textLines = body.split('\n').map(l => l.trim()).filter(l => l.length > 10 && !isNoise(l) && !l.startsWith('http'));
  if (textLines.length > 0) {
    verses.push({ verseNumber: 1, verseLabel: '1', lines: textLines, isChorus: false });
  }

  const sheetMusicPath = extractSheetMusic(html, 'by');

  return {
    id: `by-${link.code}`, collectionSlug: 'by', number: link.number,
    numberDisplay: link.numberDisplay, title: link.title, category: link.category,
    lyrics: { verses, hasChorus: false },
    sheetMusicPath, sortOrder: link.number,
  };
}

// ─── Shared utilities ──────────────────────────────────────

function buildResult(cfg, poems, categories) {
  return {
    slug: cfg.slug, name: cfg.name, language: cfg.language,
    totalCount: poems.length,
    categories: categories.filter(c => (c.poemIds || []).length > 0),
    poems,
  };
}

function assignCats(poems, categories) {
  for (const cat of categories) {
    if (!cat.poemIds) cat.poemIds = [];
  }
  for (const poem of poems) {
    if (poem.category && poem.category !== '未分类') {
      const cat = categories.find(c => c.name === poem.category);
      if (cat) {
        cat.poemIds.push(poem.id);
      }
    }
  }
  // Deduplicate
  for (const cat of categories) {
    cat.poemIds = [...new Set(cat.poemIds)];
  }
}

// ─── Master entry ───────────────────────────────────────────

export async function scrapeAll(collections = Object.keys(COLLECTIONS)) {
  const scrapers = {
    da: scrapeDA, bu: scrapeBU, en: scrapeEN,
    er: scrapeER, xin: scrapeXIN, csr: scrapeCSR, by: scrapeBY,
  };

  const results = {};
  for (const slug of collections) {
    if (scrapers[slug]) {
      console.log(`\n=== Scraping: ${COLLECTIONS[slug].name} (${slug}) ===`);
      try {
        results[slug] = await scrapers[slug]();
        console.log(`=== Done: ${slug} - ${results[slug].totalCount} poems ===`);
      } catch (err) {
        console.error(`=== Failed: ${slug} - ${err.message} ===`);
        console.error(err.stack);
      }
    }
  }

  const manifest = {};
  for (const [slug, data] of Object.entries(results)) {
    saveJSON(`${slug}-poems.json`, data.poems);
    saveJSON(`${slug}-categories.json`, data.categories);
    manifest[slug] = {
      name: data.name, language: data.language,
      totalCount: data.totalCount, categoryCount: data.categories?.length || 0,
    };
  }
  saveJSON('manifest.json', manifest);

  return results;
}
