// Join someone's Family / Extended family plan. Opened from an invitation link
// (circleratings://family-join?code=HEART-XXXX-XXXX) or by typing the code. Works signed out:
// the code is remembered through sign-up and offered again afterwards.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Field } from '../components/Field';
import { HEART_PATH } from '../components/Icon';
import { BackHeader, Btn, Card, H, Page, T } from '../components/ui';
import { manage, storeName } from '../lib/billing';
import { normaliseFamilyCode, savePendingInvite } from '../lib/invites';
import { friendlyError, supabase } from '../lib/supabase';
import { useApp } from '../state/store';
import { c, color } from '../theme';

type Preview = { owner_name: string; tier: string; valid: boolean; reason: string; own_sub_active: boolean };
const PLAN = { family: 'Family plan', extended: 'Extended family plan' } as Record<string, string>;

export default function FamilyJoin() {
  const params = useLocalSearchParams<{ code?: string }>();
  const signedIn = useApp((s) => !!s.userId);
  const refreshAccess = useApp((s) => s.refreshAccess);
  const [entry, setEntry] = useState(String(params.code ?? ''));
  const code = normaliseFamilyCode(entry);
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState<{ owner: string; ownSub: boolean } | null>(null);

  useEffect(() => {
    setPreview(undefined);
    if (!code) return;
    if (!signedIn) {
      void savePendingInvite(code);
      return;
    }
    void supabase.rpc('family_invite_preview', { p_code: code }).then(({ data }) => setPreview((data as Preview[] | null)?.[0] ?? null));
  }, [code, signedIn]);

  const join = async () => {
    if (!code || busy) return;
    setBusy(true);
    setError('');
    const { data, error: e } = await supabase.rpc('join_family', { p_code: code });
    setBusy(false);
    if (e) return setError(friendlyError(e));
    const ownSub = !!preview?.own_sub_active;
    await refreshAccess();
    setJoined({ owner: data as string, ownSub });
  };

  const heart = (fill: string) => (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Svg width={110} height={110} viewBox="0 0 24 24"><Path d={HEART_PATH} fill={fill} /></Svg>
    </View>
  );

  if (joined) {
    return (
      <Page>
        {heart(color.s400)}
        <H size={34} center>You’re in</H>
        <T size={15} color={c.textSoft} center>You’ve joined {joined.owner}’s plan. No trial or payment needed.</T>
        {joined.ownSub && (
          <Card bg={color.a800} style={{ gap: 10 }}>
            <T size={14} color={color.a100}>You also have your own subscription. To stop paying twice, cancel it in {storeName()}.</T>
            <Btn small label="Manage my subscription" onPress={() => manage()} />
          </Card>
        )}
        <Btn label="Start rating" onPress={() => router.replace('/')} />
      </Page>
    );
  }

  return (
    <Page>
      <BackHeader title="Family invitation" />
      {heart(color.a400)}
      <H size={28} center>{preview?.valid ? `Join ${preview.owner_name}’s ${PLAN[preview.tier] ?? 'plan'}?` : 'Join a family plan'}</H>

      {!params.code && (
        <Field placeholder="HEART-ABCD-EFGH" value={entry} onChangeText={setEntry} autoCapitalize="characters" autoCorrect={false} maxLength={15} />
      )}
      {!!entry && !code && <T size={13} color={c.textMuted} center>Invitation codes look like HEART-ABCD-EFGH.</T>}

      {!signedIn && code && (
        <>
          <T size={15} color={c.textSoft} center>Create an account or sign in, and we’ll bring you straight back here to join.</T>
          <Btn label="Create account" onPress={() => router.push('/sign-up')} />
          <Btn label="I already have an account" kind="secondary" onPress={() => router.push('/sign-in')} />
        </>
      )}

      {signedIn && code && preview === undefined && <T size={14} color={c.textMuted} center>Checking the invitation…</T>}
      {signedIn && code && preview === null && <T size={15} color={color.a300} center>That code isn’t recognised. Check it with the person who sent it.</T>}
      {signedIn && preview && !preview.valid && (
        <T size={15} color={color.a300} center>
          {{
            self: 'That’s one of your own invitations. Share it with family instead.',
            already_member: 'You’re already on this plan.',
            in_other_family: 'You’re already on another family plan. Leave it first in Settings → Subscription.',
            used: 'That invitation has already been used. Ask for a new one.',
            plan_inactive: 'That plan isn’t active any more.',
          }[preview.reason] ?? 'That invitation can’t be used.'}
        </T>
      )}
      {signedIn && preview?.valid && (
        <>
          <T size={14} color={c.textSoft} center>You’ll get full access as part of {preview.owner_name}’s plan, for as long as their plan is active. Nothing to pay.</T>
          {preview.own_sub_active && (
            <T size={13} color={color.a300} center>You already pay for your own plan. After joining, cancel it in {storeName()} so you’re not charged twice.</T>
          )}
          {!!error && <T size={13} color={color.a300} center>{error}</T>}
          <Btn label={busy ? 'Joining…' : 'Join family plan'} disabled={busy} onPress={join} />
        </>
      )}
    </Page>
  );
}
