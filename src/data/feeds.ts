// Mock feeds. In production these come from the backend:
// - notifications: push/in-app notification table
// - trending: a daily scheduled job (TMDB trending, music charts, bestseller lists),
//   NOT client-side LLM calls as in the prototype.
import type { Cat } from './types';

export type Notif = { id: string; who: string; text: string; quote?: string; when: string; href: string };

export const NOTIFS: Notif[] = [
  { id: 'n1', who: 'Priya', text: 'Priya gave Parasite 5 ♥', when: '8m', href: '/title/Movies%2321' },
  { id: 'n2', who: 'Jo', text: 'Jo commented on Breaking Bad', quote: 'Season five is about as good as television gets.', when: '1h', href: '/title/TV%20shows%232' },
  { id: 'n3', who: 'Sam', text: 'Sam gave Kind of Blue 5 ♥', when: '3h', href: '/title/Albums%238' },
  { id: 'n5', who: 'Tom', text: 'Tom joined your circle', when: '3d', href: '/' },
  { id: 'n6', who: 'Mum', text: 'Mum gave The Godfather 4 ♥', when: '4d', href: '/title/Movies%230' },
];

export type TrendCat = 'Films' | 'TV series' | 'Albums' | 'Books';
export const TREND_CATS: { label: TrendCat; cat: Cat }[] = [
  { label: 'Films', cat: 'Movies' },
  { label: 'TV series', cat: 'TV shows' },
  { label: 'Albums', cat: 'Albums' },
  { label: 'Books', cat: 'Books' },
];

export type TrendRow = { key: string; why: string; move: 'NEW' | `▲ ${number}` | `▼ ${number}` | '–' };

/** Sample rows keyed to the extra catalogue (E#n). */
export const TRENDING: Record<TrendCat, TrendRow[]> = {
  Films: [
    { key: 'E#0', why: 'Back in cinemas for its anniversary', move: '▲ 2' },
    { key: 'E#4', why: 'Holiday favourite climbing streaming charts', move: 'NEW' },
    { key: 'E#2', why: 'Christmas TV slot announced', move: '▲ 1' },
    { key: 'E#1', why: 'Director’s new film just announced', move: '▼ 2' },
    { key: 'E#3', why: 'Award-season rewatch buzz', move: '–' },
  ],
  'TV series': [
    { key: 'E#7', why: 'New series started this week', move: 'NEW' },
    { key: 'E#6', why: 'Season finale tonight', move: '▲ 3' },
    { key: 'E#8', why: 'Christmas special confirmed', move: '▲ 1' },
    { key: 'E#5', why: 'Cast reunion trending online', move: '▼ 1' },
    { key: 'E#9', why: 'Spin-off news', move: '–' },
  ],
  Albums: [
    { key: 'E#15', why: 'Deluxe edition out Friday', move: '▲ 2' },
    { key: 'E#19', why: 'Stadium tour dates announced', move: 'NEW' },
    { key: 'E#16', why: 'Top of the streaming charts again', move: '–' },
    { key: 'E#18', why: 'Anniversary vinyl reissue', move: '▼ 1' },
    { key: 'E#17', why: 'Viral on short-form video', move: '▲ 1' },
  ],
  Books: [
    { key: 'E#13', why: 'Film adaptation trailer released', move: '▲ 4' },
    { key: 'E#10', why: 'Paperback out this week', move: 'NEW' },
    { key: 'E#11', why: 'TV series returns', move: '–' },
    { key: 'E#14', why: 'Book club pick of the month', move: '▼ 1' },
    { key: 'E#12', why: 'Prize shortlist announced', move: '▲ 1' },
  ],
};
