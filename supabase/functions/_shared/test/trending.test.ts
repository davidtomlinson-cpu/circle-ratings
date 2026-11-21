// Run: node --experimental-strip-types supabase/functions/_shared/test/trending.test.ts
import assert from 'node:assert/strict';
import { estimateListeners, inCinemas, lastDays, mergeListens, sumWikiViews, topPerCategory, ukRelease } from '../trending.ts';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok', name); };
const day = (a: [string, number][]) => ({ items: [{ articles: a.map(([article, views]) => ({ article, views })) }] });

t('Wikipedia views add up across days, skipping non-articles and lists', () => {
  const out = sumWikiViews([
    day([['Main_Page', 9e6], ['Special:Search', 5e6], ['Slow_Horses', 100], ['Ramayana:_Part_1', 50], ['List_of_highest-grossing_films', 999], ['Deaths_in_2026', 999]]),
    day([['Slow_Horses', 30], ['Wikipedia:Featured_pictures', 999], ['The_Body_(TV_series)', 200]]),
  ]);
  assert.deepEqual(out, [
    { title: 'The Body (TV series)', views: 200 },
    { title: 'Slow Horses', views: 130 },
    { title: 'Ramayana: Part 1', views: 50 }, // a colon in a real title is kept
  ]);
});

t('ListenBrainz editions of one album are merged', () => {
  const out = mergeListens([
    { release_group_mbid: 'a', listen_count: 10 },
    { release_group_mbid: 'b', listen_count: 15 },
    { release_group_mbid: 'a', listen_count: 7 },
    { release_group_mbid: null, listen_count: 99 },
  ]);
  assert.deepEqual(out, [{ mbid: 'a', listens: 17 }, { mbid: 'b', listens: 15 }]);
});

t('top N per category keeps the order', () => {
  const rows = ['M1', 'B1', 'M2', 'M3', 'B2'].map((x) => ({ category: x[0], x }));
  assert.deepEqual(topPerCategory(rows, 2).map((r) => r.x), ['M1', 'B1', 'M2', 'B2']);
});

t('last complete days, newest first, across a month end', () => {
  assert.deepEqual(lastDays(3, new Date('2026-12-02T10:00:00Z')), ['2026/12/01', '2026/11/30', '2026/11/29']);
});

t('albums are ranked by estimated listeners, not raw plays', () => {
  const out = estimateListeners(
    [{ mbid: 'superfans', listens: 258125 }, { mbid: 'broad', listens: 8876 }, { mbid: 'brand-new', listens: 3549 }, { mbid: 'unknown', listens: 99999 }],
    [
      { release_group_mbid: 'superfans', total_listen_count: 48000760, total_user_count: 4798 }, // ~10,000 plays each
      { release_group_mbid: 'broad', total_listen_count: 1376000, total_user_count: 28712 }, // ~48 plays each
      { release_group_mbid: 'brand-new', total_listen_count: 900, total_user_count: 37 }, // totals lag: capped at 37
    ],
  );
  assert.deepEqual(out, [{ mbid: 'broad', listeners: 185 }, { mbid: 'brand-new', listeners: 37 }, { mbid: 'superfans', listeners: 26 }]);
});

t('UK release date: UK first, then US, ignoring festivals and other countries', () => {
  assert.equal(ukRelease([
    { date: '+2026-09-06T00:00:00Z', place: 'Q_telluride' },
    { date: '+2026-10-16T00:00:00Z', place: 'Q30' },
    { date: '+2026-11-20T00:00:00Z', place: 'Q145' },
  ]), '2026-11-20');
  assert.equal(ukRelease([{ date: '+2026-12-18T00:00:00Z', place: 'Q30' }, { date: '+2026-12-17T00:00:00Z', place: 'Q213' }]), '2026-12-18');
  assert.equal(ukRelease([{ date: '+2026-11-13T00:00:00Z', place: null }, { date: '+2026-12-01T00:00:00Z', place: null }]), '2026-11-13');
  assert.equal(ukRelease([{ date: '+2026-11-13T00:00:00Z', place: 'Q183' }]), null); // only Germany: can't tell
});

t('in cinemas: out in the last 8 weeks, not in the future', () => {
  const now = new Date('2026-11-21T10:00:00Z');
  assert.equal(inCinemas('2026-11-20', now), true);
  assert.equal(inCinemas('2026-11-21', now), true);
  assert.equal(inCinemas('2026-10-23', now), true);
  assert.equal(inCinemas('2026-12-18', now), false); // not out yet
  assert.equal(inCinemas('2026-07-17', now), false); // long gone
  assert.equal(inCinemas(null, now), false);
});

console.log(`${n} passed`);
