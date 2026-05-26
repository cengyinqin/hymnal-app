// Common types for the hymnal scraper

/**
 * @typedef {Object} Verse
 * @property {number} verseNumber
 * @property {string} verseLabel - e.g. "一", "1", "I"
 * @property {string[]} lines
 * @property {boolean} [isChorus]
 */

/**
 * @typedef {Object} LyricsData
 * @property {Verse[]} verses
 * @property {boolean} hasChorus
 * @property {Verse} [chorus]
 */

/**
 * @typedef {Object} Poem
 * @property {string} id - unique id: "{collectionSlug}-{number}"
 * @property {string} collectionSlug
 * @property {number} number
 * @property {string} numberDisplay
 * @property {string} title
 * @property {string} [titleEn]
 * @property {string} [category]
 * @property {LyricsData} lyrics
 * @property {string} [keySignature]
 * @property {string} [timeSignature]
 * @property {string} [author]
 * @property {string} [composer]
 * @property {string} [tuneNumber]
 * @property {string} [sheetMusicPath]
 * @property {number} [enPoemNumber]
 * @property {number} sortOrder
 */

/**
 * @typedef {Object} Category
 * @property {string} name
 * @property {string[]} poemIds
 * @property {number} sortOrder
 */

/**
 * @typedef {Object} Collection
 * @property {string} slug
 * @property {string} name
 * @property {string} language
 * @property {number} totalCount
 * @property {Category[]} categories
 * @property {Poem[]} poems
 */

export const COLLECTIONS = {
  da: { slug: 'da', name: '大本诗歌', language: 'zh-CN', baseUrl: 'https://logos-rhema.com/sg' },
  bu: { slug: 'bu', name: '补充诗歌', language: 'zh-CN', baseUrl: 'https://logos-rhema.com/sg' },
  en: { slug: 'en', name: '英文诗歌', language: 'en', baseUrl: 'https://logos-rhema.com/sg/en' },
  er: { slug: 'er', name: '儿童诗歌', language: 'zh-CN', baseUrl: 'https://logos-rhema.com/sg' },
  xin: { slug: 'xin', name: '新歌颂咏', language: 'zh-CN', baseUrl: 'https://logos-rhema.com/sg' },
  csr: { slug: 'csr', name: '新诗', language: 'zh-CN', baseUrl: 'https://logos-rhema.com/sg' },
  by: { slug: 'by', name: '标语诗歌', language: 'zh-CN', baseUrl: 'https://logos-rhema.com/sg' },
};
