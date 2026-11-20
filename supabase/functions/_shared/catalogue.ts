// Pure helpers for the real catalogue: turn Wikidata and MusicBrainz answers into title rows.
// No network or database here, so it can be tested with plain Node (see test/catalogue.test.ts).

export type Category = 'Movies' | 'TV shows' | 'Books' | 'Albums';
export type Source = 'wikidata' | 'musicbrainz';

/** A title as we store it. `key` is 'wd:Q123' or 'mb:<release-group id>'. */
export type Found = {
  key: string;
  source: Source;
  category: Category;
  title: string;
  creator: string;
  year: string;
  popularity: number;
  wikidata_id: string | null;
  musicbrainz_id: string | null;
};

// "Instance of" (P31) values that mean each category. Wikidata has many film/series/book subtypes,
// so this lists the common ones rather than walking the class tree on every search.
export const WD_TYPES: Record<Exclude<Category, 'Albums'>, ReadonlySet<string>> = {
  Movies: new Set([
    'Q11424', // film
    'Q24869', // feature film
    'Q202866', // animated film
    'Q29168811', // animated feature film
    'Q506240', // television film
    'Q93204', // documentary film
    'Q226730', // silent film
    'Q18011172', // film project
    'Q20667187', // silent short film
  ]),
  'TV shows': new Set([
    'Q5398426', // television series
    'Q1259759', // miniseries
    'Q526877', // web series
    'Q15416', // television program
    'Q63952888', // anime television series
    'Q117467246', // animated television series
    'Q581714', // animated series
    'Q113687694', // original video animation series
    'Q7724161', // television serial
  ]),
  Books: new Set([
    'Q7725634', // literary work
    'Q8261', // novel
    'Q571', // book
    'Q47461344', // written work
    'Q277759', // book series
    'Q725377', // graphic novel
    'Q1667921', // novel series
    'Q8274', // manga
    'Q5185279', // poem
    'Q12106333', // poetry collection
  ]),
};

const CREATOR_PROPS: Record<Exclude<Category, 'Albums'>, string[]> = {
  Movies: ['P57'], // director
  'TV shows': ['P170', 'P162'], // creator, producer
  Books: ['P50'], // author
};
const DATE_PROPS: Record<Exclude<Category, 'Albums'>, string[]> = {
  Movies: ['P577'], // publication date
  'TV shows': ['P580', 'P577'], // start time
  Books: ['P577', 'P571'], // publication date, inception
};

type Snak = { mainsnak?: { datavalue?: { value?: unknown } } };
export type WdEntity = {
  id: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Snak[]>;
  sitelinks?: Record<string, unknown>;
  missing?: string;
};

/** English label, falling back to the language-neutral 'mul' label Wikidata now uses for many titles. */
export const labelOf = (e: { labels?: Record<string, { value: string }> } | undefined) =>
  e?.labels?.en?.value ?? e?.labels?.['en-gb']?.value ?? e?.labels?.mul?.value ?? '';

