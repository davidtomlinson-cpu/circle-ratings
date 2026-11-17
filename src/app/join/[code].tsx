// Opened from an invite link (circleratings://join/CODE) or the "Have a code?" box.
// Works signed out too: the code is remembered and offered again after sign-in.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { HEART_PATH } from '../../components/Icon';
import { BackHeader, Btn, H, Page, T } from '../../components/ui';
import { normaliseCode, savePendingInvite } from '../../lib/invites';
import { friendlyError, supabase } from '../../lib/supabase';
import { useApp } from '../../state/store';
import { c, color } from '../../theme';

type Preview = { owner_name: string; already_in: boolean; is_self: boolean };

export default function Join() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = normaliseCode(String(raw ?? ''));
  const signedIn = useApp((s) => !!s.userId);
  const refreshCircle = useApp((s) => s.refreshCircle);
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState('');

  useEffect(() => {
    if (!code) return setPreview(null);
    if (!signedIn) {
      void savePendingInvite(code);
      return;
    }
    void supabase.rpc('invite_preview', { p_code: code }).then(({ data }) => setPreview((data as Preview[] | null)?.[0] ?? null));
  }, [code, signedIn]);

  const accept = async () => {
    if (!code || busy) return;
    setBusy(true);
    const { data, error: e } = await supabase.rpc('accept_invite', { p_code: code });
    setBusy(false);
    if (e) return setError(friendlyError(e));
    await refreshCircle();
    setJoined(data as string);
  };

  const heart = (fill: string) => (
    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
      <Svg width={110} height={110} viewBox="0 0 24 24"><Path d={HEART_PATH} fill={fill} /></Svg>
    </View>
  );

  if (!signedIn) {
    return (
      <Page>
        <BackHeader title="Invite" />
        {heart(color.a400)}
        <H size={30} center>You’ve been invited</H>
        <T size={15} color={c.textSoft} center>Create an account or sign in, and we’ll take you straight back here to join with code {code ?? ''}.</T>
        <Btn label="Create account" onPress={() => router.push('/sign-up')} />
        <Btn label="I already have an account" kind="secondary" onPress={() => router.push('/sign-in')} />
      </Page>
    );
  }

  if (joined) {
    return (
      <Page>
        {heart(color.s400)}
        <H size={34} center>You’re in</H>
        <T size={15} color={c.textSoft} center>You and {joined} can now see each other’s lists, depending on each of your privacy settings.</T>
        <Btn label="See your circle" onPress={() => router.replace('/contacts')} />
      </Page>
    );
  }

  return (
    <Page>
      <BackHeader title="Join a circle" />
      {heart(color.a400)}
      {preview === undefined && <T size={15} color={c.textMuted} center>Checking the code…</T>}
      {preview === null && (
        <>
          <H size={28} center>That code isn’t recognised</H>
          <T size={14} color={c.textSoft} center>Check it with the person who sent it. Codes look like ABCD-EFGH.</T>
          <Btn label="Back" kind="secondary" onPress={() => router.back()} />
        </>
      )}
      {preview && preview.is_self && (
        <>
          <H size={28} center>That’s your own code</H>
          <T size={14} color={c.textSoft} center>Share it with others so they can join you.</T>
          <Btn label="Share my code" onPress={() => router.replace('/invite')} />
        </>
      )}
      {preview && !preview.is_self && preview.already_in && (
        <>
          <H size={28} center>You’re already in {preview.owner_name}’s circle</H>
          <Btn label="See your circle" onPress={() => router.replace('/contacts')} />
        </>
      )}
      {preview && !preview.is_self && !preview.already_in && (
        <>
          <H size={28} center>Join {preview.owner_name}’s circle?</H>
          <T size={14} color={c.textSoft} center>You’ll be able to see each other’s ratings, depending on each of your privacy settings. You can leave any time.</T>
          {!!error && <T size={13} color={color.a300} center>{error}</T>}
          <Btn label={busy ? 'Joining…' : 'Join'} disabled={busy} onPress={accept} />
          <Btn label="Not now" kind="secondary" onPress={() => router.replace('/')} />
        </>
      )}
    </Page>
  );
}
