import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { openTitle } from '../components/TitleRow';
import { BackHeader, Chip, ChipRow, Disc, H, ListRow, Page, T } from '../components/ui';
import { item } from '../data/model';
import { CATS, type Cat } from '../data/types';
import { supabase } from '../lib/supabase';
import { useApp } from '../state/store';
import { c, color } from '../theme';

type Top = { key: string; avg_hearts: number; ratings: number };

export default function Top20() {
  const my = useApp((s) => s.my);
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [rows, setRows] = useState<Top[] | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const { data } = await supabase.rpc('everyone_top20', { p_category: cat === 'All' ? null : cat });
    setRows((data as Top[]) ?? []);
  }, [cat]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Page>
      <BackHeader title="Top 20" />
      <View>
        <H size={26}>Everyone’s Top 20</H>
        <T size={13} color={c.textSoft}>Pooled anonymously from every rating on the app. Your circle’s lists stay private.</T>
      </View>
      <ChipRow>
        {(['All', ...CATS] as const).map((x) => <Chip key={x} label={x} on={cat === x} onPress={() => setCat(x)} />)}
      </ChipRow>
      <View style={{ marginHorizontal: -6 }}>
        {(rows ?? []).map((r, i) => {
          const it = item(r.key);
          return (
            <ListRow
              key={r.key}
              onPress={() => openTitle(r.key)}
              disc={<Disc size={36} bg={i < 3 ? c.primary : color.n800} fg={i < 3 ? c.text : color.n100} label={String(i + 1)} />}
              title={it.title}
              sub={it.sub}
              extra={my[r.key] ? <T size={11} weight="bold" color={color.s300}>You {my[r.key]} ♥</T> : undefined}
              right={<H size={18}>{Number(r.avg_hearts).toFixed(1)}</H>}
            />
          );
        })}
      </View>
      {rows && !rows.length && (
        <T size={14} color={c.textMuted} center style={{ paddingVertical: 20 }}>Not enough ratings yet. A title joins once 3 people have rated it.</T>
      )}
    </Page>
  );
}
