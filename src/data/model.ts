// Pure helpers for titles and dates. Ported from the prototype's logic class.
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
