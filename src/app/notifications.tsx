import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { Icon } from '../components/Icon';
import { BackHeader, Disc, Page, Row, T, tint } from '../components/ui';
import { ago } from '../data/model';
import { notifText, type Notif } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { useApp, useTitles } from '../state/store';
import { c, color } from '../theme';

export default function Notifications() {
  const s = useApp();
  const [list, setList] = useState<Notif[] | null>(null);
  useTitles((list ?? []).map((n) => n.title_key));

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('my_notifications', { p_limit: 100 });
    setList((data as Notif[]) ?? []);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const markRead = async (ids: number[]) => {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setList((l) => l?.map((n) => (ids.includes(n.id) ? { ...n, read_at: now } : n)) ?? null);
    await supabase.from('notifications').update({ read_at: now }).in('id', ids);
    void s.refreshUnread();
  };

  const remove = async (ids: number[]) => {
    if (!ids.length) return;
    setList((l) => l?.filter((n) => !ids.includes(n.id)) ?? null);
    const { error } = await supabase.from('notifications').delete().in('id', ids);
    if (error) {
      s.showError('Couldn’t delete that. Try again.');
      void load();
    }
    void s.refreshUnread();
  };

  const clearAll = () => {
    const ids = (list ?? []).map((n) => n.id);
    if (!ids.length) return;
    const go = () => void remove(ids);
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Delete all notifications?')) go();
      return;
    }
    Alert.alert('Delete all notifications?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: go },
    ]);
  };

  const open = (n: Notif) => {
    void markRead(n.read_at ? [] : [n.id]);
    if (n.kind === 'joined') router.push(`/friend/${n.actor_id}`);
    else if (n.kind === 'family_joined') router.push('/family');
    else if (n.kind === 'trial_ending') router.push('/trial-ending');
    else if (n.title_key) router.push(`/title/${encodeURIComponent(n.title_key)}`);
  };

  const unread = (list ?? []).filter((n) => !n.read_at).map((n) => n.id);

  return (
    <Page>
      <BackHeader
        title="Notifications"
        right={(list ?? []).length ? (
          <Row gap={14}>
            {!!unread.length && <Pressable onPress={() => markRead(unread)} accessibilityRole="button"><T size={13} weight="bold" color={color.a400}>Mark all read</T></Pressable>}
            <Pressable onPress={clearAll} accessibilityRole="button"><T size={13} weight="bold" color={c.textMuted}>Clear all</T></Pressable>
          </Row>
        ) : undefined}
      />
      <View style={{ gap: 8 }}>
        {(list ?? []).map((n) => {
          const un = !n.read_at;
          return (
            <Pressable key={n.id} onPress={() => open(n)} style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 22, backgroundColor: un ? tint.unread : color.n800 }}>
              <Disc size={34} bg={color.a300} label={n.actor_name[0]} display={false} />
              <View style={{ flex: 1, gap: 2 }}>
                <T size={14}>{notifText(n, s.custom)}</T>
                {!!n.body && <T size={13} color={c.textSoft}>“{n.body}”</T>}
                {n.kind === 'trial_ending' && <T size={13} color={c.textSoft}>Keep your plan, change it or cancel</T>}
                <T size={11} color={c.textMuted}>{ago(Date.parse(n.created_at))}</T>
              </View>
              <View style={{ alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => void remove([n.id])} hitSlop={10} accessibilityRole="button" accessibilityLabel="Delete notification">
                  <Icon name="x" size={16} color={c.textMuted} />
                </Pressable>
                {un && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.a400 }} />}
              </View>
            </Pressable>
          );
        })}
      </View>
      {list && !list.length && (
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 60 }}>
          <Icon name="bell" size={36} color={c.textMuted} />
          <T size={15} weight="bold" center>Nothing yet</T>
          <T size={13} color={c.textMuted} center>When people in your circle rate, comment or join, you’ll see it here.</T>
        </View>
      )}
    </Page>
  );
}
