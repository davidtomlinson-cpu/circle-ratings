import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Animated, View } from 'react-native';
import { AddBtn, openTitle } from '../../components/TitleRow';
import { Btn, Card, Chip, ChipRow, Disc, H, HeartGlyph, HeartPill, ListRow, Page, Row, T } from '../../components/ui';
import { TREND_CATS } from '../../data/feeds';
import { item } from '../../data/model';
import type { Cat } from '../../data/types';
import { useWorldwide } from '../../lib/useWorldwide';
import { useApp, useTitles } from '../../state/store';
import { c, color } from '../../theme';

function LiveBadge() {
  const [blink] = useState(() => new Animated.Value(1));
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
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [mode, setMode] = useState<'classics' | 'new'>('classics');
  const w = useWorldwide(cat, mode === 'classics');
  useTitles(w.rows.map((r) => r.key));
  const mine = (k: string) => s.settings.contribute && s.fresh[k] && s.my[k] === 5;

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
          <H size={34}>{w.total == null ? '–' : w.total.toLocaleString('en-GB')}</H>
          <T size={13} color={color.a200}>five-heart ratings so far</T>
        </Row>
        <T size={13} color={color.a100}>Updates live as people finish things from their watchlists.</T>
      </Card>

      <Card onPress={() => router.push('/top20')} style={{ paddingVertical: 14 }}>
        <Row>
          <View style={{ flex: 1 }}>
            <T size={14} weight="bold">Everyone’s Top 20</T>
            <T size={12} color={c.textMuted}>Highest average hearts across the app</T>
          </View>
          <Icon name="chevronRight" size={18} />
        </Row>
      </Card>

      <ChipRow>
        <Chip label="All" on={cat === 'All'} onPress={() => setCat('All')} />
        {TREND_CATS.map((t) => <Chip key={t.cat} label={t.label} on={cat === t.cat} onPress={() => setCat(t.cat)} />)}
      </ChipRow>
      <Row gap={4} style={{ alignSelf: 'flex-start', backgroundColor: color.n800, padding: 4, borderRadius: 999 }}>
        <Chip label="All-time classics" on={mode === 'classics'} onPress={() => setMode('classics')} />
        <Chip label="New & now" on={mode === 'new'} onPress={() => setMode('new')} />
      </Row>

      {w.error && (
        <Card style={{ gap: 10 }}>
          <T size={14}>Couldn’t load the worldwide list.</T>
          <Btn small label="Try again" onPress={w.reload} style={{ alignSelf: 'flex-start' }} />
        </Card>
      )}
      {!w.error && !w.loading && !w.rows.length && (
        <T size={14} color={c.textMuted} center style={{ paddingVertical: 20 }}>
          Nothing here yet. A title shows up once at least 3 people have loved it.
        </T>
      )}

      <View style={{ marginHorizontal: -6 }}>
        {w.rows.map((r, i) => {
          const it = item(r.key, s.custom);
          return (
            <ListRow
              key={r.key}
              onPress={() => openTitle(r.key)}
              disc={<Disc size={36} bg={i < 3 ? c.primary : color.n800} fg={i < 3 ? c.text : color.n100} label={String(i + 1)} />}
              title={it.title}
              sub={it.sub}
              extra={
                <Row gap={6}>
                  <HeartGlyph size={12} />
                  <T size={12} weight="bold" color={color.a300}>{r.total.toLocaleString('en-GB')}</T>
                  {!!r.today && <T size={12} color={c.textMuted}>+{r.today} today</T>}
                  {mine(r.key) && <T size={11} weight="bold" color={color.s300}>incl. you</T>}
                </Row>
              }
              right={s.my[r.key] ? <HeartPill v={s.my[r.key]} onPress={() => s.openSheet(r.key)} /> : <AddBtn k={r.key} />}
            />
          );
        })}
      </View>
    </Page>
  );
}
