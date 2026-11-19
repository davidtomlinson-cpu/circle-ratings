// SofaList logo: the glowing sofa mark with the two-colour wordmark under or beside it.
import { Image, Text, View } from 'react-native';
import { color } from '../theme';
import { H } from './ui';

// The sofa mark on a transparent background (the same image the splash screen uses).
const MARK = require('../../assets/splash-icon.png');

export function Wordmark({ size }: { size: number }) {
  return (
    <H size={size}>
      <Text style={{ color: color.s400 }}>Sofa</Text>
      <Text style={{ color: color.a400 }}>List</Text>
    </H>
  );
}

/** `stacked`: big mark above the name (welcome). Otherwise a small mark beside it (paywall). */
export function Logo({ mark, text, stacked = false }: { mark: number; text: number; stacked?: boolean }) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="SofaList"
      style={stacked ? { alignItems: 'center', gap: 4 } : { flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <Image source={MARK} style={{ width: mark, height: mark }} resizeMode="contain" />
      <Wordmark size={text} />
    </View>
  );
}
