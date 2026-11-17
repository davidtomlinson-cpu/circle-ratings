import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../components/Icon';
import { BackHeader, Btn, Disc, H, Page, T } from '../components/ui';
import { item } from '../data/model';
import { useApp } from '../state/store';
import { c, color } from '../theme';

export default function Contacts() {
  const circle = useApp((s) => s.circle);
  const refreshCircle = useApp((s) => s.refreshCircle);
  useFocusEffect(useCallback(() => { void refreshCircle(); }, [refreshCircle]));

  return (
    <Page>
      <BackHeader title="Contacts" />
      <View>
        <H size={26}>Contacts</H>
        <T size={13} color={c.textSoft}>Tap someone to see their My list.</T>
      </View>

      <View style={{ gap: 10 }}>
        {circle.map((m) => {
          const top = m.topKey ? item(m.topKey).title : null;
          const detail = !m.iSee ? 'List locked' : `${m.rated ?? 0} rated${top ? ` · top pick ${top}` : ''}`;
          return (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/friend/${m.id}`)}
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

      {!circle.length && <T size={14} color={c.textMuted} center>No one in your circle yet.</T>}
      <Btn label="Invite people" icon="userPlus" onPress={() => router.push('/invite')} />
      <Pressable onPress={() => router.push('/privacy')} style={{ alignItems: 'center' }}>
        <T size={14} weight="bold" color={color.a300}>Choose who can see your list</T>
      </Pressable>
    </Page>
  );
}
