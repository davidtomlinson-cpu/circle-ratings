import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { item } from '../data/model';
import { useApp } from '../state/store';
import { c, color } from '../theme';
import { Btn, Disc, HeartPill, ListRow } from './ui';

export const titleHref = (key: string) => `/title/${encodeURIComponent(key)}` as const;
export const openTitle = (key: string) => router.push(titleHref(key) as never);

/**
 * A title in a list. Shows the user's rating pill once rated, otherwise `action`
 * (defaults to a Rate button).
 */
export function TitleRow({ k, sub, extra, action, disc, bg }: { k: string; sub?: string; extra?: ReactNode; action?: ReactNode; disc?: ReactNode; bg?: string }) {
  const custom = useApp((s) => s.custom);
  const v = useApp((s) => s.my[k] ?? 0);
  const openSheet = useApp((s) => s.openSheet);
  const it = item(k, custom);
  return (
    <ListRow
      bg={bg}
      onPress={() => openTitle(k)}
      disc={disc ?? <Disc bg={it.coverBg} fg={it.coverFg} label={it.initial} />}
      title={it.title}
      sub={sub ?? it.sub}
      extra={extra}
      right={v ? <HeartPill v={v} onPress={() => openSheet(k)} /> : action ?? <RateBtn k={k} />}
    />
  );
}

export function RateBtn({ k }: { k: string }) {
  const openSheet = useApp((s) => s.openSheet);
  return <Btn small label="Rate" kind="quiet" onPress={() => openSheet(k)} style={{ backgroundColor: c.primary }} />;
}

export function AddBtn({ k }: { k: string }) {
  const on = useApp((s) => !!s.want[k]);
  const toggle = useApp((s) => s.toggleWant);
  return (
    <Btn
      small
      label={on ? '✓ Watchlist' : '+ Add'}
      kind={on ? 'positive' : 'secondary'}
      onPress={() => toggle(k)}
      style={!on ? { backgroundColor: color.n800, borderWidth: 1, borderColor: color.n700 } : undefined}
    />
  );
}
