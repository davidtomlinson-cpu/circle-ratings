// Friends: everyone in your circle. Find someone, see what they've been rating, open their list.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { matches } from '../../components/FilterField';
import { Icon } from '../../components/Icon';
import { Btn, Disc, H, Page, Row, T } from '../../components/ui';
import { item } from '../../data/model';
import { useApp, useTitles } from '../../state/store';
import { c, color } from '../../theme';

export default function Friends() {
  const circle = useApp((s) => s.circle);
  const refreshCircle = useApp((s) => s.refreshCircle);
  const custom = useApp((s) => s.custom);
  const [q, setQ] = useState('');
  useTitles(circle.map((m) => m.topKey));
  useFocusEffect(useCallback(() => { void refreshCircle(); }, [refreshCircle]));
  const shown = [...circle].sort((a, b) => a.name.localeCompare(b.name)).filter((m) => matches(q, m.name));

  return (
    <Page tabs>
      <View>
        <H size={26}>Friends</H>
        <T size={13} color={c.textSoft}>Your circle. Tap someone to see their list and hearts.</T>
      </View>

      {circle.length > 3 && (
        <Row gap={8} style={{ height: 46, borderRadius: 23, borderWidth: 2, borderColor: color.n700, backgroundColor: color.n800, paddingHorizontal: 14 }}>
          <Icon name="search" size={16} color={color.n400} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Find a friend"
            placeholderTextColor={color.n500}
            autoCorrect={false}
            accessibilityLabel="Find a friend"
            style={{ flex: 1, color: c.text, fontFamily: 'Figtree_400Regular', fontSize: 14, height: '100%', ...({ outlineWidth: 0 } as object) }}
          />
          {!!q && <Pressable onPress={() => setQ('')} accessibilityLabel="Clear" hitSlop={10}><Icon name="x" size={16} color={color.n400} /></Pressable>}
        </Row>
      )}

      <View style={{ gap: 10 }}>
        {shown.map((m) => {
          const top = m.topKey ? item(m.topKey, custom).title : null;
          const detail = !m.iSee ? 'Their list is private' : `${m.rated ?? 0} rated${top ? ` · top pick ${top}` : ''}`;
          return (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/friend/${m.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${m.name}. ${detail}`}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.n800, borderRadius: 24, padding: 14 }, pressed && { opacity: 0.85 }]}
            >
              <Disc size={40} bg={color.a300} label={m.name[0]} display={false} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={15} weight="bold">{m.name}</T>
                <T size={12} color={c.textMuted} numberOfLines={1}>{detail}</T>
                <T size={11} weight="bold" color={m.seesMine ? color.s300 : color.n400}>{m.seesMine ? 'Can see your list' : 'Can’t see your list'}</T>
              </View>
              {!m.iSee && <Icon name="lock" size={16} color={color.n400} />}
              <Icon name="chevronRight" size={18} color={color.n400} />
            </Pressable>
          );
        })}
      </View>

      {!circle.length && (
        <View style={{ alignItems: 'center', gap: 6, paddingVertical: 12 }}>
          <Icon name="users" size={28} color={color.n500} />
          <T size={15} weight="bold" center>No friends here yet</T>
          <T size={13} color={c.textMuted} center>Invite family and friends to see what they’re watching, reading and listening to, and share your hearts with them.</T>
        </View>
      )}
      {!!circle.length && !shown.length && <T size={14} color={c.textMuted} center>No one in your circle matches “{q.trim()}”.</T>}

      <Btn label="Invite friends and family" icon="userPlus" onPress={() => router.push('/invite')} />
      <Pressable onPress={() => router.push('/privacy')} style={{ alignItems: 'center' }}>
        <T size={14} weight="bold" color={color.a300}>Choose who can see your list</T>
      </Pressable>
    </Page>
  );
}
