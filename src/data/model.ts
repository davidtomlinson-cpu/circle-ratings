// Pure helpers ported from the prototype's logic class. Everything here is mock data
// that the backend will replace (friend ratings, global averages, worldwide counts).
import { color } from '../theme';
import { CATALOGUE } from './catalogue';
import { CATS, type Cat, type Item } from './types';

export const KIND: Record<Cat, { kind: string; bg: string; fg: string; verb: string; short: string }> = {
  Movies: { kind: 'Film', bg: color.s300, fg: color.s900, verb: 'watched', short: 'Films' },
  'TV shows': { kind: 'TV', bg: color.a300, fg: color.a900, verb: 'watched', short: 'TV' },
  Books: { kind: 'Book', bg: color.a200, fg: color.a800, verb: 'read', short: 'Books' },
  Albums: { kind: 'Album', bg: color.n300, fg: color.n900, verb: 'heard', short: 'Albums' },
};

export type Custom = Record<string, { title: string; by: string; year: string; cat: Cat }>;

export const ME = { name: 'Dave Tomlinson', first: 'Dave', initial: 'D', bg: color.s400 };

export const FRIENDS: { name: string; bg: string }[] = [
  { name: 'Mum', bg: color.a300 },
  { name: 'Dad', bg: color.s300 },
  { name: 'Sam', bg: color.n300 },
  { name: 'Priya', bg: color.a200 },
  { name: 'Jo', bg: color.s200 },
  { name: 'Tom', bg: color.a400 },
];
export const LOCKED: Record<string, boolean> = { Tom: true };

export function face(name: string) {
  if (name === 'You') return { name: 'You', initial: ME.initial, bg: ME.bg };
  const f = FRIENDS.find((x) => x.name === name);
  return { name, initial: name[0], bg: f ? f.bg : color.n300 };
}

/** FNV-1a, so mock numbers are stable between launches. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function item(key: string, custom: Custom = {}): Item {
  const [pre, i] = key.split('#');
  let title: string, by: string, year: string, cat: Cat, rank = 0;
  if (pre === 'E') {
    const e = CATALOGUE.extra[+i];
    ({ title, by, year } = e);
    cat = e.cat as Cat;
  } else if (pre === 'C') {
    const e = custom[i] ?? { title: 'Untitled', by: '', year: '', cat: 'Movies' as Cat };
    ({ title, by, year, cat } = e);
  } else {
    const e = CATALOGUE.top50[pre][+i];
    ({ title, by, year } = e);
    cat = pre as Cat;
    rank = +i + 1;
  }
  const k = KIND[cat];
  return {
    key, cat, title, by, year, rank,
    kind: k.kind, coverBg: k.bg, coverFg: k.fg, initial: title[0],
    sub: [k.kind, by, year].filter(Boolean).join(' · '),
  };
}

export function top50Keys(cat: Cat) {
  return CATALOGUE.top50[cat].map((_, i) => `${cat}#${i}`);
}
export const ALL_TOP_KEYS = CATS.flatMap(top50Keys);
export const EXTRA_KEYS = CATALOGUE.extra.map((_, i) => `E#${i}`);

/** A friend's rating of a title (0 = not rated). */
export function friendRating(name: string, key: string) {
  const f = CATALOGUE.fixed[`${name}|${key}`];
  if (f) return f;
  if (key[0] === 'C') return 0;
  const h = hash(name + key);
  if (h % 100 >= 42) return 0;
  const r = (h >>> 8) % 10;
  return r < 4 ? 5 : r < 8 ? 4 : r < 9 ? 3 : 2;
}

export function circleAvg(key: string) {
  const r = FRIENDS.map((f) => friendRating(f.name, key)).filter(Boolean);
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
}

export function everyoneAvg(key: string) {
  const rank = key[0] === 'E' || key[0] === 'C' ? 0 : +key.split('#')[1] + 1;
  const h = (hash('g' + key) % 100) / 100;
  const base = rank ? 4.92 - rank * 0.014 : 4.3;
  return Math.min(4.98, base - 0.08 + h * 0.16);
}

export function tasteMatch(name: string, my: Record<string, number>) {
  const d: number[] = [];
  Object.keys(my).forEach((k) => {
    const r = friendRating(name, k);
    if (r) d.push(Math.abs(r - my[k]));
  });
  const pct = d.length ? Math.round(100 - (d.reduce((a, b) => a + b, 0) / d.length) * 20) : 50;
  return { pct: Math.max(35, Math.min(99, pct)), overlap: d.length };
}

export function friendList(name: string) {
  return [...ALL_TOP_KEYS, ...EXTRA_KEYS]
    .map((k) => ({ key: k, v: friendRating(name, k) }))
    .filter((x) => x.v)
    .sort((a, b) => b.v - a.v);
}

/** Worldwide five-heart counts (mock). */
export function worldCount(key: string) {
  const h = hash('w' + key);
  return Math.round(everyoneAvg(key) * 1320 + (h % 300));
}
export function worldToday(key: string) {
  return 40 + (hash('t' + key) % 140);
}
export const WORLD_BASE_TOTAL = 748_360;
export const CITIES = ['Toronto', 'Leeds', 'Melbourne', 'Lisbon', 'Osaka', 'Glasgow', 'Austin', 'Cape Town', 'Dublin', 'Bristol'];

export const BUDGET = 60;
export const HEART_WORDS = ['Slide across the hearts', 'Not for me', 'It was OK', 'Liked it', 'Really liked it', 'Loved it'];

export function ago(t: number, now = Date.now()) {
  const m = Math.round((now - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

export function joinNames(n: string[]) {
  if (n.length <= 3) return n.join(', ').replace(/, ([^,]*)$/, ' and $1');
  return `${n.slice(0, 3).join(', ')} and ${n.length - 3} more`;
}

export const monthStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();
export const nextMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 1);
export const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
