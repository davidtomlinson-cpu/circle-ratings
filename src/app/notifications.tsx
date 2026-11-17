import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { BackHeader, Disc, Page, T, tint } from '../components/ui';
import { NOTIFS } from '../data/feeds';
import { face } from '../data/model';
import { useApp } from '../state/store';
import { c, color } from '../theme';

export default function Notifications() {
  const read = useApp((s) => s.read);
  const markRead = useApp((s) => s.markRead);
  const markAll = useApp((s) => s.markAllRead);

  return (
    <Page>
      <BackHeader
        title="Notifications"
        right={<Pressable onPress={() => markAll(NOTIFS.map((n) => n.id))}><T size={13} weight="bold" color={color.a400}>Mark all read</T></Pressable>}
      />
      <View style={{ gap: 8 }}>
        {NOTIFS.map((n) => {
          const un = !read[n.id];
          const f = face(n.who);
          return (
            <Pressable
              key={n.id}
              onPress={() => { markRead(n.id); router.push(n.href as never); }}
              style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 22, backgroundColor: un ? tint.unread : color.n800 }}
            >
              <Disc size={34} bg={f.bg} label={f.initial} display={false} />
              <View style={{ flex: 1, gap: 2 }}>
                <T size={14}>{n.text}</T>
                {!!n.quote && <T size={13} color={c.textSoft}>“{n.quote}”</T>}
                <T size={11} color={c.textMuted}>{n.when}</T>
              </View>
              {un && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.a400, marginTop: 6 }} />}
            </Pressable>
          );
        })}
      </View>
    </Page>
  );
}
