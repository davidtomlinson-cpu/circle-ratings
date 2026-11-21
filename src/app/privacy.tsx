import { Pressable, Switch, View } from 'react-native';
import { BackHeader, Disc, H, Page, Row, T } from '../components/ui';
import { useApp, type Visibility } from '../state/store';
import { c, color } from '../theme';

const OPTIONS: { v: Visibility; label: string; sub: string }[] = [
  { v: 'all', label: 'All my contacts', sub: 'Everyone in your circle sees it' },
  { v: 'some', label: 'Only people I choose', sub: 'Pick who below' },
  { v: 'locked', label: 'Locked', sub: 'Only you can see it' },
];

export default function Privacy() {
  const s = useApp();
  return (
    <Page>
      <BackHeader title="Privacy" />
      <View>
        <H size={26}>Who can see your ratings</H>
        <T size={13} color={c.textSoft}>Covers your ratings and rating notifications. Loved by the Club stays anonymous either way.</T>
      </View>
      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {OPTIONS.map((o) => {
          const on = s.vis === o.v;
          return (
            <Pressable
              key={o.v}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => s.setVis(o.v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: color.n800, borderWidth: 2, borderColor: on ? color.a400 : 'transparent' }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? color.a400 : color.n500, alignItems: 'center', justifyContent: 'center' }}>
                {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.a400 }} />}
              </View>
              <View style={{ flex: 1 }}>
                <T size={14} weight="bold">{o.label}</T>
                <T size={12} color={c.textMuted}>{o.sub}</T>
              </View>
            </Pressable>
          );
        })}
      </View>

      {s.vis === 'some' && (
        <View style={{ backgroundColor: color.n800, borderRadius: 24, paddingHorizontal: 16 }}>
          {s.circle.map((m, i) => (
            <Row key={m.id} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: color.n700 }}>
              <Disc size={30} bg={color.a300} label={m.name[0]} display={false} />
              <T size={14} weight="bold" style={{ flex: 1 }}>{m.name}</T>
              <Switch
                value={!!s.grants[m.id]}
                onValueChange={(v) => s.setGrant(m.id, v)}
                trackColor={{ false: color.n600, true: color.s500 }}
                thumbColor={color.n100}
                {...({ activeThumbColor: color.n100 } as object)}
              />
            </Row>
          ))}
          {!s.circle.length && <T size={13} color={c.textMuted} style={{ paddingVertical: 14 }}>No one in your circle yet. Once people join, you can pick who sees your list here.</T>}
        </View>
      )}

      <Row style={{ backgroundColor: color.n800, borderRadius: 24, padding: 16 }}>
        <View style={{ flex: 1 }}>
          <T size={14} weight="bold">Share my 5 ♥ titles with the Club</T>
          <T size={12} color={c.textMuted}>Added anonymously to Loved by the Club</T>
        </View>
        <Switch
          value={s.settings.contribute}
          onValueChange={(v) => s.setSetting('contribute', v)}
          trackColor={{ false: color.n600, true: color.s500 }}
          thumbColor={color.n100}
          {...({ activeThumbColor: color.n100 } as object)}
        />
      </Row>
    </Page>
  );
}
