import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { BackHeader, Btn, Card, Disc, H, HeartGlyph, Hearts, Page, Row, T } from '../../components/ui';
import { CATALOGUE } from '../../data/catalogue';
import { FRIENDS, LOCKED, circleAvg, everyoneAvg, face, friendRating, item } from '../../data/model';
import { useApp } from '../../state/store';
import { c, color } from '../../theme';

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
  const [draft, setDraft] = useState('');
  const it = item(key, s.custom);
  const mine = s.my[key] ?? 0;
  const onWant = !!s.want[key];
  const circle = circleAvg(key);
  const comments = [...(CATALOGUE.seedComments[key] ?? []), ...(s.comments[key] ?? [])];
  // Locked friends' ratings stay hidden.
  const members = FRIENDS.filter((f) => !LOCKED[f.name]).map((f) => ({ ...f, v: friendRating(f.name, key) })).sort((a, b) => b.v - a.v);

  const post = () => {
    const t = draft.trim();
    if (!t) return;
    s.addComment(key, t);
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

      <Row gap={8}>
        <Stat label="You" value={mine ? String(mine) : '–'} heart={!!mine} />
        <Stat label="Circle" value={circle ? circle.toFixed(1) : '–'} />
        <Stat label="Everyone" value={everyoneAvg(key).toFixed(1)} />
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
        {members.map((m) => (
          <Row key={m.name} style={{ paddingVertical: 6 }}>
            <Disc size={30} bg={m.bg} label={m.name[0]} display={false} />
            <T size={14} weight="bold" style={{ flex: 1 }}>{m.name}</T>
            {m.v ? <Hearts v={m.v} /> : <T size={12} color={c.textMuted}>Not yet</T>}
          </Row>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <H size={20}>Comments</H>
        <T size={12} color={c.textMuted}>Only your circle can see these.</T>
        {comments.map(([who, text], i) => {
          const f = face(who);
          return (
            <Row key={i} style={{ alignItems: 'flex-start' }}>
              <Disc size={30} bg={f.bg} label={f.initial} display={false} />
              <Card style={{ flex: 1, padding: 12, borderRadius: 18 }}>
                <T size={12} weight="bold">{who}</T>
                <T size={14}>{text}</T>
              </Card>
            </Row>
          );
        })}
        <Row gap={8}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={post}
            placeholder="Add a comment"
            placeholderTextColor={color.n500}
            style={{ flex: 1, height: 46, borderRadius: 23, borderWidth: 2, borderColor: color.n700, backgroundColor: color.n800, paddingHorizontal: 16, color: c.text, fontFamily: 'Figtree_400Regular', ...({ outlineWidth: 0 } as object), fontSize: 14 }}
          />
          <Btn small label="Post" disabled={!draft.trim()} onPress={post} />
        </Row>
      </View>
    </Page>
  );
}
