// In-app account deletion (App Store guideline 5.1.1(v)). One explanation, one confirmation, done.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackHeader, Btn, Card, H, Page, Row, T } from '../components/ui';
import { friendlyError, supabase } from '../lib/supabase';
import { useApp } from '../state/store';
import { c, color } from '../theme';

const GOES = [
  'Your ratings, watchlist and My list',
  'Your comments',
  'Your place in other people’s circles, and theirs in yours',
  'Your invite code and notifications',
  'Titles you added yourself',
  'Your anonymous 5 ♥ votes in Loved worldwide',
];

export default function DeleteAccount() {
  const s = useApp();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    setBusy(true);
    setError('');
    const { error: e } = await supabase.rpc('delete_my_account');
    if (e) {
      setBusy(false);
      return setError(friendlyError(e));
    }
    s.showNotice('Your account and everything in it has been deleted.');
    // The account no longer exists; clear the session on this device only.
    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <Page>
      <BackHeader title="Delete account" />
      <View>
        <H size={26}>Delete your account</H>
        <T size={14} color={c.textSoft}>This permanently deletes your account straight away. It can’t be undone.</T>
      </View>

      <Card style={{ gap: 8 }}>
        <T size={13} weight="bold" color={c.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>What gets deleted</T>
        {GOES.map((g) => (
          <Row key={g} gap={10} style={{ alignItems: 'flex-start' }}>
            <T size={14} color={color.a400}>•</T>
            <T size={14} style={{ flex: 1 }}>{g}</T>
          </Row>
        ))}
      </Card>

      {/* When billing ships: tell people that deleting the account doesn't cancel an App Store / Google Play
          subscription, and link to the store's subscription settings here. */}

      {!!error && <Card bg={color.a800} style={{ padding: 14 }}><T size={13} color={color.a100}>{error}</T></Card>}

      {confirming ? (
        <Card style={{ gap: 12 }}>
          <T size={15} weight="bold">Are you sure? {s.circle.length ? `${s.circle.length === 1 ? s.circle[0].name : `The ${s.circle.length} people in your circle`} will no longer see your list.` : ''}</T>
          <Btn label={busy ? 'Deleting…' : 'Yes, delete everything'} disabled={busy} onPress={remove} style={{ backgroundColor: color.a700 }} />
          <Btn label="Keep my account" kind="secondary" disabled={busy} onPress={() => setConfirming(false)} />
        </Card>
      ) : (
        <>
          <Btn label="Delete my account" onPress={() => setConfirming(true)} style={{ backgroundColor: color.a700 }} />
          <Btn label="Cancel" kind="secondary" onPress={() => router.back()} />
        </>
      )}
    </Page>
  );
}
