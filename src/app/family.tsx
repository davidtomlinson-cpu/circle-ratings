// Family plan: invitation slots. Unused → Share / Copy / New code. Used → name · joined + Remove (two taps).
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { BackHeader, Btn, Card, H, Page, ProgressBar, Row, T } from '../components/ui';
import { TIERS } from '../lib/billing';
import { familyInviteMessage } from '../lib/invites';
import { friendlyError, supabase } from '../lib/supabase';
import { useApp, useMe } from '../state/store';
import { c, color, font } from '../theme';

type Slot = { slot: number; code: string; member_id: string | null; member_name: string; joined_at: string | null; places: number; active: boolean };

export default function Family() {
  const s = useApp();
  const me = useMe();
  const a = s.access;
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_family');
    if (error) return s.showError(friendlyError(error));
    setSlots((data as Slot[]) ?? []);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const owner = a?.source === 'own' && (a.tier === 'family' || a.tier === 'extended');
  const planName = TIERS.find((t) => t.tier === a?.tier)?.name.toLowerCase() + ' plan';

  if (!owner) {
    return (
      <Page>
        <BackHeader title="Family plan" />
        <H size={26}>Share with your family</H>
        <T size={14} color={c.textSoft}>
          {a?.source === 'family'
            ? `You’re on ${a.owner_name}’s plan.`
            : 'Family covers up to 6 people and Extended family up to 10. Everyone gets their own account, lists and ratings.'}
        </T>
        {a?.source !== 'family' && <Btn label="See plans" onPress={() => router.push('/subscription')} />}
      </Page>
    );
  }

  const places = slots?.[0]?.places ?? (a?.tier === 'extended' ? 10 : 6);
  const used = 1 + (slots ?? []).filter((x) => x.member_id).length;

  const reset = async (slot: number) => {
    setConfirm(null);
    const { error } = await supabase.rpc('reset_family_slot', { p_slot: slot });
    if (error) s.showError(friendlyError(error));
    await load();
  };
  const share = async (code: string) => {
    try { await Share.share({ message: familyInviteMessage(me.first, code, planName) }); } catch { /* sheet unavailable */ }
  };
  const copy = async (slot: Slot) => {
    await Clipboard.setStringAsync(familyInviteMessage(me.first, slot.code, planName));
    setCopied(slot.slot);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <Page>
      <BackHeader title="Family plan" />
      <View style={{ gap: 6 }}>
        <H size={26}>{TIERS.find((t) => t.tier === a?.tier)?.name} plan</H>
        <T size={13} color={c.textSoft}>{used} of {places} places used · you{used > 1 ? ` + ${used - 1} joined` : ''}</T>
        <ProgressBar pct={(used / places) * 100} fg={color.s400} />
      </View>

      <Card style={{ paddingVertical: 4 }}>
        {(slots ?? []).map((x, i) => (
          <View key={x.slot} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: color.n700, gap: 8 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <T size={14} style={{ fontFamily: font.extrabold, letterSpacing: 1 }} selectable>{x.code}</T>
                <T size={12} color={c.textMuted}>{x.member_id ? `${x.member_name} · joined` : 'Unused'}</T>
              </View>
              {x.member_id ? (
                <Btn small label="Remove" kind="secondary" onPress={() => setConfirm(x.slot)} />
              ) : (
                <Row gap={6}>
                  <Btn small label="Share" onPress={() => share(x.code)} />
                  <Btn small label={copied === x.slot ? 'Copied' : 'Copy'} kind="secondary" onPress={() => copy(x)} />
                </Row>
              )}
            </Row>
            {!x.member_id && (
              <Pressable onPress={() => reset(x.slot)}><T size={12} weight="bold" color={c.textMuted}>New code (cancels this one)</T></Pressable>
            )}
            {confirm === x.slot && (
              <Row gap={8}>
                <T size={13} style={{ flex: 1 }}>Remove {x.member_name}? They lose access and this place gets a new code.</T>
                <Btn small label="Remove" onPress={() => reset(x.slot)} />
                <Btn small label="Keep" kind="secondary" onPress={() => setConfirm(null)} />
              </Row>
            )}
          </View>
        ))}
      </Card>
      <T size={12} color={c.textMuted}>Each code works once. Removing someone frees their place and makes a new code. “New code” cancels the old one.</T>
    </Page>
  );
}
