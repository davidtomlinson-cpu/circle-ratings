import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Icon } from '../../components/Icon';
import { openTitle } from '../../components/TitleRow';
import { Card, Chip, ChipRow, Disc, H, HeartPill, ListRow, Page, ProgressBar, Row, T, tint } from '../../components/ui';
import { KIND, top50Keys, item } from '../../data/model';
import { CATS, type Cat } from '../../data/types';
import { useApp, useMe } from '../../state/store';
import { c, color } from '../../theme';

const RING = 240;
const STROKE = 22;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const ARC = CIRC * 0.75; // 270°

function ProgressRing({ pct }: { pct: number }) {
  return (
    <View style={{ width: RING, height: RING, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING} height={RING} style={{ position: 'absolute', transform: [{ rotate: '135deg' }] }}>
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color.a400} />
            <Stop offset="1" stopColor={color.s400} />
          </LinearGradient>
        </Defs>
        <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={color.n800} strokeWidth={STROKE} fill="none" strokeDasharray={`${ARC} ${CIRC}`} strokeLinecap="round" />
        <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="url(#g)" strokeWidth={STROKE} fill="none" strokeDasharray={`${Math.max(0.01, (ARC * pct) / 100)} ${CIRC}`} strokeLinecap="round" />
      </Svg>
      <H size={52}>{pct}%</H>
      <T size={12} color={c.textSoft}>of the all-time 200</T>
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

function TopRow({ k }: { k: string }) {
  const v = useApp((s) => s.my[k] ?? 0);
  const on = useApp((s) => !!s.want[k]);
  const toggle = useApp((s) => s.toggleWant);
  const openSheet = useApp((s) => s.openSheet);
  const it = item(k);
  const top10 = it.rank <= 10;
  return (
    <ListRow
      onPress={() => openTitle(k)}
      bg={v ? tint.rated : on ? tint.want : undefined}
      disc={<Disc bg={top10 ? c.primary : it.coverBg} fg={top10 ? c.text : it.coverFg} label={String(it.rank)} />}
      title={it.title}
      sub={`${it.by} · ${it.year}`}
      right={
        v ? (
          <HeartPill v={v} onPress={() => openSheet(k)} />
        ) : (
          <Row gap={8}>
            <Pressable accessibilityLabel={on ? 'Remove from watchlist' : 'Add to watchlist'} onPress={() => toggle(k)} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? color.s700 : color.n800 }}>
              <Icon name="bookmark" size={17} color={on ? color.s100 : color.n100} fill={on ? color.s100 : 'none'} strokeWidth={2.5} />
            </Pressable>
            <Pressable accessibilityLabel="Rate now" onPress={() => openSheet(k)} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.n800 }}>
              <Icon name="heart" size={17} color={color.a400} strokeWidth={2.5} />
            </Pressable>
          </Row>
        )
      }
    />
  );
}

export default function Top50() {
  const my = useApp((s) => s.my);
  const me = useMe();
  const [cat, setCat] = useState<Cat>('Movies');
  const count = (x: Cat) => Object.keys(my).filter((k) => k.startsWith(x + '#')).length;
  const total = CATS.reduce((a, x) => a + count(x), 0);
  const least = [...CATS].sort((a, b) => count(a) - count(b))[0];

  return (
    <Page tabs>
      <Card bg={color.a700} onPress={() => router.push('/trending')} style={{ paddingVertical: 14 }}>
        <Row>
          <Icon name="sparkles" size={20} />
          <View style={{ flex: 1 }}>
            <T size={14} weight="bold">Trending today · Top 20</T>
            <T size={12} color={color.a200}>Films, TV, albums and books, refreshed daily</T>
          </View>
          <Icon name="chevronRight" size={18} />
        </Row>
      </Card>

      <View>
        <H size={26}>Top 50 of all time</H>
        <T size={13} color={c.textSoft}>Bookmark anything you fancy for your watchlist, or tap the heart to rate what you’ve already watched.</T>
      </View>

      <ProgressRing pct={Math.round((total / 200) * 100)} />
      <T size={14} color={c.textSoft} center style={{ paddingHorizontal: 20 }}>
        {greeting()}, {me.first}. You’ve seen {total} of the 200 all-time greats. {least} are your next frontier.
      </T>

      <ChipRow>
        {CATS.map((x) => <Chip key={x} label={count(x) ? `${x} · ${count(x)}` : x} on={x === cat} onPress={() => setCat(x)} />)}
      </ChipRow>

      <Card style={{ paddingVertical: 12, borderRadius: 999 }}>
        <Row>
          <T size={13}><H size={18}>{count(cat)}</H> of 50 {KIND[cat].verb}</T>
          <ProgressBar pct={(count(cat) / 50) * 100} />
        </Row>
      </Card>

      <View style={{ gap: 2, marginHorizontal: -6 }}>
        {top50Keys(cat).map((k) => <TopRow key={k} k={k} />)}
      </View>
    </Page>
  );
}
