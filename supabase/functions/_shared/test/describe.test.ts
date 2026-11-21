// Run from catalogue.test.ts (npm run test:catalogue).
import assert from 'node:assert/strict';
import { shortSummary, wikidataFromMb } from '../describe.ts';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok', name); };

t('Wikidata id from MusicBrainz links', () => {
  assert.equal(wikidataFromMb([{ type: 'allmusic', url: { resource: 'https://www.allmusic.com/album/x' } }, { type: 'wikidata', url: { resource: 'https://www.wikidata.org/wiki/Q123456' } }]), 'Q123456');
  assert.equal(wikidataFromMb([{ type: 'discogs', url: { resource: 'https://discogs.com/1' } }]), null);
  assert.equal(wikidataFromMb(undefined), null);
});

t('short summary keeps the first sentences and stops at a sentence end', () => {
  const s = 'Slow Horses is a British spy thriller television series based on the Slough House novels by Mick Herron. It follows Slough House, an MI5 unit where failed agents are sent. It stars Gary Oldman. It also stars Jack Lowden, Kristin Scott Thomas and many more.';
  const out = shortSummary(s, 420, 3);
  assert.ok(out.startsWith('Slow Horses is a British'));
  assert.ok(out.endsWith('It stars Gary Oldman.'), out);
});

t('long single sentences are cut cleanly with an ellipsis', () => {
  const out = shortSummary('A '.repeat(400) + 'end.', 100);
  assert.ok(out.length <= 101 && out.endsWith('…'));
});

t('initials do not end a sentence early', () => {
  const out = shortSummary('The Hobbit is a novel by J. R. R. Tolkien. It was published in 1937. It is a classic. Extra sentence.', 420, 2);
  assert.equal(out, 'The Hobbit is a novel by J. R. R. Tolkien. It was published in 1937.');
});

console.log(`${n} passed`);
