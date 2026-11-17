// App state. The signed-in user's data lives in Supabase; this store is a local copy
// that updates optimistically and rolls back if the server refuses a change.
// The server is the authority on the rules (heart budget, worldwide eligibility, privacy).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { friendlyError, supabase } from '../lib/supabase';
import { BUDGET, monthStart, type Custom } from '../data/model';
import type { Cat } from '../data/types';

export type Visibility = 'all' | 'some' | 'locked';
export type Member = {
  id: string;
  name: string;
  seesMine: boolean; // can they see my list (my privacy settings)
  iSee: boolean; // can I see their list (their privacy settings)
  rated: number | null; // only when I can see their list
  topKey: string | null;
};
type Settings = { contribute: boolean; notify: boolean; remind: boolean };

type UserData = {
  userId: string | null;
  name: string;
  want: Record<string, 1 | 0>;
  my: Record<string, number>;
  rAt: Record<string, number>;
  fresh: Record<string, 1>; // rated from the watchlist → eligible for Loved worldwide
  custom: Custom;
  vis: Visibility;
  grants: Record<string, boolean>; // member id → can see my list (when vis = 'some')
  settings: Settings;
  circle: Member[];
  titleIds: Record<string, number>; // app key → titles.id
};

type Ui = {
  ready: boolean; // auth state known
  loading: boolean; // fetching the user's data
  sheet: { open: boolean; key: string; val: number };
  toast: { key: string; val: number; id: number } | null;
  error: { msg: string; id: number } | null;
  unread: number;
};

