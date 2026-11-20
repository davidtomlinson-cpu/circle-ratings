import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Cat } from '../data/types';
import { useApp, type TitleRow } from '../state/store';
import { supabase } from './supabase';

export type TrendRow = { key: string; people: number; previous: number };

/**
 * Trending on SofaList: titles the most different people rated or added to a watchlist in the last 7 days.
 * The server only lists a title once at least 3 people have, and never says who.
 */
export function useTrending(cat: Cat | 'All' = 'All', limit = 20) {
  const learnTitles = useApp((s) => s.learnTitles);
  const [rows, setRows] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.rpc('trending_titles', { p_category: cat === 'All' ? null : cat, p_days: 7, p_limit: limit });
    setLoading(false);
    setError(!!e);
    if (!data) return;
    const list = data as (Omit<TitleRow, 'id' | 'source'> & { people: number; previous: number })[];
    learnTitles(list.map((r) => ({ ...r, source: r.key.includes(':') ? 'catalogue' : 'static' })));
    setRows(list.map((r) => ({ key: r.key, people: Number(r.people), previous: Number(r.previous) })));
  }, [cat, limit, learnTitles]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return { rows, loading, error, reload: load };
}

/** "NEW" if nobody had it last week, otherwise the change in people. */
export function movement(r: TrendRow): string {
  if (!r.previous) return 'NEW';
  const d = r.people - r.previous;
  return d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '–';
}
