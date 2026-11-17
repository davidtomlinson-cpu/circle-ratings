import { Caprasimo_400Regular } from '@expo-google-fonts/caprasimo';
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RatingSheet } from '../components/RatingSheet';
import { ErrorBanner, Toast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useApp } from '../state/store';
import { color } from '../theme';

function useAuthListener() {
  const setSession = useApp((s) => s.setSession);
  useEffect(() => {
    // Fires INITIAL_SESSION on start, then on every sign-in / sign-out / refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't call Supabase inside this callback directly; defer to avoid a deadlock in supabase-js.
      setTimeout(() => void setSession(session?.user.id ?? null), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [setSession]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Caprasimo_400Regular, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold,
  });
  useAuthListener();
  const ready = useApp((s) => s.ready);
  const signedIn = useApp((s) => !!s.userId);

  if (!fontsLoaded || !ready) return <View style={{ flex: 1, backgroundColor: color.n900 }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: color.n900 }}>
        {/* Secondary pages slide in from the right over the tabs. */}
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: color.n900 } }}>
          <Stack.Protected guard={signedIn} redirectTo="/welcome">
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="title/[key]" />
            <Stack.Screen name="jar" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="search" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="profile" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn} redirectTo="/">
            <Stack.Screen name="welcome" />
            <Stack.Screen name="sign-up" />
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
        {signedIn && <RatingSheet />}
        <Toast />
        <ErrorBanner />
      </View>
    </SafeAreaProvider>
  );
}
