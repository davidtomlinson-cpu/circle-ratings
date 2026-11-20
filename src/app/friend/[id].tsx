import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { CatChips } from '../../components/CatChips';
import { openTitle } from '../../components/TitleRow';
import { BackHeader, Btn, Card, Disc, H, HeartPill, ListRow, Page, Row, T } from '../../components/ui';
import { item, type Custom } from '../../data/model';
import type { Cat } from '../../data/types';
import { friendlyError, supabase } from '../../lib/supabase';
import { useApp } from '../../state/store';
import { c, color } from '../../theme';

type RatingRow = { key: string; hearts: number };
type TitleRef = { key: string; category: Cat; title: string; creator: string; year: string; source: string };

/** 100% = identical ratings on everything you both rated; each heart of difference costs 20 points. */
function tasteMatch(mine: Record<string, number>, theirs: RatingRow[]) {
  const diffs = theirs.filter((r) => mine[r.key]).map((r) => Math.abs(r.hearts - mine[r.key]));
  if (diffs.length < 3) return { pct: null, overlap: diffs.length };
  const pct = Math.round(100 - (diffs.reduce((a, b) => a + b, 0) / diffs.length) * 20);
  return { pct: Math.max(0, Math.min(100, pct)), overlap: diffs.length };
}

export default function Friend() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useApp();
  const m = s.circle.find((x) => x.id === id);
  const [rows, setRows] = useState<RatingRow[] | null>(null);
  const [custom, setCustom] = useState<Custom>({});
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!id || !m?.iSee) return;
    void supabase
      .from('ratings')
      .select('hearts, rated_at, titles(key, category, title, creator, year, source)')
      .eq('user_id', id)
      .order('hearts', { ascending: false })
      .order('rated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) return s.showError(friendlyError(error));
        const cu: Custom = {};
        const out: RatingRow[] = [];
        for (const r of data ?? []) {
          const t = (Array.isArray(r.titles) ? r.titles[0] : r.titles) as TitleRef | null;
          if (!t) continue;
          if (t.source === 'custom') cu[t.key.slice(2)] = { title: t.title, by: t.creator, year: t.year, cat: t.category };
          else if (t.key.includes(':')) cu[t.key] = { title: t.title, by: t.creator, year: t.year, cat: t.category };
          out.push({ key: t.key, hearts: r.hearts });
        }
        setCustom(cu);
        setRows(out);
      });
  }, [id, m?.iSee]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!m) {
    return (
      <Page>
        <BackHeader title="Circle" />
        <T size={15} color={c.textMuted} center>This person isn’t in your circle any more.</T>
      </Page>
    );
  }

  const match = rows ? tasteMatch(s.my, rows) : null;
  const shown = (rows ?? []).filter((r) => cat === 'All' || item(r.key, custom).cat === cat);

  const remove = async () => {
    if (await s.removeMember(m.id)) router.back();
  };

  return (
    <Page>
      <BackHeader title="Circle" />
      <Row gap={14}>
        <Disc size={64} bg={color.a300} label={m.name[0]} display={false} />
        <View style={{ flex: 1 }}>
          <H size={26}>{m.name}</H>
          <T size={13} color={c.textMuted}>{m.iSee ? `${rows?.length ?? m.rated ?? 0} in their list` : 'List locked'}</T>
        </View>
      </Row>

      {!m.iSee ? (
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
          <Icon name="lock" size={28} color={color.n400} />
          <T size={15} weight="bold">{m.name.split(' ')[0]}’s list is private</T>
          <T size={13} color={c.textMuted} center>They’ve chosen not to share their ratings with you. You’re still in each other’s circle.</T>
        </Card>
      ) : (
        <>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <H size={30}>{match?.pct != null ? `${match.pct}%` : '–'}</H>
            <T size={13} color={c.textSoft} style={{ flex: 1 }}>
              {match?.pct != null
                ? `taste match, from ${match.overlap} titles you’ve both rated`
                : 'Rate a few of the same titles to see how your tastes match'}
            </T>
          </Card>
          {!!rows?.length && <CatChips keys={rows.map((r) => r.key)} value={cat} onChange={setCat} />}
          <View style={{ marginHorizontal: -6 }}>
            {shown.map((r) => {
              const it = item(r.key, custom);
              return (
                <ListRow
                  key={r.key}
                  onPress={() => openTitle(r.key)}
                  disc={<Disc bg={it.coverBg} fg={it.coverFg} label={it.initial} />}
                  title={it.title}
                  sub={it.sub}
                  right={<HeartPill v={r.hearts} />}
                />
              );
            })}
          </View>
          {rows && !rows.length && <T size={14} color={c.textMuted} center>Nothing rated yet.</T>}
        </>
      )}

      <T size={12} color={c.textMuted}>{m.seesMine ? `${m.name.split(' ')[0]} can see your list.` : `${m.name.split(' ')[0]} can’t see your list.`} Change this in Privacy.</T>

      {confirm ? (
        <Card style={{ gap: 10 }}>
          <T size={14}>Remove {m.name} from your circle? You’ll both stop seeing each other’s lists. They can rejoin with your invite code.</T>
          <Row gap={8}>
            <Btn small label="Remove" onPress={remove} style={{ flex: 1 }} />
            <Btn small label="Keep" kind="secondary" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : (
        <Pressable onPress={() => setConfirm(true)} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <T size={14} weight="bold" color={color.a400}>Remove from circle</T>
        </Pressable>
      )}
    </Page>
  );
}
