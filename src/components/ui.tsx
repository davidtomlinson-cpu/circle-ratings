// Small shared building blocks. Kept in one file while the component set is small.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
  type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, c, color, font, radius, space } from '../theme';
import { HEART_PATH, Icon, type IconName } from './Icon';
import Svg, { Path } from 'react-native-svg';

// ---- Text -----------------------------------------------------------------

type W = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
type TProps = TextProps & { size?: number; weight?: W; color?: string; style?: StyleProp<TextStyle>; center?: boolean };

export function T({ size = 15, weight = 'regular', color: col = c.text, style, center, ...rest }: TProps) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: font[weight], fontSize: size, color: col, lineHeight: Math.round(size * (size >= 15 ? 1.5 : 1.35)) }, center && { textAlign: 'center' }, style]}
    />
  );
}

/** Caprasimo heading. */
export function H({ size = 24, color: col = c.text, style, center, ...rest }: TProps) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: font.display, fontSize: size, color: col, lineHeight: Math.round(size * 1.12), letterSpacing: -0.015 * size }, center && { textAlign: 'center' }, style]}
    />
  );
}

// ---- Layout ---------------------------------------------------------------

export const TAB_BAR_HEIGHT = 92;

/** Scrollable page with the 20px gutter. `tabs` leaves room for the tab bar. */
export function Page({ children, tabs, style }: { children: ReactNode; tabs?: boolean; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[{ paddingTop: insets.top + 12, paddingHorizontal: space.gutter, paddingBottom: (tabs ? TAB_BAR_HEIGHT : insets.bottom) + 28, gap: space.section }, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, bg = c.card, style, onPress }: { children: ReactNode; bg?: string; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const s = [{ backgroundColor: bg, borderRadius: radius.card, padding: 18 }, style];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]}>{children}</Pressable>
  ) : (
    <View style={s}>{children}</View>
  );
}

export function Row({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

/** Secondary page header: 44px round back button + title. */
export function BackHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <Row style={{ marginBottom: 4 }}>
      <Pressable accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back}>
        <Icon name="arrowLeft" size={20} />
      </Pressable>
      <T size={15} weight="bold" style={{ flex: 1 }}>{title}</T>
      {right}
    </Row>
  );
}

// ---- Pieces ---------------------------------------------------------------

export function Disc({ size = 40, bg, fg = c.ink, label, display = true }: { size?: number; bg: string; fg?: string; label: string; display?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {display ? (
        <H size={size * 0.45} color={fg} style={{ lineHeight: size * 0.6 }}>{label}</H>
      ) : (
        <T size={size * 0.38} weight="bold" color={fg}>{label}</T>
      )}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: on ? color.n100 : c.card }]}>
      <T size={13} weight="bold" color={on ? c.ink : color.n100}>{label}</T>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }}>
      {children}
    </ScrollView>
  );
}

type BtnKind = 'primary' | 'secondary' | 'positive' | 'quiet';
const BTN: Record<BtnKind, [string, string]> = {
  primary: [c.primary, c.text],
  secondary: [color.n700, color.n100],
  positive: [color.s700, color.s100],
  quiet: [c.card, color.a300],
};

export function Btn({ label, onPress, kind = 'primary', disabled, small, style, icon }: { label: string; onPress?: () => void; kind?: BtnKind; disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; icon?: IconName }) {
  const [bg, fg] = BTN[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: bg, height: small ? 34 : 54, paddingHorizontal: small ? 14 : 22, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
        disabled && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={small ? 14 : 18} color={fg} />}
      <T size={small ? 13 : 16} weight={small ? 'bold' : 'semibold'} color={fg}>{label}</T>
    </Pressable>
  );
}

/** "5 ♥" pill used wherever a rating is shown. */
export function HeartPill({ v, onPress }: { v: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.heartPill}>
      <H size={15} style={{ lineHeight: 18 }}>{v}</H>
      <HeartGlyph size={13} fill={c.text} />
    </Pressable>
  );
}

export function HeartGlyph({ size = 16, fill = c.accent, stroke }: { size?: number; fill?: string; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={HEART_PATH} fill={fill} stroke={stroke ?? fill} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

export function Hearts({ v, size = 14 }: { v: number; size?: number }) {
  return (
    <Row gap={2}>
      {[1, 2, 3, 4, 5].map((n) => (
        <HeartGlyph key={n} size={size} fill={n <= v ? c.accent : 'none'} stroke={n <= v ? c.accent : color.n600} />
      ))}
    </Row>
  );
}

/** Standard list row: disc, title + sub, optional right-hand control. */
export function ListRow({ disc, title, sub, extra, right, onPress, bg }: { disc: ReactNode; title: string; sub?: string; extra?: ReactNode; right?: ReactNode; onPress?: () => void; bg?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listRow, bg ? { backgroundColor: bg } : null, pressed && { opacity: 0.8 }]}>
      {disc}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={14} weight="bold" numberOfLines={1}>{title}</T>
        {!!sub && <T size={12} color={c.textMuted} numberOfLines={1}>{sub}</T>}
        {extra}
      </View>
      {right}
    </Pressable>
  );
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T size={12} weight="bold" color={c.textMuted} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>{children}</T>
      {right}
    </Row>
  );
}

export function RoundIcon({ name, onPress, label, badge }: { name: IconName; onPress?: () => void; label: string; badge?: number }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.round}>
      <Icon name={name} size={17} />
      {!!badge && (
        <View style={styles.badge}><T size={10} weight="bold" color={c.ink} style={{ lineHeight: 12 }}>{badge}</T></View>
      )}
    </Pressable>
  );
}

export function ProgressBar({ pct, fg = c.accent, bg = color.n700 }: { pct: number; fg?: string; bg?: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: bg, overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: fg, borderRadius: 4 }} />
    </View>
  );
}

export const tint = {
  rated: alpha(color.a400, 0.14),
  want: alpha(color.s400, 0.18),
  unread: alpha(color.a400, 0.12),
};

const styles = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  heartPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.primary, height: 34, paddingHorizontal: 12, borderRadius: radius.pill },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 20 },
  round: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: color.a400, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
});
