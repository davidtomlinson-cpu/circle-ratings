import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { HEART_PATH } from '../components/Icon';
import { Btn, H, T } from '../components/ui';
import { c, color } from '../theme';

const CLUSTER = [
  { x: 120, y: 30, s: 110, fill: color.a400, r: -8 },
  { x: 250, y: 0, s: 44, fill: color.a500, r: 14 },
  { x: 50, y: 40, s: 30, fill: color.s300, r: -12 },
  { x: 70, y: 130, s: 70, fill: color.s400, r: 10 },
  { x: 230, y: 140, s: 54, fill: color.a300, r: 16 },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 28, justifyContent: 'space-between' }}>
      <View style={{ height: 220 }}>
        {CLUSTER.map((h, i) => (
          <View key={i} style={{ position: 'absolute', left: h.x, top: h.y, transform: [{ rotate: `${h.r}deg` }] }}>
            <Svg width={h.s} height={h.s} viewBox="0 0 24 24"><Path d={HEART_PATH} fill={h.fill} /></Svg>
          </View>
        ))}
      </View>
      <View style={{ gap: 18 }}>
        <H size={40}>{'Rate it.\nShare it.\nFind your next love.'}</H>
        <T size={15} color={c.textSoft}>Films, TV, books and albums, rated in hearts with the people closest to you.</T>
        <Btn label="Get started" onPress={() => router.push('/sign-up')} />
        <Pressable onPress={() => router.push('/sign-in')} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <T size={14} weight="bold" color={c.textSoft}>I already have an account</T>
        </Pressable>
        <Pressable onPress={() => router.push('/family-join')} style={{ alignItems: 'center', paddingVertical: 2 }}>
          <T size={14} weight="bold" color={c.link}>Join with a family invitation</T>
        </Pressable>
      </View>
    </View>
  );
}
