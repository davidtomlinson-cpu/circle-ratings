import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { T, TAB_BAR_HEIGHT } from '../../components/ui';
import { alpha, color } from '../../theme';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Today', icon: 'sun' },
  { name: 'top50', label: 'Top 50', icon: 'circleCheck' },
  { name: 'world', label: 'World', icon: 'globe' },
  { name: 'trending', label: 'Trending', icon: 'sparkles' },
  { name: 'watchlist', label: 'Watchlist', icon: 'bookmark' },
  { name: 'mylist', label: 'My list', icon: 'heart5' },
];

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: Math.max(TAB_BAR_HEIGHT, 58 + insets.bottom), paddingBottom: Math.max(insets.bottom, 26) }]}>
      {state.routes.map((route, i) => {
        const t = TABS.find((x) => x.name === route.name);
        if (!t) return null;
        const active = state.index === i;
        const col = active ? color.a400 : color.n500;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.label}
            style={styles.tab}
            onPress={() => !active && navigateToTab(route.key)}
          >
            <Icon name={t.icon} size={24} color={col} />
            <T size={11} weight="bold" color={col} style={{ lineHeight: 14 }}>{t.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.n900 } }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingTop: 10, paddingHorizontal: 6,
    backgroundColor: alpha(color.n900, 0.88), borderTopWidth: 1, borderTopColor: color.n800,
    // Web gets the 14px backdrop blur from the spec; native falls back to the translucent fill.
    ...({ backdropFilter: 'blur(14px)' } as object),
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
});
