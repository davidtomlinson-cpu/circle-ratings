// Fetching and caching title descriptions (opening of the English Wikipedia article), shared by the
// catalogue function (one title, when someone opens it) and the trending job (every trending title, overnight).
// Wikipedia text is CC BY-SA 4.0: the app shows it with credit and a link to the article.
import { admin } from './admin.ts';
import { shortSummary, wikidataFromMb } from './describe.ts';
import { Busy, fetchJson, mb, sleep, wdEntities } from './sources.ts';

type Db = ReturnType<typeof admin>;
export type DescTitle = { id: number; wikidata_id: string | null; musicbrainz_id: string | null };
export type Description = { summary: string | null; url: string | null };

const DAY = 86400000;
/** Cached descriptions are kept 30 days; "nothing found" is rechecked after 7. */
export const isFresh = (c: { summary: string; fetched_at: string } | null | undefined) =>
  !!c && Date.now() - Date.parse(c.fetched_at) < (c.summary ? 30 : 7) * DAY;

/** The English Wikipedia article title for each Wikidata item (50 per request). */
async function enwikiTitles(qs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < qs.length; i += 50) {
    const ents = await wdEntities(qs.slice(i, i + 50), 'sitelinks', 4, 2000);
    for (const [q, e] of Object.entries(ents)) {
      const t = (e.sitelinks as Record<string, { title?: string }> | undefined)?.enwiki?.title;
      if (t) out.set(q, t);
    }
    if (i + 50 < qs.length) await sleep(1200);
  }
  return out;
}

/** Wikipedia's summary for one article, trimmed for the app; null if missing or a disambiguation page. */
async function summary(article: string): Promise<Description | null> {
  const page = encodeURIComponent(article.replace(/ /g, '_'));
  const s = (await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${page}`).catch((e) => {
    if (e instanceof Busy) throw e;
    return null; // missing or renamed page: treat as no description
  })) as { type?: string; extract?: string; content_urls?: { desktop?: { page?: string } } } | null;
  if (!s || s.type === 'disambiguation' || !s.extract) return null;
  return { summary: shortSummary(s.extract), url: s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${page}` };
}

/**
 * Fetch and cache descriptions for these titles. Films, TV and books go first (Wikidata, then Wikipedia);
 * albums after, because finding an album's Wikidata item goes through MusicBrainz (about one request a second,
 * and often "busy"). A busy answer skips that title for now; several in a row pause, then stop the run.
 * Stops early when `deadline` (ms since epoch) passes. Returns how many were saved.
 */
export async function fetchDescriptions(db: Db, titles: DescTitle[], deadline = Infinity): Promise<number> {
  let busyRun = 0;
  const onBusy = async () => {
    busyRun++;
    if (busyRun >= 6) throw new Busy('sources too busy: stopping for now');
    await sleep(busyRun >= 3 ? 5000 : 1500);
  };
  const save = (id: number, d: Description | null) =>
    db.from('title_descriptions').upsert({ title_id: id, summary: d?.summary ?? '', url: d?.url ?? null, fetched_at: new Date().toISOString() });

  // Wikidata item for every title we can work out (albums through MusicBrainz, gently).
  const q = new Map<number, string>(); // title id → Wikidata item
  const looked = new Set<number>(); // titles we actually checked (the rest are tried another time)
  const ordered = [...titles].sort((a, b) => Number(!a.wikidata_id) - Number(!b.wikidata_id));
  for (const t of ordered) {
    if (t.wikidata_id) { q.set(t.id, t.wikidata_id); looked.add(t.id); }
  }
  const albums = ordered.filter((t) => !t.wikidata_id && t.musicbrainz_id);

  let saved = 0;
  // Titles linked to neither source (e.g. added by hand) have nothing to look up: record "no description".
  for (const t of ordered.filter((x) => !x.wikidata_id && !x.musicbrainz_id)) { await save(t.id, null); saved++; }
  const describeAll = async (list: DescTitle[]) => {
    const articles = await enwikiTitles([...new Set(list.map((t) => q.get(t.id)).filter((x): x is string => !!x))]);
    for (const t of list) {
      if (Date.now() > deadline) return;
      if (!looked.has(t.id)) continue;
      const w = q.get(t.id);
      const article = w ? articles.get(w) : undefined;
      try {
        const d = article ? await summary(article) : null;
        await save(t.id, d);
        saved++;
        busyRun = 0;
      } catch (e) {
        if (!(e instanceof Busy)) throw e;
        await onBusy(); // leave this one for another time
      }
      if (article) await sleep(400); // be gentle with Wikipedia
    }
  };

  // 1) Films, TV and books.
  await describeAll(ordered.filter((t) => t.wikidata_id));
  // 2) Albums: find each one's Wikidata item through MusicBrainz, then describe them.
  for (const t of albums) {
    if (Date.now() > deadline) break;
    try {
      const g = (await mb(`release-group/${t.musicbrainz_id}?inc=url-rels`).catch((e) => {
        if (e instanceof Busy) throw e;
        return null;
      })) as { relations?: { type?: string; url?: { resource?: string } }[] } | null;
      looked.add(t.id);
      const w = wikidataFromMb(g?.relations);
      if (w) q.set(t.id, w);
      busyRun = 0;
    } catch (e) {
      if (!(e instanceof Busy)) throw e;
      await onBusy();
    }
    await sleep(1500); // MusicBrainz allows about one request a second; leave room for others on our address
  }
  if (Date.now() < deadline) await describeAll(albums);
  return saved;
}

/** One title's description, from the cache if fresh, otherwise fetched now (stale cache beats nothing). */
export async function describeTitle(db: Db, t: DescTitle): Promise<{ status: number; body: Description | { error: string } }> {
  const { data: c } = await db.from('title_descriptions').select('summary, url, fetched_at').eq('title_id', t.id).maybeSingle();
  const cached = c && { summary: c.summary || null, url: c.url };
  if (isFresh(c)) return { status: 200, body: cached! };
  try {
    const saved = await fetchDescriptions(db, [t]);
    // Nothing saved means the sources were busy: say so (the app tries again later) rather than "no description".
    if (!saved) return cached ? { status: 200, body: cached } : { status: 503, body: { error: 'catalogue_busy' } };
    const { data: n } = await db.from('title_descriptions').select('summary, url').eq('title_id', t.id).maybeSingle();
    return { status: 200, body: { summary: n?.summary || null, url: n?.url ?? null } };
  } catch (e) {
    if (cached) return { status: 200, body: cached };
    return { status: e instanceof Busy ? 503 : 502, body: { error: e instanceof Busy ? 'catalogue_busy' : 'catalogue_error' } };
  }
}
