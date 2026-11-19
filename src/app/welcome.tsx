import { router } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { Btn, H, T } from '../components/ui';
import { c } from '../theme';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  // Shrink the logo on short phones (iPhone SE) so everything fits without scrolling.
  const { height } = useWindowDimensions();
  const short = height < 720;
  const logo = Math.min(210, Math.round(height * 0.24));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 28, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 16 }}>
        <Logo stacked mark={logo} text={short ? 40 : 46} />
      </View>
      <View style={{ gap: short ? 14 : 18 }}>
        <H size={short ? 32 : 40}>{'Rate it.\nShare it.\nFind your next love.'}</H>
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
