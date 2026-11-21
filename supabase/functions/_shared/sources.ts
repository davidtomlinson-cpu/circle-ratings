// Network helpers for the outside catalogue sources, shared by the catalogue and trending-refresh functions.
import { type Found, fromWikidata, labelOf, type WdEntity, wdCreatorIds } from './catalogue.ts';

// Both sources ask for an identifying User-Agent with a way to contact us. Set CATALOGUE_CONTACT
// (a support email or web page) as a function secret before launch.
export const UA = `SofaClub/1.0 (${Deno.env.get('CATALOGUE_CONTACT') || 'catalogue lookups'})`;
// Optional Wikimedia OAuth 2.0 access token: signed requests get much higher rate limits.
const WM_TOKEN = Deno.env.get('WIKIMEDIA_TOKEN') ?? '';
const wmAuth = (): Record<string, string> => (WM_TOKEN ? { Authorization: `Bearer ${WM_TOKEN}` } : {});

export class Busy extends Error {}
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- Health tally: how each source answered during this request (flushed to source_health) ----------

type Outcome = 'ok' | 'busy' | 'failed';
const SOURCE_BY_HOST: Record<string, string> = {
  'www.wikidata.org': 'wikidata', 'query.wikidata.org': 'wikidata-query', 'en.wikipedia.org': 'wikipedia',
  'wikimedia.org': 'wikimedia-pageviews', 'musicbrainz.org': 'musicbrainz', 'api.listenbrainz.org': 'listenbrainz',
};
let tally: Record<string, Record<Outcome, number>> = {};
export function mark(source: string, outcome: Outcome, n = 1) {
  const t = (tally[source] ??= { ok: 0, busy: 0, failed: 0 });
  t[outcome] = Math.max(0, t[outcome] + n);
}
const markUrl = (url: string, outcome: Outcome) => mark(SOURCE_BY_HOST[new URL(url).host] ?? new URL(url).host, outcome);

/** Save this request's tally (call once, at the end of a request). Never throws. */
export async function flushHealth(db: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown> }) {
  const counts = tally;
  tally = {};
  if (!Object.keys(counts).length) return;
  try { await db.rpc('record_source_health', { p_counts: counts }); } catch { /* logging must never break a request */ }
}

export async function fetchJson(url: string, init: { headers?: Record<string, string>; body?: string; method?: string } = {}, tries = 3, wait = 1200): Promise<unknown> {
  for (let i = 0; i < tries; i++) {
    let r: Response;
    try {
      r = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...init.headers } });
    } catch (e) {
      markUrl(url, 'failed');
      throw e;
    }
    if (r.ok) { markUrl(url, 'ok'); return r.json(); }
    // 429 (Wikimedia) and 503 (MusicBrainz) mean "slow down": wait a little and try again.
    if (r.status === 429 || r.status === 503) {
      markUrl(url, 'busy');
      await r.body?.cancel();
      if (i < tries - 1) { await sleep(wait * (i + 1)); continue; }
      throw new Busy(`${new URL(url).host} is busy`);
    }
    // A 404 is a normal answer (no such page), not the source failing.
    markUrl(url, r.status === 404 ? 'ok' : 'failed');
    await r.body?.cancel();
    throw new Error(`${new URL(url).host} answered ${r.status}`);
  }
  throw new Busy('busy');
}

// ---- Wikidata ---------------------------------------------------------------

export async function wd(params: Record<string, string>, tries = 3, wait = 1200) {
  const r = (await fetchJson(
    'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ ...params, format: 'json', formatversion: '2' }),
    { headers: wmAuth() },
    tries,
    wait,
  )) as { error?: { code?: string } };
  // Wikidata sometimes refuses inside a normal 200 answer (rate limited, server lag). Treat that as busy,
  // never as "no results", or we'd cache an empty answer.
  if (r.error) {
    mark('wikidata', 'ok', -1); // fetchJson counted it as ok; it was really a refusal
    mark('wikidata', 'busy');
    throw new Busy(`wikidata: ${r.error.code ?? 'error'}`);
  }
  return r;
}

export async function wdEntities(ids: string[], props: string, tries = 3, wait = 1200): Promise<Record<string, WdEntity>> {
  if (!ids.length) return {};
  const r = (await wd({ action: 'wbgetentities', ids: ids.slice(0, 50).join('|'), props, languages: 'en|en-gb|mul' }, tries, wait)) as {
    entities?: Record<string, WdEntity>;
  };
  return r.entities ?? {};
}

/** Full title rows for up to 50 Wikidata items, in the order given. Unknown or non-title items are dropped. */
export async function wdRows(ids: string[], tries = 3, wait = 1200): Promise<Found[]> {
  const ents = await wdEntities(ids, 'labels|claims|sitelinks', tries, wait);
  const people = [...new Set(Object.values(ents).flatMap(wdCreatorIds))];
  const pe = await wdEntities(people, 'labels', tries, wait);
  const names = Object.fromEntries(Object.entries(pe).map(([k, e]) => [k, labelOf(e)]));
  return ids.map((id) => ents[id] && fromWikidata(ents[id], names)).filter((x): x is Found => !!x);
}

/** Wikidata Query Service (SPARQL). One query can look up hundreds of items at once. */
export async function sparql(query: string): Promise<{ results: { bindings: Record<string, { value: string }>[] } }> {
  return (await fetchJson('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query }).toString(),
  }, 3, 3000)) as { results: { bindings: Record<string, { value: string }>[] } };
}

// ---- MusicBrainz ------------------------------------------------------------

export const mb = (path: string) => fetchJson(`https://musicbrainz.org/ws/2/${path}${path.includes('?') ? '&' : '?'}fmt=json`);
