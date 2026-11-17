// Local app state. Mirrors the prototype's per-user state so the UI can be built and
// tested offline. When the backend lands, the persisted slice becomes a cache of
// server data and the actions become API calls.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BUDGET, FRIENDS, monthStart, type Custom } from '../data/model';
import type { Cat } from '../data/types';

type Flags = Record<string, 1 | 0 | boolean>;
export type Visibility = 'all' | 'some' | 'locked';

type Persisted = {
  want: Record<string, 1 | 0>;
  my: Record<string, number>;
  rAt: Record<string, number>;
  fresh: Record<string, 1>; // rated from the watchlist → eligible for Loved worldwide
  comments: Record<string, [string, string][]>;
  custom: Custom;
  vis: Visibility;
  visTo: Record<string, boolean>;
  settings: { contribute: boolean; notify: boolean; remind: boolean };
  read: Flags;
};

type Ui = {
  sheet: { open: boolean; key: string; val: number };
  toast: { key: string; val: number; id: number } | null;
};

type Actions = {
  toggleWant: (key: string, on?: boolean) => void;
  openSheet: (key: string) => void;
  setSheetVal: (val: number) => void;
  closeSheet: () => void;
  saveRating: () => void;
  addComment: (key: string, text: string) => void;
  addCustom: (title: string, cat: Cat, by?: string, year?: string) => string;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  setSetting: (k: keyof Persisted['settings'], v: boolean) => void;
  setVis: (v: Visibility) => void;
  setVisTo: (name: string, on: boolean) => void;
  hideToast: () => void;
  reset: () => void;
};

const DEFAULTS: Persisted = {
  want: { 'Movies#14': 1, 'Movies#21': 1, 'Movies#32': 1, 'TV shows#4': 1, 'TV shows#24': 1, 'Books#11': 1, 'Albums#4': 1, 'Albums#8': 1 },
  my: {
    'Movies#0': 5, 'Movies#3': 4, 'Movies#4': 5, 'Movies#13': 4, 'Movies#20': 5,
    'TV shows#0': 5, 'TV shows#1': 4, 'TV shows#2': 5, 'TV shows#10': 5,
    'Books#5': 4, 'Books#10': 3, 'Albums#0': 5, 'Albums#9': 4, 'Albums#27': 3,
  },
  rAt: {},
  fresh: {},
  comments: {},
  custom: {},
  vis: 'all',
  visTo: {},
  settings: { contribute: true, notify: true, remind: true },
  read: {},
};

export type State = Persisted & Ui & Actions;

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      sheet: { open: false, key: 'Movies#0', val: 0 },
      toast: null,

      toggleWant: (key, on) =>
        set((s) => ({ want: { ...s.want, [key]: (on ?? !s.want[key]) ? 1 : 0 } })),

      openSheet: (key) => set((s) => ({ sheet: { open: true, key, val: s.my[key] ?? 0 } })),
      setSheetVal: (val) => set((s) => (s.sheet.val === val ? s : { sheet: { ...s.sheet, val } })),
      closeSheet: () => set((s) => ({ sheet: { ...s.sheet, open: false } })),

      saveRating: () => {
        const s = get();
        const { key, val } = s.sheet;
        if (!val || jarCost(s, key, val) > jarLeft(s)) return;
        const want = { ...s.want };
        const fresh = { ...s.fresh };
        if (want[key]) fresh[key] = 1;
        delete want[key];
        set({
          my: { ...s.my, [key]: val },
          rAt: { ...s.rAt, [key]: Date.now() },
          want,
          fresh,
          sheet: { ...s.sheet, open: false },
        });
        setTimeout(() => set({ toast: { key, val, id: Date.now() } }), 350);
      },

      addComment: (key, text) =>
        set((s) => ({ comments: { ...s.comments, [key]: [...(s.comments[key] ?? []), ['You', text]] } })),

      addCustom: (title, cat, by = '', year = '') => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        set((s) => ({
          custom: { ...s.custom, [id]: { title, by, year, cat } },
          want: { ...s.want, [`C#${id}`]: 1 },
        }));
        return `C#${id}`;
      },

      markRead: (id) => set((s) => ({ read: { ...s.read, [id]: 1 } })),
      markAllRead: (ids) => set((s) => ({ read: { ...s.read, ...Object.fromEntries(ids.map((i) => [i, 1])) } })),
      setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),
      setVis: (vis) => set({ vis }),
      setVisTo: (name, on) => set((s) => ({ visTo: { ...s.visTo, [name]: on } })),
      hideToast: () => set({ toast: null }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'circle-ratings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ sheet, toast, ...rest }) =>
        Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as Persisted,
    },
  ),
);

// ---- Derived values -------------------------------------------------------

type JarInput = Pick<Persisted, 'my' | 'rAt'>;

/** Hearts spent this calendar month. */
export function jarSpent(s: JarInput, now = new Date()) {
  const m = monthStart(now);
  return Object.keys(s.my)
    .filter((k) => (s.rAt[k] ?? 0) >= m)
    .reduce((a, k) => a + s.my[k], 0);
}
export const jarLeft = (s: JarInput, now = new Date()) => Math.max(0, BUDGET - jarSpent(s, now));

/** New rating costs its hearts; raising a rating made this month costs the difference. */
export function jarCost(s: JarInput, key: string, val: number, now = new Date()) {
  const old = (s.rAt[key] ?? 0) >= monthStart(now) ? (s.my[key] ?? 0) : 0;
  return Math.max(0, val - old);
}

export function viewers(s: Pick<Persisted, 'vis' | 'visTo'>) {
  return FRIENDS.map((f) => f.name).filter((n) => s.vis === 'all' || (s.vis === 'some' && s.visTo[n]));
}

export const wantKeys = (s: Pick<Persisted, 'want'>) => Object.keys(s.want).filter((k) => s.want[k]);
