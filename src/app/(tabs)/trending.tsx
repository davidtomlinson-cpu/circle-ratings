import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Icon } from '../../components/Icon';
import { AddBtn, openTitle } from '../../components/TitleRow';
import { Card, Chip, ChipRow, Disc, H, HeartPill, ListRow, Page, Row, SectionLabel, T } from '../../components/ui';
import type { Cat } from '../../data/types';
import { item } from '../../data/model';
import { movement, useTrending } from '../../lib/useTrending';
import { releasedLine, useWorldTrending, worldMovement, worldScore } from '../../lib/useWorldTrending';
import { useApp } from '../../state/store';
import { c, color } from '../../theme';

type Tab = 'In cinemas' | 'TV shows' | 'Films' | 'Books' | 'Albums';
const TABS: { label: Tab; cat: Cat; cinema?: boolean; source: string }[] = [
  { label: 'In cinemas', cat: 'Movies', cinema: true, source: 'Trending films out in UK cinemas in the last 8 weeks, ranked by English Wikipedia page views. Streaming-only films are left out. Updated daily.' },
  { label: 'TV shows', cat: 'TV shows', source: 'Ranked by English Wikipedia page views over the last 7 days. Updated daily.' },
  { label: 'Films', cat: 'Movies', source: 'Ranked by English Wikipedia page views over the last 7 days, including streaming and upcoming films. Updated daily.' },
  { label: 'Books', cat: 'Books', source: 'Ranked by English Wikipedia page views over the last 7 days. Updated daily.' },
  { label: 'Albums', cat: 'Albums', source: 'Ranked by how many different people played them on ListenBrainz this week. Updated daily.' },
];

function MoveTag({ move }: { move: string }) {
  return <T size={11} weight="bold" color={move === 'NEW' ? color.a300 : move.startsWith('▲') ? color.s300 : color.n400}>{move}</T>;
}

export default function Trending() {
  const my = useApp((s) => s.my);
  const custom = useApp((s) => s.custom);
  const openSheet = useApp((s) => s.openSheet);
  const [tab, setTab] = useState<Tab>('In cinemas');
  const t = TABS.find((x) => x.label === tab)!;
  const club = useTrending(t.cat, 5);
  const world = useWorldTrending(t.cat, 30, !!t.cinema);

  const right = (k: string) => (my[k] ? <HeartPill v={my[k]} onPress={() => openSheet(k)} /> : <AddBtn k={k} />);
  const sub = (k: string) => { const it = item(k, custom); return [it.by, it.year].filter(Boolean).join(' · '); };

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
        <T size={12} color={c.textMuted}>What people everywhere are watching, reading and listening to</T>
      </View>

      <ChipRow>
        {TABS.map((x) => <Chip key={x.label} label={x.label} on={tab === x.label} onPress={() => setTab(x.label)} />)}
      </ChipRow>

      {/* Only shown once SofaClub has enough activity: at least 3 people on a title this week. */}
      {club.rows.length > 0 && !t.cinema && (
        <Card style={{ gap: 4 }}>
          <SectionLabel>Popular on SofaClub</SectionLabel>
          <View style={{ marginHorizontal: -6 }}>
            {club.rows.map((r) => (
              <ListRow
                key={r.key}
                onPress={() => openTitle(r.key)}
                disc={<Icon name="sparkles" size={18} color={color.a300} />}
                title={item(r.key, custom).title}
                sub={sub(r.key)}
                extra={<Row gap={8}><T size={12} color={color.s300}>{r.people} people this week</T><MoveTag move={movement(r)} /></Row>}
                right={right(r.key)}
              />
            ))}
          </View>
        </Card>
      )}

      {world.error && <T size={14} color={c.textMuted} center>Couldn’t load trending. Check your connection.</T>}
      {!world.error && !world.loading && !world.rows.length && (
        <T size={14} color={c.textMuted} center style={{ paddingVertical: 20 }}>
          {t.cinema ? 'No trending cinema releases right now. The list updates once a day.' : 'Nothing here yet. The list updates once a day.'}
        </T>
      )}

      <View style={{ marginHorizontal: -6 }}>
        {world.rows.map((r) => (
          <ListRow
            key={r.key}
            onPress={() => openTitle(r.key)}
            disc={<Disc size={36} bg={r.rank <= 3 ? c.primary : color.n800} fg={r.rank <= 3 ? c.text : color.n100} label={String(r.rank)} />}
            title={item(r.key, custom).title}
            sub={sub(r.key)}
            extra={
              t.cinema
                ? <T size={12} color={color.s300}>{releasedLine(r)} · {worldScore(r)}</T>
                : <Row gap={8}><T size={12} color={color.s300}>{worldScore(r)}</T><MoveTag move={worldMovement(r)} /></Row>
            }
            right={right(r.key)}
          />
        ))}
      </View>

      <T size={11} color={c.textMuted} center>{t.source}</T>
    </Page>
  );
}