const idsOf = (e: WdEntity, p: string) =>
  (e.claims?.[p] ?? [])
    .map((s) => (s.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((x): x is string => !!x);

const yearOf = (e: WdEntity, props: string[]) => {
  for (const p of props) {
    for (const s of e.claims?.[p] ?? []) {
      const t = (s.mainsnak?.datavalue?.value as { time?: string } | undefined)?.time;
      const m = t?.match(/^[+-](\d{4})/);
      if (m) return m[1];
    }
  }
  return '';
};

export function wdCategory(e: WdEntity): Exclude<Category, 'Albums'> | null {
  const p31 = idsOf(e, 'P31');
  for (const cat of ['Movies', 'TV shows', 'Books'] as const) {
    if (p31.some((q) => WD_TYPES[cat].has(q))) return cat;
  }
  return null;
}

/** People (director/creator/author) whose names we need to look up. */
export function wdCreatorIds(e: WdEntity): string[] {
  const cat = wdCategory(e);
  if (!cat) return [];
  return [...new Set(CREATOR_PROPS[cat].flatMap((p) => idsOf(e, p)))].slice(0, 2);
}

/** A Wikidata item as a title, or null if it isn't a film, series or book (or has no usable name). */
export function fromWikidata(e: WdEntity, names: Record<string, string>): Found | null {
  if (e.missing !== undefined || !/^Q\d+$/.test(e.id)) return null;
  const cat = wdCategory(e);
  const title = smartCase(clean(labelOf(e)));
  if (!cat || !title) return null;
  const creator = clean(wdCreatorIds(e).map((q) => names[q]).filter(Boolean).join(', '));
  return {
    key: `wd:${e.id}`,
    source: 'wikidata',
    category: cat,
    title,
    creator,
    year: yearOf(e, DATE_PROPS[cat]),
    popularity: Object.keys(e.sitelinks ?? {}).length,
    wikidata_id: e.id,
    musicbrainz_id: null,
  };
}

export type MbReleaseGroup = {
  id: string;
  title: string;
  score?: number;
  count?: number;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  'artist-credit'?: ({ name?: string; joinphrase?: string } | string)[];
};

const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A MusicBrainz release group as an album, or null if it isn't an album. */
export function fromMusicBrainz(g: MbReleaseGroup): Found | null {
  if (!MBID.test(g.id) || g['primary-type'] !== 'Album') return null;
  const title = clean(g.title);
  if (!title) return null;
  const artist = (g['artist-credit'] ?? [])
    .map((a) => (typeof a === 'string' ? a : `${a.name ?? ''}${a.joinphrase ?? ''}`))
    .join('');
  return {
    key: `mb:${g.id}`,
    source: 'musicbrainz',
    category: 'Albums',
    title,
    creator: clean(artist),
    year: (g['first-release-date'] ?? '').slice(0, 4),
    popularity: g.count ?? 0,
    wikidata_id: null,
    musicbrainz_id: g.id,
  };
}

/**
 * Album ranking. MusicBrainz's own score is relative and odd for short words ("OK Computer" scores low
 * for "ok computer"), and it has no popularity figure. So we rank ourselves: an exact title match counts
 * most, then every typed word appearing in the title or artist, then the release count (famous albums have
 * many reissues). Compilations, live albums and remixes sink below studio albums.
 */
export function rankAlbums(groups: MbReleaseGroup[], q: string): Found[] {
  const nq = normaliseQuery(q);
  const words = nq.split(' ').filter(Boolean);
  const scored = groups
    .map((g) => {
      const f = fromMusicBrainz(g);
      if (!f) return null;
      const title = normaliseQuery(f.title);
      const hay = `${title} ${normaliseQuery(f.creator)}`.split(' ');
      const hits = words.filter((w) => hay.includes(w)).length;
      if (!hits) return null;
      const extra = (g['secondary-types'] ?? []).length ? 0.4 : 1;
      const s = (title === nq ? 3 : 0) + (hits === words.length ? 1.5 : hits / words.length) + ((g.score ?? 0) / 100) + Math.sqrt(g.count ?? 0) / 3;
      return { f, s: s * extra };
    })
    .filter((x): x is { f: Found; s: number } => !!x);
  return scored.sort((a, b) => b.s - a.s).map((x) => x.f);
}

/** Wikidata items ranked by how many Wikipedias cover them (a decent popularity signal). */
export const rankByPopularity = (rows: Found[]) => [...rows].sort((a, b) => b.popularity - a.popularity);

/** Lucene query for MusicBrainz: match the words in the album title or the artist, albums only. */
export function mbQuery(q: string) {
  const words = q.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, ' ').trim().replace(/\s+/g, ' ');
  return `(releasegroup:(${words}) OR artist:(${words})) AND primarytype:album`;
}

/** Cache key: lower case, single spaces, no stray punctuation. */
export const normaliseQuery = (q: string) => q.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').trim().replace(/\s+/g, ' ').slice(0, 100);

/** Keys the app may ask us to add. */
export function parseKey(key: string): { source: Source; id: string } | null {
  const wd = key.match(/^wd:(Q\d+)$/);
  if (wd) return { source: 'wikidata', id: wd[1] };
  const mb = key.match(/^mb:(.+)$/);
  if (mb && MBID.test(mb[1])) return { source: 'musicbrainz', id: mb[1] };
  return null;
}

/** Some Wikidata labels are in capitals ("THE GODFATHER"); show those in title case. */
export function smartCase(s: string) {
  if (!/[A-Z]{3}/.test(s) || s !== s.toUpperCase()) return s;
  const small = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
  return s.toLowerCase().replace(/[\p{L}']+/gu, (w, i: number) => (i > 0 && small.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
}

/** Fits the titles table limits (title 1–200 chars, creator ≤ 200). */
const clean = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 200);
