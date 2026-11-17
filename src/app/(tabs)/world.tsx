import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { AddBtn, openTitle } from '../../components/TitleRow';
import { Card, Chip, ChipRow, Disc, H, HeartGlyph, ListRow, Page, Row, T } from '../../components/ui';
import { ALL_TOP_KEYS, CITIES, EXTRA_KEYS, hash, item, worldCount, worldToday, WORLD_BASE_TOTAL } from '../../data/model';
import { TREND_CATS } from '../../data/feeds';
import type { Cat } from '../../data/types';
import { useApp } from '../../state/store';
import { c, color } from '../../theme';

function useTick(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

function LiveBadge() {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(blink, { toValue: 0.2, duration: 700, useNativeDriver: true }),
      Animated.timing(blink, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [blink]);
  return (
    <Row gap={5} style={{ backgroundColor: color.a800, paddingHorizontal: 9, height: 22, borderRadius: 11 }}>
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.a400, opacity: blink }} />
      <T size={10} weight="extrabold" color={color.a300} style={{ lineHeight: 12 }}>LIVE</T>
    </Row>
  );
}

export default function World() {
  const s = useApp();
  const tick = useTick(2200);
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [mode, setMode] = useState<'classics' | 'new'>('classics');

  // Your own eligible 5 ♥ ratings count towards the totals.
  const mine = (k: string) => (s.settings.contribute && s.fresh[k] && s.my[k] === 5 ? 1 : 0);
  const customKeys = Object.keys(s.custom).map((id) => `C#${id}`);
  const pool = mode === 'classics' ? ALL_TOP_KEYS : [...EXTRA_KEYS, ...customKeys];
  const rows = pool
    .filter((k) => cat === 'All' || item(k, s.custom).cat === cat)
    .map((k) => ({ k, n: (k[0] === 'C' ? 0 : worldCount(k)) + mine(k) }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 30);

  const total = WORLD_BASE_TOTAL + tick * 3 + Object.keys(s.fresh).reduce((a, k) => a + mine(k), 0);
  const tickKey = ALL_TOP_KEYS[hash('tick' + tick) % ALL_TOP_KEYS.length];

  return (
    <Page tabs>
      <View style={{ gap: 6 }}>
        <Row gap={10}><H size={26}>Loved worldwide</H><LiveBadge /></Row>
        <T size={13} color={c.textSoft}>
          What the world is watching and loving right now. Only 5 ♥ ratings made after finishing something from a watchlist count, added anonymously. Ticking off things people saw years ago doesn’t.
        </T>
      </View>

      <Card bg={color.a700} style={{ gap: 4 }}>
        <Row gap={8} style={{ alignItems: 'baseline' }}>
          <H size={34}>{total.toLocaleString('en-GB')}</H>
          <T size={13} color={color.a200}>five-heart ratings so far</T>
        </Row>
        <T size={13} color={color.a100} numberOfLines={1}>
          Just now · someone in {CITIES[tick % CITIES.length]} gave {item(tickKey).title} 5 ♥
        </T>
      </Card>

      <ChipRow>
        <Chip label="All" on={cat === 'All'} onPress={() => setCat('All')} />
        {TREND_CATS.map((t) => <Chip key={t.cat} label={t.label} on={cat === t.cat} onPress={() => setCat(t.cat)} />)}
      </ChipRow>
      <Row gap={4} style={{ alignSelf: 'flex-start', backgroundColor: color.n800, padding: 4, borderRadius: 999 }}>
        <Chip label="All-time classics" on={mode === 'classics'} onPress={() => setMode('classics')} />
        <Chip label="New & now" on={mode === 'new'} onPress={() => setMode('new')} />
      </Row>

      <View style={{ marginHorizontal: -6 }}>
        {rows.map((r, i) => {
          const it = item(r.k, s.custom);
          return (
            <ListRow
              key={r.k}
              onPress={() => openTitle(r.k)}
              disc={<Disc size={36} bg={i < 3 ? c.primary : color.n800} fg={i < 3 ? c.text : color.n100} label={String(i + 1)} />}
              title={it.title}
              sub={it.sub}
              extra={
                <Row gap={6}>
                  <HeartGlyph size={12} />
                  <T size={12} weight="bold" color={color.a300}>{r.n.toLocaleString('en-GB')}</T>
                  <T size={12} color={c.textMuted}>+{worldToday(r.k)} today</T>
                  {!!mine(r.k) && <T size={11} weight="bold" color={color.s300}>incl. you</T>}
                </Row>
              }
              right={s.my[r.k] ? undefined : <AddBtn k={r.k} />}
            />
          );
        })}
      </View>
    </Page>
  );
}
