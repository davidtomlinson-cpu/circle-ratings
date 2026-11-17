import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Icon } from '../../components/Icon';
import { AddBtn, openTitle } from '../../components/TitleRow';
import { Card, Chip, ChipRow, Disc, H, HeartPill, ListRow, Page, Row, T } from '../../components/ui';
import { TREND_CATS, TRENDING, type TrendCat } from '../../data/feeds';
import { item } from '../../data/model';
import { useApp } from '../../state/store';
import { c, color } from '../../theme';

export default function Trending() {
  const my = useApp((s) => s.my);
  const openSheet = useApp((s) => s.openSheet);
  const [cat, setCat] = useState<TrendCat>('Films');
  const rows = TRENDING[cat];

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
        <H size={26}>Trending today</H>
        {/* The live list comes from a daily backend job. Until that exists we show sample rows and say so. */}
        <T size={12} color={c.textMuted}>Sample data · the daily feed arrives with the backend</T>
      </View>

      <ChipRow>
        {TREND_CATS.map((t) => <Chip key={t.label} label={t.label} on={cat === t.label} onPress={() => setCat(t.label)} />)}
      </ChipRow>

      <View style={{ marginHorizontal: -6 }}>
        {rows.map((r, i) => {
          const it = item(r.key);
          const v = my[r.key];
          return (
            <ListRow
              key={r.key}
              onPress={() => openTitle(r.key)}
              disc={<Disc size={36} bg={i < 3 ? c.primary : color.n800} fg={i < 3 ? c.text : color.n100} label={String(i + 1)} />}
              title={it.title}
              sub={[it.by, it.year].filter(Boolean).join(' · ')}
              extra={
                <Row gap={8}>
                  <T size={12} color={color.s300} numberOfLines={1} style={{ flexShrink: 1 }}>{r.why}</T>
                  <T size={11} weight="bold" color={r.move === 'NEW' ? color.a300 : r.move.startsWith('▲') ? color.s300 : color.n400}>{r.move}</T>
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
