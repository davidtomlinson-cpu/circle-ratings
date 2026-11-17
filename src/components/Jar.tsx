// Jar of hearts: one token per heart left this month.
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BUDGET, hash } from '../data/model';
import { alpha, color } from '../theme';
import { HEART_PATH } from './Icon';

const PAL = [color.a400, color.s400, color.a500, color.a300, color.s300];
const W = 240;
const GLASS_H = 300;
const LID_H = 30;

function Token({ i }: { i: number }) {
  const row = Math.floor(i / 7);
  const col = i % 7;
  const h = hash('j' + i);
  const drop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(drop, {
      toValue: 1, duration: 800, delay: (i % 7) * 30,
      easing: Easing.bezier(0.3, 1.2, 0.5, 1), useNativeDriver: true,
    }).start();
  }, [drop, i]);
  return (
    <Animated.View
      style={{
        position: 'absolute', left: 10 + col * 29 + (row % 2 ? 12 : 0), bottom: 8 + row * 26,
        opacity: drop,
        transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }, { rotate: `${(h % 50) - 25}deg` }],
      }}
    >
      <Svg width={28} height={28} viewBox="0 0 24 24">
        <Path d={HEART_PATH} fill={PAL[h % PAL.length]} stroke={color.n900} strokeWidth={1.2} />
      </Svg>
    </Animated.View>
  );
}

/** `scale` 1 = full Jar page size; Today uses 0.6. */
export function Jar({ left, scale = 1 }: { left: number; scale?: number }) {
  const n = Math.max(0, Math.min(BUDGET, left));
  return (
    <View style={{ width: W * scale, height: (GLASS_H + LID_H) * scale, alignSelf: 'center' }}>
      <View style={{ width: W, height: GLASS_H + LID_H, transform: [{ scale }], transformOrigin: 'top left' }}>
        <View style={{ alignSelf: 'center', width: 150, height: 22, borderRadius: 11, backgroundColor: color.a500 }} />
        <View style={{ alignSelf: 'center', width: 124, height: 8, backgroundColor: alpha('#ffffff', 0.1) }} />
        <View
          style={{
            width: W, height: GLASS_H, borderTopLeftRadius: 70, borderTopRightRadius: 70, borderBottomLeftRadius: 56, borderBottomRightRadius: 56,
            backgroundColor: alpha('#ffffff', 0.07), borderWidth: 2, borderColor: alpha('#ffffff', 0.14), overflow: 'hidden',
          }}
        >
          {Array.from({ length: n }, (_, i) => <Token key={i} i={i} />)}
        </View>
      </View>
    </View>
  );
}
