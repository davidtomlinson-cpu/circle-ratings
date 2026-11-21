// Pure helpers for "Trending this week" from outside sources. No network here, so it can be tested with Node.
//   Films, TV, books: Wikipedia page views (most-read English Wikipedia articles each day), via Wikidata.
//   Albums: ListenBrainz sitewide weekly listening stats, via MusicBrainz release groups.
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
