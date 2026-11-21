import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Cat } from '../data/types';
import { useApp, type TitleRow } from '../state/store';
import { supabase } from './supabase';

export type WorldRow = {
  key: string; rank: number; previousRank: number | null; score: number; source: 'wikipedia' | 'listenbrainz'; releaseDate: string | null;
};

/**
 * Trending in the wider world this week, refreshed daily on the server:
 * films, TV and books by English Wikipedia page views, albums by estimated ListenBrainz listeners.
 */
/** `inCinemas`: only trending films released in UK cinemas in the last 8 weeks (not streaming-only). */
export function useWorldTrending(cat: Cat | 'All' = 'All', limit = 30, inCinemas = false) {
  const learnTitles = useApp((s) => s.learnTitles);
  const [rows, setRows] = useState<WorldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.rpc('world_trending', { p_category: cat === 'All' ? null : cat, p_limit: limit, p_in_cinemas: inCinemas });
    setLoading(false);
    setError(!!e);
    if (!data) return;
    const list = data as (Omit<TitleRow, 'source'> & { rank: number; previous_rank: number | null; score: number; source: WorldRow['source']; release_date: string | null })[];
    learnTitles(list.map((r) => ({ id: r.id, key: r.key, category: r.category, title: r.title, creator: r.creator, year: r.year, source: r.key.includes(':') ? 'catalogue' : 'static' })));
    setRows(list.map((r) => ({ key: r.key, rank: r.rank, previousRank: r.previous_rank, score: Number(r.score), source: r.source, releaseDate: r.release_date })));
  }, [cat, limit, inCinemas, learnTitles]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return { rows, loading, error, reload: load };
}

/** "NEW" if it wasn't on yesterday's list, otherwise places moved since then. */
export function worldMovement(r: WorldRow): string {
  if (r.previousRank == null) return 'NEW';
  const d = r.previousRank - r.rank;
  return d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '–';
}

const compact = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);

/** "1.2M Wikipedia views" or "about 640 listeners". */
export const worldScore = (r: WorldRow) =>
  r.source === 'wikipedia' ? `${compact(r.score)} Wikipedia views` : `about ${compact(r.score)} listeners on ListenBrainz`;

/** "Out since 13 Nov" for the cinema list. */
export const releasedLine = (r: WorldRow) =>
  r.releaseDate ? `Out since ${new Date(`${r.releaseDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'In cinemas now';
