// Catalogue search and add, for signed-in users.
//   POST { action: 'search', q, category? } -> { results, busy }
//   POST { action: 'add', key }             -> { title }
// Films, TV and books come from Wikidata, albums from MusicBrainz (both CC0, so we can store them).
// Titles are only ever written here, with the service role, after re-reading them at the source:
// the app can't invent or alter catalogue entries.
import {
  type Category, type Found, fromMusicBrainz, fromWikidata, mbQuery, type MbReleaseGroup, normaliseQuery, parseKey,
  rankAlbums, rankByPopularity, type Source, type WdEntity, wdCreatorIds,
} from '../_shared/catalogue.ts';
import { admin } from '../_shared/admin.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Both sources ask for an identifying User-Agent with a way to contact us. Set CATALOGUE_CONTACT
// (a support email or web page) as a function secret before launch.
const UA = `SofaClub/1.0 (${Deno.env.get('CATALOGUE_CONTACT') || 'catalogue lookups'})`;
// Optional Wikimedia OAuth 2.0 access token: signed requests get much higher rate limits.
const WM_TOKEN = Deno.env.get('WIKIMEDIA_TOKEN') ?? '';
const CACHE_DAYS = 7;
const MAX = 15;
const CATS: Category[] = ['Movies', 'TV shows', 'Books', 'Albums'];

class Busy extends Error {}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, headers: Record<string, string> = {}, tries = 3): Promise<unknown> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers } });
    if (r.ok) return r.json();
    // 429 (Wikimedia) and 503 (MusicBrainz) mean "slow down": wait a little and try again.
    if (r.status === 429 || r.status === 503) {
      await r.body?.cancel();
      if (i < tries - 1) { await sleep(1200 * (i + 1)); continue; }
      throw new Busy(`${new URL(url).host} is busy`);
    }
    throw new Error(`${new URL(url).host} answered ${r.status}`);
  }
  throw new Busy('busy');
}

// ---- Wikidata ---------------------------------------------------------------

async function wd(params: Record<string, string>) {
  const r = (await fetchJson(
    'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ ...params, format: 'json', formatversion: '2' }),
    WM_TOKEN ? { Authorization: `Bearer ${WM_TOKEN}` } : {},
  )) as { error?: { code?: string } };
  // Wikidata sometimes refuses inside a normal 200 answer (rate limited, server lag). Treat that as busy,
  // never as "no results", or we'd cache an empty answer for a week.
  if (r.error) throw new Busy(`wikidata: ${r.error.code ?? 'error'}`);
  return r;
}

async function wdEntities(ids: string[], props: string): Promise<Record<string, WdEntity>> {
  if (!ids.length) return {};
  const r = (await wd({ action: 'wbgetentities', ids: ids.slice(0, 50).join('|'), props, languages: 'en|en-gb|mul' })) as {
    entities?: Record<string, WdEntity>;
  };
  return r.entities ?? {};
}

async function wdRows(ids: string[]): Promise<Found[]> {
  const ents = await wdEntities(ids, 'labels|claims|sitelinks');
  const people = [...new Set(Object.values(ents).flatMap(wdCreatorIds))];
  const pe = await wdEntities(people, 'labels');
  const names = Object.fromEntries(Object.entries(pe).map(([k, e]) => [k, e.labels?.en?.value ?? e.labels?.mul?.value ?? '']));
  return ids.map((id) => ents[id] && fromWikidata(ents[id], names)).filter((x): x is Found => !!x);
}

async function searchWikidata(q: string): Promise<Found[]> {
  const r = (await wd({ action: 'wbsearchentities', search: q, language: 'en', uselang: 'en', type: 'item', limit: '30' })) as {
    search?: { id: string }[];
  };
  const ids = (r.search ?? []).map((x) => x.id);
  return rankByPopularity(await wdRows(ids)).slice(0, MAX);
}

// ---- MusicBrainz ------------------------------------------------------------

const mb = (path: string) => fetchJson(`https://musicbrainz.org/ws/2/${path}${path.includes('?') ? '&' : '?'}fmt=json`);

async function searchMusicBrainz(q: string): Promise<Found[]> {
  const r = (await mb(`release-group/?query=${encodeURIComponent(mbQuery(q))}&limit=40`)) as { 'release-groups'?: MbReleaseGroup[] };
  return rankAlbums(r['release-groups'] ?? [], q).slice(0, MAX);
}

// ---- Cache + mapping onto titles we already have -----------------------------

type Db = ReturnType<typeof admin>;

async function cached(db: Db, source: Source, q: string, run: () => Promise<Found[]>): Promise<Found[]> {
  const nq = normaliseQuery(q);
  const since = new Date(Date.now() - CACHE_DAYS * 86400000).toISOString();
  const hit = await db.from('catalogue_cache').select('results').eq('source', source).eq('query', nq).gte('fetched_at', since).maybeSingle();
  if (hit.data) return hit.data.results as Found[];
  const rows = await run();
  // Only cache real answers: an empty one may just mean the source was having a bad moment.
  if (rows.length) await db.from('catalogue_cache').upsert({ source, query: nq, results: rows, fetched_at: new Date().toISOString() });
  return rows;
}

