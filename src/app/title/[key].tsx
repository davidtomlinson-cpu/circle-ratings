import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { BackHeader, Btn, Card, Disc, H, HeartGlyph, Hearts, Page, Row, T } from '../../components/ui';
import { item } from '../../data/model';
import { useDescription } from '../../lib/useDescription';
import { friendlyError, supabase } from '../../lib/supabase';
import { useApp, useMe, useTitles } from '../../state/store';
import { c, color } from '../../theme';

type CircleRating = { id: string; name: string; hearts: number };
type Comment = { id: number; author: string; mine: boolean; body: string };

function Stat({ label, value, heart }: { label: string; value: string; heart?: boolean }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 22 }}>
      <Row gap={4}><H size={24}>{value}</H>{heart && <HeartGlyph size={18} />}</Row>
      <T size={12} color={c.textMuted}>{label}</T>
    </Card>
  );
}

export default function TitleDetail() {
  const { key: raw } = useLocalSearchParams<{ key: string }>();
  const key = decodeURIComponent(String(raw));
  const s = useApp();
  const me = useMe();
  const id = s.titleIds[key];
  useTitles([key]);
  const it = item(key, s.custom);
  const mine = s.my[key] ?? 0;
  const onWant = !!s.want[key];
  const { description, loading: describing } = useDescription(key);
  const [more, setMore] = useState(false);

  const [circle, setCircle] = useState<CircleRating[]>([]);
  const [everyone, setEveryone] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  // Fetches only; the effect below applies the result, so state is set in a callback (and ignored if stale).
  const load = useCallback(async () => {
    if (!id || !s.userId) return null;
    const names = Object.fromEntries(s.circle.map((m) => [m.id, m.name]));
    const [rs, ev, cs] = await Promise.all([
      // RLS only returns ratings this user is allowed to see.
      supabase.from('ratings').select('user_id, hearts').eq('title_id', id).neq('user_id', s.userId),
      supabase.rpc('title_everyone', { p_title_id: id }).single(),
      supabase.from('comments').select('id, author_id, body').eq('title_id', id).order('created_at'),
    ]);
    return {
      circle: rs.data?.map((r) => ({ id: r.user_id, name: names[r.user_id] ?? 'Someone', hearts: r.hearts })).sort((a, b) => b.hearts - a.hearts),
      everyone: ev.data ? (ev.data as { avg_hearts: number | null }).avg_hearts : undefined,
      comments: cs.data?.map((x) => ({ id: x.id, author: x.author_id === s.userId ? 'You' : names[x.author_id] ?? 'Someone', mine: x.author_id === s.userId, body: x.body })),
    };
  }, [id, s.userId, s.circle]);

  useEffect(() => {
    let live = true;
    void load().then((r) => {
      if (!live || !r) return;
      if (r.circle) setCircle(r.circle);
      if (r.everyone !== undefined) setEveryone(r.everyone);
      if (r.comments) setComments(r.comments);
    });
    return () => { live = false; };
  }, [load, mine]);

  const circleAvg = circle.length ? circle.reduce((a, r) => a + r.hearts, 0) / circle.length : 0;

  const post = async () => {
    const body = draft.trim();
    if (!body || !id || posting) return;
    setPosting(true);
    const { data, error } = await supabase.from('comments').insert({ title_id: id, body }).select('id').single();
    setPosting(false);
    if (error) return s.showError(friendlyError(error));
    setComments((cs) => [...cs, { id: data.id, author: 'You', mine: true, body }]);
    setDraft('');
  };

  return (
    <Page>
      <BackHeader title={it.kind} />
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Disc size={150} bg={it.coverBg} fg={it.coverFg} label={it.initial} />
        <H size={28} center>{it.title}</H>
        <T size={13} color={c.textSoft} center>{it.sub}</T>
        {!!it.rank && (
          <View style={{ backgroundColor: color.a800, paddingHorizontal: 12, height: 26, borderRadius: 13, justifyContent: 'center' }}>
            <T size={12} weight="bold" color={color.a300}>#{it.rank} in the Top 50 {it.cat}</T>
          </View>
        )}
      </View>

      {description ? (
        <Card style={{ gap: 8, padding: 16 }}>
          <Pressable onPress={() => setMore((m) => !m)} accessibilityRole="button" accessibilityHint={more ? 'Shows less' : 'Shows the full description'}>
            <T size={14} color={c.textSoft} numberOfLines={more ? undefined : 4}>{description.summary}</T>
          </Pressable>
          {!!description.url && (
            <Pressable onPress={() => void Linking.openURL(description.url!)} accessibilityRole="link">
              <T size={11} color={c.textMuted}>From Wikipedia · CC BY-SA · <T size={11} color={c.link}>Read more</T></T>
            </Pressable>
          )}
        </Card>
      ) : describing ? (
        <T size={12} color={c.textMuted} center>Loading description…</T>
      ) : null}

      <Row gap={8}>
        <Stat label="You" value={mine ? String(mine) : '–'} heart={!!mine} />
        <Stat label="Circle" value={circleAvg ? circleAvg.toFixed(1) : '–'} />
        <Stat label="Everyone" value={everyone != null ? Number(everyone).toFixed(1) : '–'} />
      </Row>

      <Row gap={8}>
        {mine ? (
          <Btn label="✓ In your ratings" kind="positive" style={{ flex: 1 }} small />
        ) : (
          <Btn label={onWant ? '✓ On watchlist' : '+ Add to watchlist'} kind={onWant ? 'positive' : 'secondary'} onPress={() => s.toggleWant(key)} style={{ flex: 1 }} small />
        )}
        <Btn label={mine ? 'Change rating' : 'Rate it'} onPress={() => s.openSheet(key)} style={{ flex: 1 }} small />
      </Row>

      <View style={{ gap: 6 }}>
        <H size={20}>Your circle</H>
        {circle.map((m) => (
          <Row key={m.id} style={{ paddingVertical: 6 }}>
            <Disc size={30} bg={color.a300} label={m.name[0]} display={false} />
            <T size={14} weight="bold" style={{ flex: 1 }}>{m.name}</T>
            <Hearts v={m.hearts} />
          </Row>
        ))}
        {!circle.length && (
          <T size={13} color={c.textMuted}>
            {s.circle.length ? 'No one in your circle has rated this yet.' : 'When people join your circle, their hearts for this show up here.'}
          </T>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <H size={20}>Comments</H>
        <T size={12} color={c.textMuted}>Only your circle can see these.</T>
        {comments.map((cm) => (
          <Row key={cm.id} style={{ alignItems: 'flex-start' }}>
            <Disc size={30} bg={cm.mine ? color.s400 : color.a300} label={(cm.mine ? me.initial : cm.author[0]) ?? '?'} display={false} />
            <Card style={{ flex: 1, padding: 12, borderRadius: 18 }}>
              <T size={12} weight="bold">{cm.author}</T>
              <T size={14}>{cm.body}</T>
            </Card>
          </Row>
        ))}
        <Row gap={8}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={post}
            maxLength={1000}
            placeholder="Add a comment"
            placeholderTextColor={color.n500}
            style={{ flex: 1, height: 46, borderRadius: 23, borderWidth: 2, borderColor: color.n700, backgroundColor: color.n800, paddingHorizontal: 16, color: c.text, fontFamily: 'Figtree_400Regular', ...({ outlineWidth: 0 } as object), fontSize: 14 }}
          />
          <Btn small label="Post" disabled={!draft.trim() || posting || !id} onPress={post} />
        </Row>
      </View>
    </Page>
  );
}
