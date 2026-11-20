import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Icon } from '../../components/Icon';
import { AddBtn, openTitle } from '../../components/TitleRow';
import { Card, Chip, ChipRow, Disc, H, HeartPill, ListRow, Page, Row, T } from '../../components/ui';
import { TREND_CATS, type TrendCat } from '../../data/feeds';
import { item } from '../../data/model';
import { movement, useTrending } from '../../lib/useTrending';
import { useApp } from '../../state/store';
import { c, color } from '../../theme';

export default function Trending() {
  const my = useApp((s) => s.my);
  const custom = useApp((s) => s.custom);
  const openSheet = useApp((s) => s.openSheet);
  const [cat, setCat] = useState<TrendCat>('Films');
  const t = useTrending(TREND_CATS.find((x) => x.label === cat)!.cat);

  return (
    <Page tabs>
      <Card onPress={() => router.push('/world')} style={{ paddingVertical: 14 }}>
        <Row>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.a400 }} />
          <View style={{ flex: 1 }}>
            <T size={14} weight="bold">Loved worldwide · live</T>
            <T size={12} color={c.textMuted}>5 ♥ ratings from everyone’s watched lists</T>
          </View>
          <Icon name="chevronRight" size={18} />
        </Row>
      </Card>

      <View>
        <H size={26}>Trending this week</H>
        <T size={12} color={c.textMuted}>What the most people on SofaList rated or added in the last 7 days</T>
      </View>

      <ChipRow>
        {TREND_CATS.map((x) => <Chip key={x.label} label={x.label} on={cat === x.label} onPress={() => setCat(x.label)} />)}
      </ChipRow>

      {t.error && <T size={14} color={c.textMuted} center>Couldn’t load trending. Check your connection.</T>}
      {!t.error && !t.loading && !t.rows.length && (
        <T size={14} color={c.textMuted} center style={{ paddingVertical: 20 }}>
          Nothing trending yet. A title shows up here once at least 3 people rate it or add it in a week.
        </T>
      )}

      <View style={{ marginHorizontal: -6 }}>
        {t.rows.map((r, i) => {
          const it = item(r.key, custom);
          const v = my[r.key];
          const move = movement(r);
          return (
            <ListRow
              key={r.key}
              onPress={() => openTitle(r.key)}
              disc={<Disc size={36} bg={i < 3 ? c.primary : color.n800} fg={i < 3 ? c.text : color.n100} label={String(i + 1)} />}
              title={it.title}
              sub={[it.by, it.year].filter(Boolean).join(' · ')}
              extra={
                <Row gap={8}>
                  <T size={12} color={color.s300}>{r.people} people this week</T>
                  <T size={11} weight="bold" color={move === 'NEW' ? color.a300 : move.startsWith('▲') ? color.s300 : color.n400}>{move}</T>
                </Row>
              }
              right={v ? <HeartPill v={v} onPress={() => openSheet(r.key)} /> : <AddBtn k={r.key} />}
            />
          );
        })}
      </View>
    </Page>
  );
}
