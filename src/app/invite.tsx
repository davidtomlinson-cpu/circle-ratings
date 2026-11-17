import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { Field } from '../components/Field';
import { BackHeader, Btn, Card, Disc, H, Page, Row, T } from '../components/ui';
import { inviteMessage, normaliseCode } from '../lib/invites';
import { friendlyError, supabase } from '../lib/supabase';
import { useApp, useMe } from '../state/store';
import { c, color, font } from '../theme';

export default function Invite() {
  const me = useMe();
  const circle = useApp((s) => s.circle);
  const showError = useApp((s) => s.showError);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [entry, setEntry] = useState('');

  const load = useCallback(async (fresh = false) => {
    const { data, error } = await supabase.rpc('my_invite_code', { p_new: fresh });
    if (error) return showError(friendlyError(error));
    setCode(data as string);
  }, [showError]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const share = async () => {
    if (!code) return;
    try {
      await Share.share({ message: inviteMessage(me.first, code) });
    } catch {
      // Share sheet not available (e.g. some browsers): fall back to copying.
      await copy();
    }
  };
  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(inviteMessage(me.first, code));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const entered = normaliseCode(entry);

  return (
    <Page>
      <BackHeader title="Invite" />
      <View>
        <H size={26}>Grow your circle</H>
        <T size={13} color={c.textSoft}>People in your circle see your list and ratings, and you see theirs. Nobody else does.</T>
      </View>

      <Card bg={color.s700} style={{ gap: 12 }}>
        <T size={11} weight="bold" color={color.s200} style={{ letterSpacing: 0.6 }}>YOUR INVITE CODE</T>
        <T size={30} color={c.text} style={{ fontFamily: font.extrabold, letterSpacing: 3, lineHeight: 36 }} selectable>{code ?? '····-····'}</T>
        <Row gap={8}>
          <Btn small label="Share" icon="userPlus" onPress={share} disabled={!code} style={{ flex: 1 }} />
          <Btn small label={copied ? 'Copied' : 'Copy'} kind="secondary" onPress={copy} disabled={!code} style={{ flex: 1, backgroundColor: color.s900 }} />
        </Row>
        {confirmNew ? (
          <View style={{ gap: 8 }}>
            <T size={12} color={color.s100}>A new code stops the old one working for anyone you haven’t invited yet. People already in your circle stay.</T>
            <Row gap={8}>
              <Btn small label="Make new code" onPress={() => { setConfirmNew(false); void load(true); }} style={{ flex: 1 }} />
              <Btn small label="Keep this one" kind="secondary" onPress={() => setConfirmNew(false)} style={{ flex: 1 }} />
            </Row>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmNew(true)}><T size={12} weight="bold" color={color.s200}>Make a new code</T></Pressable>
        )}
      </Card>

      <View style={{ gap: 10 }}>
        <H size={20}>Have a code?</H>
        <Row gap={8}>
          <Field placeholder="ABCD-EFGH" value={entry} onChangeText={setEntry} autoCapitalize="characters" autoCorrect={false} style={{ flex: 1 }} maxLength={9} />
          <Btn small label="Join" disabled={!entered} onPress={() => entered && router.push(`/join/${entered}`)} />
        </Row>
      </View>

      <View style={{ gap: 10 }}>
        <H size={20}>Already in your circle</H>
        {circle.length ? (
          <Row gap={10} style={{ flexWrap: 'wrap' }}>
            {circle.map((m) => (
              <Pressable key={m.id} onPress={() => router.push(`/friend/${m.id}`)} style={{ alignItems: 'center', gap: 4, width: 56 }}>
                <Disc size={44} bg={color.a300} label={m.name[0]} display={false} />
                <T size={11} numberOfLines={1}>{m.name.split(' ')[0]}</T>
              </Pressable>
            ))}
          </Row>
        ) : (
          <T size={13} color={c.textMuted}>No one yet. Share your code with family and friends.</T>
        )}
      </View>
    </Page>
  );
}
