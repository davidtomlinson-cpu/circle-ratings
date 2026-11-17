import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Cat } from '../data/types';
import { supabase } from './supabase';

export type WorldRow = { key: string; total: number; today: number };

/** Loved worldwide from the server. Titles only appear once they pass the vote threshold. */
export function useWorldwide(cat: Cat | 'All' = 'All', classics = true, limit = 30) {
  const [rows, setRows] = useState<WorldRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, sum] = await Promise.all([
      supabase.rpc('loved_worldwide', { p_category: cat === 'All' ? null : cat, p_classics: classics, p_limit: limit }),
      supabase.rpc('loved_worldwide_total'),
    ]);
    setLoading(false);
    setError(!!(list.error || sum.error));
    if (list.data) setRows((list.data as { key: string; total: number; today: number }[]).map((r) => ({ key: r.key, total: Number(r.total), today: Number(r.today) })));
    if (sum.data != null) setTotal(Number(sum.data));
  }, [cat, classics, limit]);

  // Refresh whenever the screen comes into view, and every 30s while it's open.
  useFocusEffect(
    useCallback(() => {
      void load();
      const id = setInterval(load, 30_000);
      return () => clearInterval(id);
    }, [load]),
  );

  return { rows, total, loading, error, reload: load };
}
