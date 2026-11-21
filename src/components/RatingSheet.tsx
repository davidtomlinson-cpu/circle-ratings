// Bottom sheet for rating a title: tap or drag across five hearts.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { HEART_WORDS, item } from '../data/model';
import { useApp } from '../state/store';
import { alpha, c, color, radius } from '../theme';
import { HEART_PATH } from './Icon';
import { Btn, Disc, H, Row, T } from './ui';

const EASE = Easing.bezier(0.2, 0.9, 0.25, 1);

export function RatingSheet() {
  const s = useApp();
  const { open, key, val } = s.sheet;
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(open);
  const width = useRef(1);

  // Mount as soon as it opens (set during render, as React recommends); unmount after the close animation.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    Animated.timing(anim, { toValue: open ? 1 : 0, duration: 450, easing: EASE, useNativeDriver: true }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, anim]);

  if (!mounted) return null;

  const it = item(key, s.custom);
  const fromWatchlist = !!s.want[key];
  const label = !val ? 'Pick your hearts' : s.my[key] ? 'Update rating' : 'Save rating';
  const note = fromWatchlist && s.settings.contribute
    ? 'Shared with your circle. A 5 ♥ for something just finished from your watchlist also joins Loved worldwide.'
    : fromWatchlist
      ? 'Shared with your circle. You’ve turned off worldwide sharing.'
      : 'Shared with your circle. Rated straight from a list, so it stays out of Loved worldwide.';

  const pick = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    s.setSheetVal(Math.max(1, Math.min(5, Math.ceil((x / width.current) * 5))));
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(c.ink, 0.6), opacity: anim }]}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={s.closeSheet} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 20, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] },
        ]}
      >
        <View style={styles.grip} />
        <Row>
          <Disc size={52} bg={it.coverBg} fg={it.coverFg} label={it.initial} />
          <View style={{ flex: 1 }}>
            <H size={20} numberOfLines={1}>{it.title}</H>
            <T size={12} color={c.textMuted} numberOfLines={1}>{it.sub}</T>
          </View>
        </Row>

        <View
          accessibilityRole="adjustable"
          accessibilityLabel={`Rating, ${val} of 5 hearts`}
          style={styles.hearts}
          onLayout={(e) => (width.current = e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={pick}
          onResponderMove={pick}
          onResponderTerminationRequest={() => false}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= val;
            return (
              <View key={n} pointerEvents="none" style={{ flex: 1, alignItems: 'center', transform: [{ scale: n === val ? 1.18 : 1 }] }}>
                <Svg width={38} height={38} viewBox="0 0 24 24">
                  <Path d={HEART_PATH} fill={on ? color.a400 : 'none'} stroke={on ? color.a400 : color.n500} strokeWidth={2} strokeLinejoin="round" />
                </Svg>
              </View>
            );
          })}
        </View>

        <H size={20} color={color.a300} center>{HEART_WORDS[val]}</H>
        <T size={12} color={c.textSoft} center>{note}</T>
        <Btn label={label} disabled={!val} onPress={s.saveRating} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.n800,
    borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 20, paddingTop: 10, gap: 16,
  },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.n600 },
  hearts: { flexDirection: 'row', backgroundColor: color.n900, borderRadius: radius.pill, height: 72, alignItems: 'center', paddingHorizontal: 10 },
});
