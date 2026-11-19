// "Sent to your circle" toast that drops in from the top after a rating is saved.
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { item, joinNames } from '../data/model';
import { useApp, useMe, viewers } from '../state/store';
import { alpha, c, color } from '../theme';
import { HeartGlyph, Row, T } from './ui';

export function Toast() {
  const s = useApp();
  const t = s.toast;
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!t) return;
    y.setValue(0);
    Animated.timing(y, { toValue: 1, duration: 550, easing: Easing.bezier(0.3, 1.3, 0.5, 1), useNativeDriver: true }).start();
    const id = setTimeout(() => {
      Animated.timing(y, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => s.hideToast());
    }, 4200);
    return () => clearTimeout(id);
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t) return null;
  const it = item(t.key, s.custom);
  const who = viewers(s);
  const world = t.val === 5 ? (s.fresh[t.key] && s.settings.contribute ? 'Added anonymously to Loved worldwide' : 'Not added to Loved worldwide') : '';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { top: insets.top + 8, opacity: y, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }] },
      ]}
    >
      <Row gap={10}>
        <View style={styles.icon}><HeartGlyph size={18} fill={c.text} /></View>
        <View style={{ flex: 1 }}>
          <T size={11} weight="bold" color={color.s300} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{who.length ? 'Sent to your circle · now' : 'Saved · now'}</T>
          <T size={14} weight="bold" numberOfLines={1}>{me.first} gave {it.title} {t.val} ♥</T>
          <T size={12} color={c.textSoft} numberOfLines={2}>
            {who.length ? `Shared with ${joinNames(who)}` : s.circle.length ? 'Your list is private, so no one is notified' : 'Saved to My list'}
            {world ? ` · ${world}` : ''}
          </T>
        </View>
      </Row>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 14, right: 14, backgroundColor: color.n700, borderRadius: 24, padding: 14,
    borderWidth: 1, borderColor: alpha('#ffffff', 0.08),
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
});

/** Banner for failed server writes (e.g. out of hearts, offline), or a neutral notice when `info` is set. */
export function ErrorBanner() {
  const err = useApp((s) => s.error);
  const hide = useApp((s) => s.hideError);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!err) return;
    const id = setTimeout(hide, 4000);
    return () => clearTimeout(id);
  }, [err?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!err) return null;
  return (
    <View accessibilityRole="alert" style={[styles.toast, { top: insets.top + 8, backgroundColor: err.info ? color.s800 : color.a800, borderColor: err.info ? color.s600 : color.a600 }]}>
      <T size={14} weight="bold" color={err.info ? color.s100 : color.a100}>{err.msg}</T>
    </View>
  );
}
