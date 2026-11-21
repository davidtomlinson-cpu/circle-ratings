// Category tabs shared by the Trending and Loved by the Club screens.
import type { Cat } from './types';

export type TrendCat = 'Films' | 'TV series' | 'Albums' | 'Books';
export const TREND_CATS: { label: TrendCat; cat: Cat }[] = [
  { label: 'Films', cat: 'Movies' },
  { label: 'TV series', cat: 'TV shows' },
  { label: 'Albums', cat: 'Albums' },
  { label: 'Books', cat: 'Books' },
];
