// Pure helpers for "Trending this week" from outside sources. No network here, so it can be tested with Node.
//   Films, TV, books: Wikipedia page views (most-read English Wikipedia articles each day), via Wikidata.
//   Albums: ListenBrainz weekly plays, turned into an estimate of how many different people played each album,
//   via MusicBrainz release groups.
// Both are public domain (CC0) data.

/** One day's answer from the Wikimedia "top articles" API. */
export type WikiTopDay = { items?: { articles?: { article: string; views: number }[] }[] };

// Pages that are never a film, series or book. Article titles with a colon are fine ("Ramayana: Part 1"),
// so only these namespaces are skipped.
const NAMESPACES = /^(Special|Wikipedia|File|Portal|Help|Category|Template|Talk|User|Draft|Module|MediaWiki|Book|TimedText|Main_Page$)/i;
const NOT_A_WORK = /^(List_of_|Deaths_in_|Lists_of_|\d{4}_in_)/;

/** Add up a week of daily top lists: article title (with spaces) and total views, most viewed first. */
export function sumWikiViews(days: WikiTopDay[]): { title: string; views: number }[] {
  const total = new Map<string, number>();
  for (const d of days) {
    for (const a of d.items?.[0]?.articles ?? []) {
      if (NAMESPACES.test(a.article) || NOT_A_WORK.test(a.article) || a.article === 'Main_Page') continue;
      total.set(a.article, (total.get(a.article) ?? 0) + a.views);
    }
  }
  return [...total.entries()]
    .map(([t, views]) => ({ title: t.replace(/_/g, ' '), views }))
    .sort((a, b) => b.views - a.views);
}

/** One row from ListenBrainz /1/stats/sitewide/release-groups. */
export type ListenRow = { release_group_mbid?: string | null; release_group_name?: string; artist_name?: string; listen_count: number };

/** ListenBrainz lists an album once per edition: merge them by release group, most played first. */
export function mergeListens(rows: ListenRow[]): { mbid: string; listens: number }[] {
  const total = new Map<string, number>();
  for (const r of rows) {
    if (!r.release_group_mbid) continue;
    total.set(r.release_group_mbid, (total.get(r.release_group_mbid) ?? 0) + r.listen_count);
  }
  return [...total.entries()].map(([mbid, listens]) => ({ mbid, listens })).sort((a, b) => b.listens - a.listens);
}

/** Keep the first `n` of each category, preserving order (already ranked). */
export function topPerCategory<T extends { category: string }>(rows: T[], n: number): T[] {
  const seen = new Map<string, number>();
  return rows.filter((r) => {
    const k = (seen.get(r.category) ?? 0) + 1;
    seen.set(r.category, k);
    return k <= n;
  });
}

/** Dates (UTC) for the last `days` complete days, newest first, as Wikimedia API path parts "YYYY/MM/DD". */
export function lastDays(days: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(`${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`);
  }
  return out;
}

/** ListenBrainz all-time popularity of an album: total plays and how many different people played it. */
export type Popularity = { release_group_mbid: string; total_listen_count: number | null; total_user_count: number | null };

/**
 * Raw play counts let a few superfans swamp the chart (one band's fans can fill the top 20).
 * Instead estimate how many different people played each album this week:
 *   weekly plays ÷ average plays per listener (all-time plays ÷ all-time listeners).
 * All-time totals lag a few days, so a brand-new album can come out higher than its all-time listeners:
 * cap it there.
 */
export function estimateListeners(weekly: { mbid: string; listens: number }[], pop: Popularity[]): { mbid: string; listeners: number }[] {
  const byId = new Map(pop.map((p) => [p.release_group_mbid, p]));
  return weekly
    .map((w) => {
      const p = byId.get(w.mbid);
      const users = p?.total_user_count ?? 0;
      const plays = p?.total_listen_count ?? 0;
      if (!users || !plays) return { mbid: w.mbid, listeners: 0 };
      return { mbid: w.mbid, listeners: Math.round(Math.min(users, (w.listens * users) / plays)) };
    })
    .filter((x) => x.listeners > 0)
    .sort((a, b) => b.listeners - a.listeners);
}

// ---- "In cinemas" -------------------------------------------------------------

/** One Wikidata publication date (P577) for a film, with its place qualifier (P291) if any. */
export type FilmDate = { date: string; place: string | null };

const UK = 'Q145';
const US = 'Q30';

/**
 * The film's UK cinema release date (YYYY-MM-DD), or null if we can't tell.
 * Prefers a date marked United Kingdom, then United States (UK releases are usually close), then, if no
 * date has a place at all, the earliest date. Dates tied to other places (festivals, other countries) are ignored.
 */
export function ukRelease(dates: FilmDate[]): string | null {
  const day = (d: FilmDate) => d.date.replace(/^\+/, '').slice(0, 10);
  const pick = (place: string) => dates.filter((d) => d.place === place).map(day).sort()[0] ?? null;
  const uk = pick(UK) ?? pick(US);
  if (uk) return uk;
  if (dates.length && dates.every((d) => !d.place)) return dates.map(day).sort()[0];
  return null;
}

/** "In cinemas" = released in the last 8 weeks, and not yet in the future. Streaming-only films are excluded elsewhere. */
export function inCinemas(release: string | null, now = new Date(), weeks = 8): boolean {
  if (!release || !/^\d{4}-\d{2}-\d{2}$/.test(release)) return false;
  const t = Date.parse(`${release}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return t <= today && today - t <= weeks * 7 * 86400000;
}
