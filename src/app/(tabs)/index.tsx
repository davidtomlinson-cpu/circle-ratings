import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Jar } from '../../components/Jar';
import { Icon, type IconName } from '../../components/Icon';
import { RateBtn, TitleRow } from '../../components/TitleRow';
import { Card, Disc, H, HeartGlyph, Page, Row, RoundIcon, SectionLabel, T, ChipRow } from '../../components/ui';
import { NOTIFS, TRENDING } from '../../data/feeds';
import { ALL_TOP_KEYS, BUDGET, FRIENDS, ME, fmtDay, nextMonth, worldCount } from '../../data/model';
import { jarLeft, useApp, wantKeys } from '../../state/store';
import { c, color } from '../../theme';

const VIS_LABEL = { all: 'All my contacts', some: 'Chosen contacts', locked: 'Locked' } as const;

function ActionChip({ icon, label, href }: { icon: IconName; label: string; href: string }) {
  return (
    <Pressable onPress={() => router.push(href as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: color.n700 }}>
      <Icon name={icon} size={14} strokeWidth={2.5} />
      <T size={12} weight="bold">{label}</T>
    </Pressable>
  );
}

export default function Today() {
  const s = useApp();
  const want = wantKeys(s);
  const rated = Object.keys(s.my).length;
  const left = jarLeft(s);
  const unread = NOTIFS.filter((n) => !s.read[n.id]).length;
  const loved = [...ALL_TOP_KEYS].sort((a, b) => worldCount(b) - worldCount(a)).slice(0, 3);

  return (
    <Page tabs>
      <Row>
        <H size={26} style={{ flex: 1 }}>Today</H>
        <RoundIcon name="search" label="Search" onPress={() => router.push('/search')} />
        <RoundIcon name="bell" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
        <Disc size={34} bg={ME.bg} label={ME.initial} />
      </Row>

      <Card style={{ gap: 14, paddingBottom: 14 }}>
        <Row>
          <Disc size={44} bg={ME.bg} label={ME.initial} />
          <View style={{ flex: 1 }}>
            <T size={14} weight="bold">{ME.name}</T>
            <T size={12} color={c.textMuted}>{want.length} on watchlist · {rated} rated · {VIS_LABEL[s.vis]}</T>
          </View>
        </Row>
        <ChipRow>
          <ActionChip icon="lock" label="Privacy" href="/privacy" />
          <ActionChip icon="bookmark" label="Watchlist" href="/watchlist" />
          <ActionChip icon="heart" label="My list" href="/mylist" />
          {/* Invite, Contacts' lists and Settings arrive with the circle/account slice. */}
        </ChipRow>
      </Card>

      <Pressable onPress={() => router.push('/jar')} style={{ alignItems: 'center', gap: 6 }}>
        <Jar left={left} scale={0.6} />
        <T size={14} center><H size={22}>{left}</H> of {BUDGET} hearts left this month</T>
        <T size={12} color={c.textMuted} center>Each rating uses its hearts · refills on {fmtDay(nextMonth())}</T>
      </Pressable>

      <Card onPress={() => router.push('/notifications')}>
        <Row>
          <Row gap={0}>
            {FRIENDS.map((f, i) => (
              <View key={f.name} style={{ borderWidth: 2, borderColor: c.card, borderRadius: 14, marginLeft: i ? -8 : 0 }}>
                <Disc size={24} bg={f.bg} label={f.name[0]} display={false} />
              </View>
            ))}
          </Row>
          <View style={{ flex: 1 }}>
            <SectionLabel>Your circle</SectionLabel>
            <T size={13} numberOfLines={1}>Priya gave Parasite 5 ♥ · Dad gave Breaking Bad 5 ♥</T>
          </View>
        </Row>
      </Card>

      <Card style={{ gap: 6 }}>
        <SectionLabel right={<Pressable onPress={() => router.push('/watchlist')}><T size={12} weight="bold" color={c.link}>See all</T></Pressable>}>
          {`Up next · Watchlist ${want.length}`}
        </SectionLabel>
        <T size={13} color={c.textSoft}>Finished one? Rate it to share with your circle.</T>
        {want.slice(0, 3).map((k) => <TitleRow key={k} k={k} action={<RateBtn k={k} />} />)}
        {!want.length && <T size={13} color={c.textMuted}>Your watchlist is empty. Add something from Top 50 or Trending.</T>}
      </Card>

      <Card bg={color.a700} onPress={() => router.push('/trending')} style={{ gap: 8 }}>
        <Row><Icon name="sparkles" size={18} /><T size={14} weight="bold" style={{ flex: 1 }}>Trending today · Films</T><Icon name="chevronRight" size={18} /></Row>
        {TRENDING.Films.slice(0, 3).map((r, i) => <TitleRow key={r.key} k={r.key} disc={<Disc size={32} bg={c.primary} fg={c.text} label={String(i + 1)} />} sub={r.why} action={<View />} />)}
      </Card>

      <Card onPress={() => router.push('/world')} style={{ gap: 8 }}>
        <Row><Icon name="globe" size={18} /><T size={14} weight="bold" style={{ flex: 1 }}>Loved worldwide · live</T><Icon name="chevronRight" size={18} /></Row>
        {loved.map((k) => (
          <TitleRow key={k} k={k} action={<Row gap={4}><HeartGlyph size={13} /><T size={13} weight="bold" color={color.a300}>{worldCount(k).toLocaleString('en-GB')}</T></Row>} />
        ))}
      </Card>
    </Page>
  );
}
