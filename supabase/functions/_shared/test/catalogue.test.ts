// Run: node --experimental-strip-types supabase/functions/_shared/test/catalogue.test.ts
import assert from 'node:assert/strict';
import { fromMusicBrainz, fromWikidata, labelOf, mbQuery, normaliseQuery, parseKey, rankAlbums, smartCase, wdCreatorIds, type WdEntity } from '../catalogue.ts';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok', name); };
const claim = (id: string) => ({ mainsnak: { datavalue: { value: { id } } } });
const date = (time: string) => ({ mainsnak: { datavalue: { value: { time } } } });

const godfather: WdEntity = {
  id: 'Q47703',
  labels: { mul: { value: 'The Godfather' } }, // no 'en' label: Wikidata's language-neutral label
  claims: { P31: [claim('Q11424')], P57: [claim('Q56094')], P577: [date('+1972-03-15T00:00:00Z')] },
  sitelinks: Object.fromEntries(Array.from({ length: 133 }, (_, i) => [`w${i}`, {}])),
};

t('film from Wikidata, with the mul label and director', () => {
  assert.deepEqual(wdCreatorIds(godfather), ['Q56094']);
  const f = fromWikidata(godfather, { Q56094: 'Francis Ford Coppola' })!;
  assert.deepEqual([f.key, f.category, f.title, f.creator, f.year, f.popularity, f.wikidata_id], ['wd:Q47703', 'Movies', 'The Godfather', 'Francis Ford Coppola', '1972', 133, 'Q47703']);
});

t('TV series uses creator and start year; duplicate creators collapse', () => {
  const bb: WdEntity = { id: 'Q1079', labels: { en: { value: 'Breaking Bad' } }, claims: { P31: [claim('Q5398426')], P170: [claim('Q4500')], P162: [claim('Q4500')], P580: [date('+2008-01-20T00:00:00Z')] } };
  const f = fromWikidata(bb, { Q4500: 'Vince Gilligan' })!;
  assert.deepEqual([f.category, f.creator, f.year], ['TV shows', 'Vince Gilligan', '2008']);
});

t('anime films count as films', () => {
  const e: WdEntity = { id: 'Q155653', labels: { en: { value: 'Spirited Away' } }, claims: { P31: [claim('Q20650540')] } };
  assert.equal(fromWikidata(e, {})!.category, 'Movies');
});

t('book uses author', () => {
  const b: WdEntity = { id: 'Q190192', labels: { en: { value: 'Dune' } }, claims: { P31: [claim('Q7725634')], P50: [claim('Q7934')], P577: [date('+1965-08-01T00:00:00Z')] } };
  assert.equal(fromWikidata(b, { Q7934: 'Frank Herbert' })!.category, 'Books');
});

t('things that are not films, series or books are dropped', () => {
  assert.equal(fromWikidata({ id: 'Q1', labels: { en: { value: 'A person' } }, claims: { P31: [claim('Q5')] } }, {}), null);
  assert.equal(fromWikidata({ id: 'Q2', claims: { P31: [claim('Q11424')] } }, {}), null); // no name
  assert.equal(fromWikidata({ id: 'Q3', missing: '' }, {}), null);
  assert.equal(labelOf(undefined), '');
});

const rg = (over: object) => ({ id: '8f3f2d5b-f0fe-4ebb-817c-f9b00686e2f6', title: 'X', score: 100, count: 1, 'primary-type': 'Album', 'artist-credit': [{ name: 'Someone' }], ...over });

t('album from MusicBrainz, with joined artist credit', () => {
  const f = fromMusicBrainz(rg({ title: 'Watch the Throne', 'first-release-date': '2011-08-08', 'artist-credit': [{ name: 'JAY‐Z', joinphrase: ' & ' }, { name: 'Kanye West' }] }))!;
  assert.deepEqual([f.key.slice(0, 3), f.category, f.title, f.creator, f.year], ['mb:', 'Albums', 'Watch the Throne', 'JAY‐Z & Kanye West', '2011']);
  assert.equal(fromMusicBrainz(rg({ 'primary-type': 'Single' })), null);
  assert.equal(fromMusicBrainz(rg({ id: 'not-an-id' })), null);
});

const id = (c: string) => `${c.repeat(8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;

t('famous album outranks same-title obscure ones; compilations sink', () => {
  const out = rankAlbums([
    rg({ id: id('a'), title: 'What’s Going On', count: 3, 'artist-credit': [{ name: 'T. Honda' }] }),
    rg({ id: id('b'), title: 'What’s Going On', count: 49, 'artist-credit': [{ name: 'Marvin Gaye' }] }),
    rg({ id: id('c'), title: 'What’s Going On', count: 49, 'secondary-types': ['Compilation'], 'artist-credit': [{ name: 'Marvin Gaye' }] }),
    rg({ id: id('d'), title: 'Something else', score: 40, count: 500 }),
  ], 'what’s going on');
  assert.deepEqual(out.map((f) => f.creator), ['Marvin Gaye', 'T. Honda', 'Marvin Gaye']);
  assert.equal(out[0].musicbrainz_id, id('b'));
});

t('exact title beats MusicBrainz top score ("ok computer")', () => {
  const out = rankAlbums([
    rg({ id: id('a'), title: 'Computer, Computer', score: 100, count: 1, 'artist-credit': [{ name: 'Zarlok' }] }),
    rg({ id: id('b'), title: 'OK Computer', score: 37, count: 39, 'artist-credit': [{ name: 'Radiohead' }] }),
  ], 'ok computer');
  assert.equal(out[0].title, 'OK Computer');
});

t('artist words count too ("ok computer radiohead")', () => {
  const out = rankAlbums([
    rg({ id: id('a'), title: 'OK Go', score: 62, count: 8, 'artist-credit': [{ name: 'OK Go' }] }),
    rg({ id: id('b'), title: 'OK Computer', score: 100, count: 39, 'artist-credit': [{ name: 'Radiohead' }] }),
  ], 'ok computer radiohead');
  assert.equal(out[0].creator, 'Radiohead');
});

t('capitalised labels become title case', () => {
  assert.equal(smartCase('THE GODFATHER'), 'The Godfather');
  assert.equal(smartCase('THE LORD OF THE RINGS'), 'The Lord of the Rings');
  assert.equal(smartCase('M*A*S*H'), 'M*A*S*H');
  assert.equal(smartCase('Breaking Bad'), 'Breaking Bad');
});

t('MusicBrainz query escapes Lucene syntax', () => {
  assert.equal(mbQuery('AC/DC: back in black!'), '(releasegroup:(AC DC back in black) OR artist:(AC DC back in black)) AND primarytype:album');
});

t('keys and cache normalisation', () => {
  assert.deepEqual(parseKey('wd:Q47703'), { source: 'wikidata', id: 'Q47703' });
  assert.deepEqual(parseKey('mb:8f3f2d5b-f0fe-4ebb-817c-f9b00686e2f6'), { source: 'musicbrainz', id: '8f3f2d5b-f0fe-4ebb-817c-f9b00686e2f6' });
  assert.equal(parseKey('Movies#0'), null);
  assert.equal(parseKey('wd:Q1; drop table'), null);
  assert.equal(parseKey('mb:../../etc'), null);
  assert.equal(normaliseQuery('  The   GODFATHER!! '), 'the godfather');
  assert.equal(normaliseQuery("What's Going On?"), "what's going on");
});

console.log(`${n} passed`);

// The Trending helpers' tests run from here too, so `npm run test:catalogue` covers both.
await import('./trending.test.ts');
await import('./describe.test.ts');
