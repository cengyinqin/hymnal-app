import { scrapeAll } from './scrapers.js';
import { COLLECTIONS } from './types.js';

const args = process.argv.slice(2);
const target = args[0] || 'all';

async function main() {
  console.log('=== Hymnal Scraper ===');
  console.log(`Target: ${target}`);
  console.log('');

  if (target === 'all') {
    await scrapeAll();
  } else if (COLLECTIONS[target]) {
    await scrapeAll([target]);
  } else {
    console.error(`Unknown collection: ${target}`);
    console.error(`Available: all, ${Object.keys(COLLECTIONS).join(', ')}`);
    process.exit(1);
  }

  console.log('\n=== Scraping complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
