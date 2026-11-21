import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Description = { summary: string; url: string | null };

// Kept for the session so going back and forth between titles doesn't refetch.
const memo = new Map<string, Description | null>();

/**
 * A short description of a title: the opening of its English Wikipedia article, fetched (and cached on the
 * server) by the catalogue function. null while loading or if there's none (e.g. titles people added themselves).
 */
export function useDescription(key: string): { description: Description | null; loading: boolean } {
  const [result, setResult] = useState<{ key: string; d: Description | null } | null>(memo.has(key) ? { key, d: memo.get(key)! } : null);
  const custom = key.startsWith('C#');

  useEffect(() => {
    if (custom || memo.has(key)) return;
    let live = true;
    void supabase.functions.invoke('catalogue', { body: { action: 'describe', key } }).then(({ data, error }) => {
      const d = !error && data?.summary ? { summary: String(data.summary), url: data.url ? String(data.url) : null } : null;
      if (!error) memo.set(key, d); // don't remember failures: try again next time
      if (live) setResult({ key, d });
    });
    return () => { live = false; };
  }, [key, custom]);

  const done = custom || result?.key === key || memo.has(key);
  return { description: memo.get(key) ?? (result?.key === key ? result.d : null), loading: !done };
}
