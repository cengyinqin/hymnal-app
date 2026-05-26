import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('output');

// Rate-limited HTTP client
const client = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; HymnalScraper/1.0)',
  },
});

// 500ms delay between requests to be polite
let lastRequestTime = 0;
async function rateLimit() {
  const now = Date.now();
  const wait = Math.max(0, 500 - (now - lastRequestTime));
  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait));
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch a URL and return cheerio-loaded HTML
 */
export async function fetchPage(url, retries = 3) {
  await rateLimit();
  for (let i = 0; i < retries; i++) {
    try {
      const response = await client.get(url);
      const html = typeof response.data === 'string' ? response.data : '';
      return cheerio.load(html);
    } catch (err) {
      // Don't retry 4xx/5xx HTTP errors — those are definitive
      if (err.response && err.response.status >= 400) throw err;
      if (i === retries - 1) throw err;
      console.warn(`  Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

/**
 * Get raw text content from cheerio, properly handling <br> tags
 */
export function getTextWithBreaks($, element) {
  // Clone to avoid mutation
  const clone = $(element).clone();
  // Replace <br> with newlines
  clone.find('br').replaceWith('\n');
  return clone.text().trim();
}

/**
 * Parse Chinese-style verse labels (一, 二, 三, etc.) back to numbers
 */
const CHINESE_NUMBERS = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
};

export function chineseToNumber(label) {
  return CHINESE_NUMBERS[label] || parseInt(label, 10) || null;
}

export function numberToChinese(n) {
  const map = {
    1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
    6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
    11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
    16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十',
  };
  return map[n] || String(n);
}

/**
 * Save JSON data to output directory
 */
export function saveJSON(filename, data) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  Saved: ${filepath} (${JSON.stringify(data).length} bytes)`);
}

/**
 * Load previously saved JSON data
 */
export function loadJSON(filename) {
  const filepath = path.join(OUTPUT_DIR, filename);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  }
  return null;
}

/**
 * Extract links from a cheerio element, optionally filtering by href pattern
 */
export function extractLinks($, selector, hrefPattern = null) {
  const links = [];
  $(selector).each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && (!hrefPattern || hrefPattern.test(href))) {
      links.push({ text, href });
    }
  });
  return links;
}

/**
 * Normalize whitespace in lyrics text
 */
export function normalizeLyricsText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export { OUTPUT_DIR };