type Row = { key: string; category: Category; title: string; creator: string; year: string; source: string };
const pub = (f: Found | Row): Row => ({ key: f.key, category: f.category, title: f.title, creator: f.creator, year: f.year, source: f.source });

/** Swap any result we already hold (e.g. The Godfather is 'Movies#0') for our own row, so ratings stay together. */
async function useExisting(db: Db, rows: Found[]): Promise<Row[]> {
  const wds = rows.map((r) => r.wikidata_id).filter(Boolean) as string[];
  const mbs = rows.map((r) => r.musicbrainz_id).filter(Boolean) as string[];
  const [a, b] = await Promise.all([
    wds.length ? db.from('titles').select('key, category, title, creator, year, source, wikidata_id').in('wikidata_id', wds) : { data: [] },
    mbs.length ? db.from('titles').select('key, category, title, creator, year, source, musicbrainz_id').in('musicbrainz_id', mbs) : { data: [] },
  ]);
  const byWd = new Map((a.data ?? []).map((t: Row & { wikidata_id: string }) => [t.wikidata_id, t]));
  const byMb = new Map((b.data ?? []).map((t: Row & { musicbrainz_id: string }) => [t.musicbrainz_id, t]));
  return rows.map((r) => pub((r.wikidata_id && byWd.get(r.wikidata_id)) || (r.musicbrainz_id && byMb.get(r.musicbrainz_id)) || r));
}

// ---- Actions -----------------------------------------------------------------

async function search(db: Db, q: string, category: Category | null) {
  const want = (s: Source) => (s === 'musicbrainz' ? !category || category === 'Albums' : category !== 'Albums');
  const busy: Source[] = [];
  const run = async (s: Source, fn: (q: string) => Promise<Found[]>) => {
    if (!want(s)) return [];
    try {
      return await cached(db, s, q, () => fn(q));
    } catch (e) {
      console.error('catalogue search', s, String(e));
      busy.push(s);
      return [];
    }
  };
  const [w, m] = await Promise.all([run('wikidata', searchWikidata), run('musicbrainz', searchMusicBrainz)]);
  let rows = [...w.filter((r) => !category || r.category === category), ...m];
  if (!category) {
    // Mixing films, books and albums: exact title matches first, then the most popular.
    // (Wikipedia-article counts and album release counts are rough but comparable.)
    const nq = normaliseQuery(q);
    const exact = (r: Found) => (normaliseQuery(r.title) === nq ? 1 : 0);
    rows = rows.map((r, i) => ({ r, i })).sort((a, b) => exact(b.r) - exact(a.r) || b.r.popularity - a.r.popularity || a.i - b.i).map((x) => x.r);
  }
  return { results: await useExisting(db, rows), busy };
}

async function add(db: Db, key: string) {
  const parsed = parseKey(key);
  if (!parsed) return { status: 400, body: { error: 'bad_key' } };
  const col = parsed.source === 'wikidata' ? 'wikidata_id' : 'musicbrainz_id';
  const existing = async () =>
    (await db.from('titles').select('id, key, category, title, creator, year, source').or(`key.eq."${key}",${col}.eq.${parsed.id}`).limit(1).maybeSingle()).data;
  const have = await existing();
  if (have) return { status: 200, body: { title: have } };

  // Re-read it at the source: never trust title details sent by the app.
  let found: Found | null = null;
  try {
    if (parsed.source === 'wikidata') {
      found = (await wdRows([parsed.id]))[0] ?? null;
    } else {
      found = fromMusicBrainz((await mb(`release-group/${parsed.id}?inc=artist-credits`)) as MbReleaseGroup);
    }
  } catch (e) {
    return { status: e instanceof Busy ? 503 : 502, body: { error: e instanceof Busy ? 'catalogue_busy' : 'catalogue_error' } };
  }
  if (!found) return { status: 404, body: { error: 'not_a_title' } };

  const { error } = await db.from('titles').insert({
    key: found.key, category: found.category, title: found.title, creator: found.creator, year: found.year,
    source: found.source, wikidata_id: found.wikidata_id, musicbrainz_id: found.musicbrainz_id, popularity: found.popularity,
  });
  if (error && error.code !== '23505') { console.error('catalogue add', error.message); return { status: 500, body: { error: 'save_failed' } }; }
  return { status: 200, body: { title: await existing() } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const db = admin();
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer /i, '');
  const { data: who, error: authError } = await db.auth.getUser(token);
  if (authError || !who.user) return json(401, { error: 'unauthorized' });

  let body: { action?: string; q?: string; category?: string; key?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }); }

  if (body.action === 'search') {
    const q = (body.q ?? '').trim().slice(0, 100);
    if (q.length < 2) return json(200, { results: [], busy: [] });
    const category = CATS.includes(body.category as Category) ? (body.category as Category) : null;
    return json(200, await search(db, q, category));
  }
  if (body.action === 'add' && typeof body.key === 'string') {
    const r = await add(db, body.key);
    return json(r.status, r.body);
  }
  return json(400, { error: 'bad_action' });
});