type Actions = {
  setSession: (userId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  refreshCircle: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  removeMember: (id: string) => Promise<boolean>;
  toggleWant: (key: string, on?: boolean) => void;
  openSheet: (key: string) => void;
  setSheetVal: (val: number) => void;
  closeSheet: () => void;
  saveRating: () => void;
  addCustom: (title: string, cat: Cat, by?: string, year?: string) => string;
  setVis: (v: Visibility) => void;
  setGrant: (memberId: string, on: boolean) => void;
  setSetting: (k: keyof Settings, v: boolean) => void;
  setName: (name: string) => void;
  showError: (msg: string) => void;
  hideToast: () => void;
  hideError: () => void;
};

const EMPTY: UserData = {
  userId: null,
  name: '',
  want: {},
  my: {},
  rAt: {},
  fresh: {},
  custom: {},
  vis: 'all',
  grants: {},
  settings: { contribute: true, notify: true, remind: true },
  circle: [],
  titleIds: {},
};

export type State = UserData & Ui & Actions;

export const useApp = create<State>()(
  persist(
    (set, get) => {
      /** Run a server write; on failure restore `undo` and tell the user. */
      async function write(run: () => PromiseLike<{ error: { message?: string; hint?: string } | null }>, undo: Partial<UserData>) {
        const { error } = await run();
        if (error) {
          set(undo);
          get().showError(friendlyError(error));
        }
        return !error;
      }
      const tid = (key: string) => get().titleIds[key];

      return {
        ...EMPTY,
        ready: false,
        loading: false,
        sheet: { open: false, key: 'Movies#0', val: 0 },
        toast: null,
        error: null,
        unread: 0,

        setSession: async (userId) => {
          const prev = get().userId;
          if (!userId) {
            set({ ...EMPTY, ready: true, loading: false, unread: 0 });
            return;
          }
          // A different account on this device: drop the old copy first.
          if (prev && prev !== userId) set({ ...EMPTY });
          set({ userId, ready: true });
          await get().refresh();
        },

        refresh: async () => {
          const uid = get().userId;
          if (!uid) return;
          set({ loading: true });
          const [titles, profile, want, ratings, circle, grants] = await Promise.all([
            supabase.from('titles').select('id, key, category, title, creator, year, source').or(`source.neq.custom,created_by.eq.${uid}`),
            supabase.from('profiles').select('display_name, visibility, contribute_worldwide, notify_circle, remind_billing').eq('id', uid).single(),
            supabase.from('watchlist').select('title_id'),
            supabase.from('ratings').select('title_id, hearts, rated_at, from_watchlist').eq('user_id', uid),
            supabase.rpc('circle_overview'),
            supabase.from('visibility_grants').select('viewer_id'),
          ]);
          const err = titles.error || profile.error || want.error || ratings.error || circle.error || grants.error;
          if (err) {
            set({ loading: false });
            get().showError(friendlyError(err));
            return;
          }
          const titleIds: Record<string, number> = {};
          const keyOf: Record<number, string> = {};
          const custom: Custom = {};
          for (const t of titles.data) {
            titleIds[t.key] = t.id;
            keyOf[t.id] = t.key;
            if (t.source === 'custom') custom[t.key.slice(2)] = { title: t.title, by: t.creator, year: t.year, cat: t.category as Cat };
          }
          const my: Record<string, number> = {};
          const rAt: Record<string, number> = {};
          const fresh: Record<string, 1> = {};
          for (const r of ratings.data) {
            const k = keyOf[r.title_id];
            if (!k) continue;
            my[k] = r.hearts;
            rAt[k] = Date.parse(r.rated_at);
            if (r.from_watchlist) fresh[k] = 1;
          }
          const p = profile.data;
          set({
            loading: false,
            titleIds,
            custom,
            my,
            rAt,
            fresh,
            want: Object.fromEntries(want.data.filter((w) => keyOf[w.title_id]).map((w) => [keyOf[w.title_id], 1 as const])),
            name: p.display_name,
            vis: p.visibility as Visibility,
            settings: { contribute: p.contribute_worldwide, notify: p.notify_circle, remind: p.remind_billing },
            circle: toMembers(circle.data),
            grants: Object.fromEntries(grants.data.map((g) => [g.viewer_id, true])),
          });
          void get().refreshUnread();
        },

        refreshCircle: async () => {
          const { data, error } = await supabase.rpc('circle_overview');
          if (error) return get().showError(friendlyError(error));
          set({ circle: toMembers(data) });
        },

        refreshUnread: async () => {
          const uid = get().userId;
          if (!uid) return;
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .is('read_at', null);
          set({ unread: count ?? 0 });
        },

        removeMember: async (id) => {
          const prev = get().circle;
          set({ circle: prev.filter((m) => m.id !== id) });
          const { error } = await supabase.rpc('remove_from_circle', { p_member: id });
          if (error) {
            set({ circle: prev });
            get().showError(friendlyError(error));
            return false;
          }
          return true;
        },

        toggleWant: (key, on) => {
          const s = get();
          const next = on ?? !s.want[key];
          const prev = s.want;
          set({ want: { ...prev, [key]: next ? 1 : 0 } });
          const id = tid(key);
          if (!id) return;
          void write(
            () => (next
              ? supabase.from('watchlist').upsert({ title_id: id }, { onConflict: 'user_id,title_id', ignoreDuplicates: true })
              : supabase.from('watchlist').delete().eq('title_id', id)),
            { want: prev },
          );
        },

        openSheet: (key) => set((s) => ({ sheet: { open: true, key, val: s.my[key] ?? 0 } })),
        setSheetVal: (val) => set((s) => (s.sheet.val === val ? s : { sheet: { ...s.sheet, val } })),
        closeSheet: () => set((s) => ({ sheet: { ...s.sheet, open: false } })),

        saveRating: () => {
          const s = get();
          const { key, val } = s.sheet;
          if (!val || jarCost(s, key, val) > jarLeft(s)) return;
          const id = tid(key);
          if (!id) return s.showError('This title isn’t synced yet. Try again in a moment.');
          const undo = { my: s.my, rAt: s.rAt, want: s.want, fresh: s.fresh };
          const want = { ...s.want };
          const fresh = { ...s.fresh };
          if (want[key]) fresh[key] = 1;
          delete want[key];
          set({ my: { ...s.my, [key]: val }, rAt: { ...s.rAt, [key]: Date.now() }, want, fresh, sheet: { ...s.sheet, open: false } });
          void (async () => {
            const res = await supabase
              .from('ratings')
              .upsert({ title_id: id, hearts: val }, { onConflict: 'user_id,title_id' })
              .select('rated_at, from_watchlist')
              .single();
            if (res.error) {
              set(undo);
              return get().showError(friendlyError(res.error));
            }
            // Take the server's word on timing and worldwide eligibility.
            set((st) => ({
              rAt: { ...st.rAt, [key]: Date.parse(res.data.rated_at) },
              fresh: res.data.from_watchlist ? { ...st.fresh, [key]: 1 } : st.fresh,
              toast: { key, val, id: Date.now() },
            }));
          })();
        },

        addCustom: (title, cat, by = '', year = '') => {
          const local = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          const key = `C#${local}`;
          const s = get();
          const undo = { custom: s.custom, want: s.want };
          set({ custom: { ...s.custom, [local]: { title, by, year, cat } }, want: { ...s.want, [key]: 1 } });
          void (async () => {
            const ins = await supabase
              .from('titles')
              .insert({ key, category: cat, title, creator: by, year, source: 'custom', created_by: s.userId })
              .select('id')
              .single();
            if (ins.error) {
              set(undo);
              return get().showError(friendlyError(ins.error));
            }
            set((st) => ({ titleIds: { ...st.titleIds, [key]: ins.data.id } }));
            await write(() => supabase.from('watchlist').insert({ title_id: ins.data.id }), { want: undo.want });
          })();
          return key;
        },

        setVis: (vis) => {
          const prev = get().vis;
          set({ vis });
          void write(() => supabase.from('profiles').update({ visibility: vis }).eq('id', get().userId!), { vis: prev }).then((ok) => { if (ok) void get().refreshCircle(); });
        },

        setGrant: (memberId, on) => {
          const prev = get().grants;
          set({ grants: { ...prev, [memberId]: on } });
          void write(
            () => (on
              ? supabase.from('visibility_grants').insert({ owner_id: get().userId!, viewer_id: memberId })
              : supabase.from('visibility_grants').delete().eq('viewer_id', memberId)),
            { grants: prev },
          ).then((ok) => { if (ok) void get().refreshCircle(); });
        },

        setSetting: (k, v) => {
          const prev = get().settings;
          set({ settings: { ...prev, [k]: v } });
          const col = { contribute: 'contribute_worldwide', notify: 'notify_circle', remind: 'remind_billing' }[k];
          void write(() => supabase.from('profiles').update({ [col]: v }).eq('id', get().userId!), { settings: prev });
        },

        setName: (name) => {
          const prev = get().name;
          set({ name });
          void write(() => supabase.from('profiles').update({ display_name: name }).eq('id', get().userId!), { name: prev });
        },

        showError: (msg) => set({ error: { msg, id: Date.now() } }),
        hideToast: () => set({ toast: null }),
        hideError: () => set({ error: null }),
      };
    },
    {
      // Cached copy so the app opens instantly; refreshed from the server on launch.
      name: 'circle-ratings-cache-v3',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): UserData => ({
        userId: s.userId, name: s.name, want: s.want, my: s.my, rAt: s.rAt, fresh: s.fresh, custom: s.custom,
        vis: s.vis, grants: s.grants, settings: s.settings, circle: s.circle, titleIds: s.titleIds,
      }),
    },
  ),
);

type OverviewRow = { member_id: string; name: string; sees_mine: boolean; i_see_theirs: boolean; rated: number | null; top_title_key: string | null };
function toMembers(rows: OverviewRow[] | null): Member[] {
  return (rows ?? []).map((r) => ({
    id: r.member_id, name: r.name, seesMine: r.sees_mine, iSee: r.i_see_theirs,
    rated: r.rated == null ? null : Number(r.rated), topKey: r.top_title_key,
  }));
}

// ---- Derived values -------------------------------------------------------

type JarInput = Pick<UserData, 'my' | 'rAt'>;

/** Hearts spent this calendar month. Mirrors the server rule in ratings_before(). */
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

/** Names of circle members who can see my list and get rating notifications. */
export function viewers(s: Pick<UserData, 'vis' | 'grants' | 'circle'>) {
  return s.circle.filter((m) => s.vis === 'all' || (s.vis === 'some' && s.grants[m.id])).map((m) => m.name);
}

export const wantKeys = (s: Pick<UserData, 'want'>) => Object.keys(s.want).filter((k) => s.want[k]);

export function useMe() {
  const name = useApp((s) => s.name) || 'You';
  return { name, first: name.split(' ')[0], initial: name[0]?.toUpperCase() ?? '?' };
}
