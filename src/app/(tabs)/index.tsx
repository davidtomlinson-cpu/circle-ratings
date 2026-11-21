import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Jar } from '../../components/Jar';
import { Icon, type IconName } from '../../components/Icon';
import { RateBtn, TitleRow } from '../../components/TitleRow';
import { Card, Disc, H, HeartGlyph, Page, Row, RoundIcon, SectionLabel, T, ChipRow } from '../../components/ui';
import { BUDGET, fmtDay, nextMonth } from '../../data/model';
import { notifText, type Notif } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { useTrending } from '../../lib/useTrending';
import { useWorldwide } from '../../lib/useWorldwide';
import { jarLeft, useApp, useMe, useTitles, wantKeys } from '../../state/store';
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
  const me = useMe();
  const loved = useWorldwide('All', true, 3);
  const trending = useTrending('All', 3);
  const [latest, setLatest] = useState<Notif | null>(null);
  useTitles([latest?.title_key, ...s.circle.map((m) => m.topKey)]);
  useFocusEffect(
    useCallback(() => {
      void supabase.rpc('my_notifications', { p_limit: 1 }).then(({ data }) => setLatest((data as Notif[] | null)?.[0] ?? null));
    }, [s.unread]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <Page tabs>
      <Row>
        <H size={26} style={{ flex: 1 }}>Today</H>
        <RoundIcon name="search" label="Search" onPress={() => router.push('/search')} />
        <RoundIcon name="bell" label="Notifications" badge={s.unread} onPress={() => router.push('/notifications')} />
        <Pressable accessibilityLabel="Profile and settings" onPress={() => router.push('/profile')}>
          <Disc size={34} bg={color.s400} label={me.initial} />
        </Pressable>
      </Row>

      <Card style={{ gap: 14, paddingBottom: 14 }}>
        <Row>
          <Disc size={44} bg={color.s400} label={me.initial} />
          <View style={{ flex: 1 }}>
            <T size={14} weight="bold">{me.name}</T>
            <T size={12} color={c.textMuted}>{want.length} on watchlist · {rated} rated · {VIS_LABEL[s.vis]}</T>
          </View>
        </Row>
        <ChipRow>
          <ActionChip icon="userPlus" label="Invite" href="/invite" />
          <ActionChip icon="users" label="Contacts’ lists" href="/contacts" />
          <ActionChip icon="lock" label="Privacy" href="/privacy" />
          <ActionChip icon="bookmark" label="Watchlist" href="/watchlist" />
          <ActionChip icon="heart" label="My list" href="/mylist" />
          <ActionChip icon="settings" label="Settings" href="/profile" />
        </ChipRow>
      </Card>

      <Pressable onPress={() => router.push('/jar')} style={{ alignItems: 'center', gap: 6 }}>
        <Jar left={left} scale={0.6} />
        <T size={14} center><H size={22}>{left}</H> of {BUDGET} hearts left this month</T>
        <T size={12} color={c.textMuted} center>Each rating uses its hearts · refills on {fmtDay(nextMonth())}</T>
      </Pressable>

      <Card onPress={() => router.push(s.circle.length ? '/notifications' : '/invite')}>
        <Row>
          <Row gap={0}>
            {s.circle.slice(0, 6).map((m, i) => (
              <View key={m.id} style={{ borderWidth: 2, borderColor: c.card, borderRadius: 14, marginLeft: i ? -8 : 0 }}>
                <Disc size={24} bg={color.a300} label={m.name[0]} display={false} />
              </View>
            ))}
            {!s.circle.length && <Icon name="userPlus" size={20} color={color.s300} />}
          </Row>
          <View style={{ flex: 1 }}>
            <SectionLabel>Your circle</SectionLabel>
            <T size={13} numberOfLines={1}>
              {latest ? notifText(latest, s.custom) : s.circle.length ? 'No activity yet' : 'Just you for now. Tap to invite family and friends.'}
            </T>
          </View>
          <Icon name="chevronRight" size={18} />
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
        <Row><Icon name="sparkles" size={18} /><T size={14} weight="bold" style={{ flex: 1 }}>Trending this week</T><Icon name="chevronRight" size={18} /></Row>
        {trending.rows.slice(0, 3).map((r, i) => <TitleRow key={r.key} k={r.key} disc={<Disc size={32} bg={c.primary} fg={c.text} label={String(i + 1)} />} sub={`${r.people} people this week`} action={<View />} />)}
        {!trending.loading && !trending.rows.length && <T size={13} color={color.a100}>What people on SofaClub are rating and adding. Titles appear once 3 people have.</T>}
      </Card>

      <Card onPress={() => router.push('/world')} style={{ gap: 8 }}>
        <Row><Icon name="globe" size={18} /><T size={14} weight="bold" style={{ flex: 1 }}>Loved worldwide · live</T><Icon name="chevronRight" size={18} /></Row>
        {loved.rows.map((r) => (
          <TitleRow key={r.key} k={r.key} action={<Row gap={4}><HeartGlyph size={13} /><T size={13} weight="bold" color={color.a300}>{r.total.toLocaleString('en-GB')}</T></Row>} />
        ))}
        {!loved.loading && !loved.rows.length && <T size={13} color={c.textMuted}>Titles appear once 3 people have loved them.</T>}
      </Card>
    </Page>
  );
}
