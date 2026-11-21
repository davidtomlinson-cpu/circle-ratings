// Run: node --experimental-strip-types supabase/functions/_shared/test/trending.test.ts
import assert from 'node:assert/strict';
import { lastDays, mergeListens, sumWikiViews, topPerCategory } from '../trending.ts';

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

console.log(`${n} passed`);
