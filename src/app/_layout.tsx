import { Caprasimo_400Regular } from '@expo-google-fonts/caprasimo';
import {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RatingSheet } from '../components/RatingSheet';
import { ErrorBanner, Toast } from '../components/Toast';
import { takePendingInvite } from '../lib/invites';
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

/** Live updates: refetch the unread count (and the circle on joins) when a notification arrives. */
function useNotificationsLive() {
  const userId = useApp((s) => s.userId);
  const refreshUnread = useApp((s) => s.refreshUnread);
  const refreshCircle = useApp((s) => s.refreshCircle);
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        void refreshUnread();
        // Someone joined (or their activity arrived): keep names and counts current.
        const kind = (payload.new as { kind?: string }).kind;
        if (kind === 'joined') void refreshCircle();
        if (kind === 'family_joined' || kind === 'trial_ending') void useApp.getState().refreshAccess();
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [userId, refreshUnread, refreshCircle]);
}

/** Re-check the plan whenever the app comes back to the foreground (renewals, expiries, family changes). */
function useAccessRefresh(signedIn: boolean) {
  const refreshAccess = useApp((s) => s.refreshAccess);
  useEffect(() => {
    if (!signedIn) return;
    const sub = AppState.addEventListener('change', (st) => st === 'active' && void refreshAccess());
    return () => sub.remove();
  }, [signedIn, refreshAccess]);
}

/** If an invite link was opened while signed out, offer it straight after sign-in. */
function usePendingInvite(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;
    void takePendingInvite().then((code) => {
      if (!code) return;
      // Family plan invitations start with HEART-; everything else is a circle invite.
      const href = code.startsWith('HEART-') ? `/family-join?code=${code}` : `/join/${code}`;
      setTimeout(() => router.push(href as never), 300);
    });
  }, [signedIn]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Caprasimo_400Regular, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold,
  });
  useAuthListener();
  const ready = useApp((s) => s.ready);
  const signedIn = useApp((s) => !!s.userId);
  const paid = useApp((s) => !!s.access?.has_access);
  useNotificationsLive();
  useAccessRefresh(signedIn);
  usePendingInvite(ready && signedIn);

  if (!fontsLoaded || !ready) return <View style={{ flex: 1, backgroundColor: color.n900 }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: color.n900 }}>
        {/* Secondary pages slide in from the right over the tabs. */}
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: color.n900 } }}>
          {/* The app itself: signed in with an active plan (own, family member, or trial). */}
          <Stack.Protected guard={signedIn && paid} redirectTo={signedIn ? '/plans' : '/welcome'}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="title/[key]" />
            <Stack.Screen name="jar" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="search" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="invite" />
            <Stack.Screen name="contacts" />
            <Stack.Screen name="friend/[id]" />
            <Stack.Screen name="top20" />
            <Stack.Screen name="subscription" />
            <Stack.Screen name="family" />
            <Stack.Screen name="trial-ending" />
          </Stack.Protected>
          {/* Signed in, whether or not they've paid: account management must always be reachable. */}
          <Stack.Protected guard={signedIn} redirectTo="/welcome">
            <Stack.Screen name="profile" />
            <Stack.Screen name="delete-account" />
          </Stack.Protected>
          {/* Signed in without a plan: the paywall. */}
          <Stack.Protected guard={signedIn && !paid} redirectTo="/">
            <Stack.Screen name="plans" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn} redirectTo="/">
            <Stack.Screen name="welcome" />
            <Stack.Screen name="sign-up" />
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
          {/* Reachable signed in or out: an invite link must survive the sign-up detour. */}
          <Stack.Screen name="join/[code]" />
          <Stack.Screen name="family-join" />
        </Stack>
        {signedIn && <RatingSheet />}
        <Toast />
        <ErrorBanner />
      </View>
    </SafeAreaProvider>
  );
}
