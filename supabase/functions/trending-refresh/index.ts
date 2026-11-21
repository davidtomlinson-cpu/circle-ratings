// Builds "Trending this week" from outside the app, once a day (pg_cron → pg_net → here).
//   Films, TV and books: the most-read English Wikipedia articles over the last 7 days, kept only if
//   Wikidata says they're a film, series or book. Films out in UK cinemas in the last 8 weeks (and not
//   distributed by a streaming service) are also marked "in cinemas".
//   Albums: ListenBrainz's most-played albums this week, re-ranked by an estimate of how many different people
//   played them (so a few superfans can't fill the chart), kept only if MusicBrainz says they're studio albums.
// Titles are saved in `titles` (like a catalogue add), then each category's list is replaced in one go.
// If a source is busy or fails, that category keeps yesterday's list.
// Tasks (POST body {task}): 'all' builds the lists (05:17 UTC); 'describe' fetches descriptions for trending
// titles that lack a fresh one, so they open instantly (05:47); 'retry' redoes 'all' only if the lists weren't
// updated in the last 20 hours (08:47 and 11:47).
import { type Category, type Found, fromMusicBrainz, type MbReleaseGroup, WD_TYPES } from '../_shared/catalogue.ts';
import { admin } from '../_shared/admin.ts';
import { type DescTitle, fetchDescriptions, isFresh } from '../_shared/descriptions.ts';
import { fetchJson, flushHealth, mb, sleep, sparql, UA, wdRows } from '../_shared/sources.ts';
import {
  type FilmDate, inCinemas, ukRelease,
  estimateListeners, lastDays, type ListenRow, mergeListens, type Popularity, sumWikiViews, topPerCategory, type WikiTopDay,
} from '../_shared/trending.ts';

const KEEP = 50; // per category
const CANDIDATES = 500; // most-read articles to check each day

type Db = ReturnType<typeof admin>;
type Ranked = Found & { score: number };

// ---- Films, TV and books from Wikipedia page views ----------------------------

