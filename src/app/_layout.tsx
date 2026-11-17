import { Caprasimo_400Regular } from '@expo-google-fonts/caprasimo';
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RatingSheet } from '../components/RatingSheet';
import { Toast } from '../components/Toast';
import { color } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Caprasimo_400Regular, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: color.n900 }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: color.n900 }}>
        {/* Secondary pages slide in from the right over the tabs. */}
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: color.n900 } }} />
        <RatingSheet />
        <Toast />
      </View>
    </SafeAreaProvider>
  );
}
