export type Cat = 'Movies' | 'TV shows' | 'Books' | 'Albums';
export const CATS: Cat[] = ['Movies', 'TV shows', 'Books', 'Albums'];

export type Entry = { title: string; by: string; year: string };

export type Catalogue = {
  top50: Record<string, Entry[]>;
  extra: (Entry & { cat: string })[];
  seedComments: Record<string, [string, string][]>;
  fixed: Record<string, number>;
  contacts: string[];
};

/** A title as the UI sees it. Keys: "Movies#3" (Top 50), "E#2" (extra), "C#abc" (user-added). */
export type Item = {
  key: string;
  cat: Cat;
  title: string;
  by: string;
  year: string;
  rank: number; // 1–50 for Top 50 titles, 0 otherwise
  kind: string; // Film / TV / Book / Album
  coverBg: string;
  coverFg: string;
  initial: string;
  sub: string;
};