async function fromWikipedia(): Promise<Ranked[]> {
  const days: WikiTopDay[] = [];
  // The newest day is sometimes not published yet: look back 9 days and use the 7 newest that exist.
  for (const d of lastDays(9)) {
    try {
      days.push((await fetchJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${d}`)) as WikiTopDay);
    } catch {
      // not published yet, or a hiccup: skip the day
    }
    if (days.length === 7) break;
  }
  if (days.length < 5) throw new Error(`only ${days.length} days of Wikipedia page views`);
  const top = sumWikiViews(days).slice(0, CANDIDATES);

  // One query finds which of these articles are films, series or books.
  const types = Object.values(WD_TYPES).flatMap((s) => [...s]).map((q) => `wd:${q}`).join(' ');
  const names = top.map((t) => `${JSON.stringify(t.title)}@en`).join(' ');
  const res = await sparql(
    `SELECT ?name ?item WHERE { VALUES ?name { ${names} } ?a schema:name ?name; schema:isPartOf <https://en.wikipedia.org/>; schema:about ?item. ?item wdt:P31 ?t. VALUES ?t { ${types} } }`,
  );
  const item = new Map(res.results.bindings.map((b) => [b.name.value, b.item.value.split('/').pop()!]));
  const ranked = top.filter((t) => item.has(t.title)).map((t) => ({ id: item.get(t.title)!, views: t.views }));
  const views = new Map<string, number>();
  for (const r of ranked) views.set(r.id, (views.get(r.id) ?? 0) + r.views);
  const ids = [...views.keys()];

  // Full details (title, creator, year) for the matches, 50 at a time, gently.
  const rows: Found[] = [];
  for (let i = 0; i < ids.length && i < 200; i += 50) {
    rows.push(...(await wdRows(ids.slice(i, i + 50), 6, 3000)));
    await sleep(1500);
  }
  return rows.map((f) => ({ ...f, score: views.get(f.wikidata_id!) ?? 0 })).sort((a, b) => b.score - a.score);
}

// ---- In cinemas -----------------------------------------------------------------

type Cinema = { inCinemas: boolean; release: string | null };

/** For trending films: UK release date, and whether they're in cinemas now (not streaming-only). */
async function cinemaInfo(ids: string[]): Promise<Map<string, Cinema>> {
  const out = new Map<string, Cinema>();
  if (!ids.length) return out;
  const values = ids.map((q) => `wd:${q}`).join(' ');
  const dates = await sparql(
    `SELECT ?item ?date ?place WHERE { VALUES ?item { ${values} } ?item p:P577 ?st. ?st ps:P577 ?date. OPTIONAL { ?st pq:P291 ?place } }`,
  );
  await sleep(1000);
  // Distributed by a video streaming service or video-on-demand service (Netflix, Apple TV, Disney+ ...).
  const streamed = await sparql(
    `SELECT DISTINCT ?item WHERE { VALUES ?item { ${values} } ?item wdt:P750 ?d. ?d wdt:P31 ?t. VALUES ?t { wd:Q59152282 wd:Q723685 } }`,
  );
  const qid = (v: string) => v.split('/').pop()!;
  const streaming = new Set(streamed.results.bindings.map((b) => qid(b.item.value)));
  const byFilm = new Map<string, FilmDate[]>();
  for (const b of dates.results.bindings) {
    const id = qid(b.item.value);
    if (!byFilm.has(id)) byFilm.set(id, []);
    byFilm.get(id)!.push({ date: b.date.value, place: b.place ? qid(b.place.value) : null });
  }
  for (const id of ids) {
    const release = ukRelease(byFilm.get(id) ?? []);
    out.set(id, { release, inCinemas: !streaming.has(id) && inCinemas(release) });
  }
  return out;
}

// ---- Albums from ListenBrainz -------------------------------------------------

async function fromListenBrainz(): Promise<Ranked[]> {
  const r = (await fetchJson('https://api.listenbrainz.org/1/stats/sitewide/release-groups?range=week&count=100')) as {
    payload?: { release_groups?: ListenRow[] };
  };
  const weekly = mergeListens(r.payload?.release_groups ?? []);
  if (!weekly.length) throw new Error('ListenBrainz returned no albums');
  const pop = (await fetchJson('https://api.listenbrainz.org/1/popularity/release-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ release_group_mbids: weekly.map((w) => w.mbid) }),
  })) as Popularity[];
  const merged = estimateListeners(weekly, pop).slice(0, 80).map((x) => ({ mbid: x.mbid, listens: x.listeners }));
  const out: Ranked[] = [];
  // Look the albums up in MusicBrainz in two searches (by id), to get the type and the artist credit.
  for (let i = 0; i < merged.length; i += 40) {
    const part = merged.slice(i, i + 40);
    const q = part.map((m) => `rgid:${m.mbid}`).join(' OR ');
    const res = (await mb(`release-group/?limit=100&query=${encodeURIComponent(q)}`)) as { 'release-groups'?: MbReleaseGroup[] };
    const byId = new Map((res['release-groups'] ?? []).map((g) => [g.id, g]));
    for (const m of part) {
      const g = byId.get(m.mbid);
      if (!g || (g['secondary-types'] ?? []).length) continue; // studio albums only: no live, compilations, soundtracks
      const f = fromMusicBrainz(g);
      if (f) out.push({ ...f, score: m.listens });
    }
    await sleep(1100); // MusicBrainz allows about one request a second
  }
  return out;
}

// ---- Saving -------------------------------------------------------------------

/** Make sure every title is in `titles` (reusing linked ones, e.g. a Top 50 entry), and return their ids. */
async function saveTitles(db: Db, rows: Ranked[]): Promise<Map<string, number>> {
  const wds = rows.map((r) => r.wikidata_id).filter(Boolean) as string[];
  const mbs = rows.map((r) => r.musicbrainz_id).filter(Boolean) as string[];
  const lookup = async () => {
    const [a, b] = await Promise.all([
      wds.length ? db.from('titles').select('id, wikidata_id').in('wikidata_id', wds) : { data: [] as { id: number; wikidata_id: string }[] },
      mbs.length ? db.from('titles').select('id, musicbrainz_id').in('musicbrainz_id', mbs) : { data: [] as { id: number; musicbrainz_id: string }[] },
    ]);
    const m = new Map<string, number>();
    for (const t of a.data ?? []) m.set(t.wikidata_id, t.id);
    for (const t of b.data ?? []) m.set(t.musicbrainz_id, t.id);
    return m;
  };
  let have = await lookup();
  const missing = rows.filter((r) => !have.has((r.wikidata_id ?? r.musicbrainz_id)!));
  if (missing.length) {
    const { error } = await db.from('titles').upsert(
      missing.map((f) => ({
        key: f.key, category: f.category, title: f.title, creator: f.creator, year: f.year, source: f.source,
        wikidata_id: f.wikidata_id, musicbrainz_id: f.musicbrainz_id, popularity: f.popularity,
      })),
      { onConflict: 'key', ignoreDuplicates: true },
    );
    if (error) throw new Error(`saving titles: ${error.message}`);
    have = await lookup();
  }
  return have;
}

async function replace(
  db: Db, category: Category, source: 'wikipedia' | 'listenbrainz', rows: Ranked[], ids: Map<string, number>, cinema = new Map<string, Cinema>(),
) {
  const list = rows
    .map((r) => {
      const c = r.wikidata_id ? cinema.get(r.wikidata_id) : undefined;
      return { title_id: ids.get((r.wikidata_id ?? r.musicbrainz_id)!), score: r.score, in_cinemas: c?.inCinemas ?? false, release_date: c?.release ?? null };
    })
    .filter((r) => r.title_id)
    .slice(0, KEEP);
  if (list.length < 5) throw new Error(`${category}: only ${list.length} titles`);
  const { data, error } = await db.rpc('replace_world_trending', { p_category: category, p_source: source, p_rows: list });
  if (error) throw new Error(`${category}: ${error.message}`);
  return data as number;
}

/** Build all the lists (the 05:17 run). */
async function refreshAll(db: Db, report: Record<string, string | number>) {
  const jobs: [string, () => Promise<void>][] = [
    ['wikipedia', async () => {
      const rows = topPerCategory(await fromWikipedia(), KEEP);
      const ids = await saveTitles(db, rows);
      let cinema = new Map<string, Cinema>();
      try {
        cinema = await cinemaInfo(rows.filter((r) => r.category === 'Movies').map((r) => r.wikidata_id!));
        report.inCinemas = [...cinema.values()].filter((c) => c.inCinemas).length;
      } catch (e) {
        report.inCinemas = `skipped (${String(e)})`; // the film list still updates, just without the cinema marks
      }
      for (const cat of ['Movies', 'TV shows', 'Books'] as const) {
        try {
          report[cat] = await replace(db, cat, 'wikipedia', rows.filter((r) => r.category === cat), ids, cinema);
        } catch (e) {
          report[cat] = `kept yesterday's list (${String(e)})`;
        }
      }
    }],
    ['listenbrainz', async () => {
      const rows = (await fromListenBrainz()).slice(0, KEEP);
      const ids = await saveTitles(db, rows);
      report.Albums = await replace(db, 'Albums', 'listenbrainz', rows, ids);
    }],
  ];
  for (const [name, run] of jobs) {
    try {
      await run();
    } catch (e) {
      report[name] = `failed, kept yesterday's lists: ${String(e)}`;
      console.error('trending-refresh', name, String(e));
    }
  }
}

/** Descriptions for trending titles that lack a fresh one (the 05:47 run). Stops before the time limit. */
async function describeTrending(db: Db, report: Record<string, string | number>) {
  const { data: rows } = await db.from('world_trending')
    .select('rank, titles!inner(id, wikidata_id, musicbrainz_id, title_descriptions(summary, fetched_at))')
    .order('rank');
  type Row = { titles: DescTitle & { title_descriptions: { summary: string; fetched_at: string } | { summary: string; fetched_at: string }[] | null } };
  const seen = new Set<number>();
  const todo = ((rows ?? []) as unknown as Row[])
    .map((r) => r.titles)
    .filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      const d = Array.isArray(t.title_descriptions) ? t.title_descriptions[0] : t.title_descriptions;
      return !isFresh(d);
    })
    // Films, TV and books first (cheap), albums after (MusicBrainz is about one request a second).
    .sort((a, b) => Number(!a.wikidata_id) - Number(!b.wikidata_id))
    .map(({ id, wikidata_id, musicbrainz_id }) => ({ id, wikidata_id, musicbrainz_id }));
  report.needed = todo.length;
  try {
    report.described = await fetchDescriptions(db, todo, Date.now() + 120_000);
  } catch (e) {
    report.described = `stopped early: ${String(e)}`;
  }
}

/** Only redo the lists if the morning run didn't update them (the 08:47 and 11:47 runs). */
async function retryIfStale(db: Db, report: Record<string, string | number>) {
  const { data } = await db.from('world_trending').select('category, updated_at');
  const newest = new Map<string, number>();
  for (const r of data ?? []) newest.set(r.category, Math.max(newest.get(r.category) ?? 0, Date.parse(r.updated_at)));
  const cutoff = Date.now() - 20 * 3600_000;
  const stale = ['Movies', 'TV shows', 'Books', 'Albums'].filter((c) => (newest.get(c) ?? 0) < cutoff);
  if (!stale.length) { report.retry = 'not needed: lists are up to date'; return; }
  report.retry = `stale: ${stale.join(', ')}`;
  await refreshAll(db, report);
}

Deno.serve(async (req) => {
  const db = admin();
  // Only the daily database job may run this: it sends a secret that only the database knows.
  const { data: ok } = await db.rpc('check_trending_secret', { p_secret: req.headers.get('x-cron-secret') ?? '' });
  if (ok !== true) return new Response('forbidden', { status: 403 });
  const task = ((await req.json().catch(() => ({}))) as { task?: string }).task ?? 'all';

  const report: Record<string, string | number> = { ua: UA, task };
  try {
    if (task === 'describe') await describeTrending(db, report);
    else if (task === 'retry') await retryIfStale(db, report);
    else await refreshAll(db, report);
  } finally {
    await flushHealth(db);
  }
  console.log('trending-refresh', JSON.stringify(report));
  return new Response(JSON.stringify(report), { headers: { 'Content-Type': 'application/json' } });
});
