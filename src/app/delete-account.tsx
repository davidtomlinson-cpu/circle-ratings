// In-app account deletion (App Store guideline 5.1.1(v)). One explanation, one confirmation, done.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackHeader, Btn, Card, H, Page, Row, T } from '../components/ui';
import { manage, storeName } from '../lib/billing';
import { friendlyError, supabase } from '../lib/supabase';
import { useApp } from '../state/store';
import { c, color } from '../theme';

const GOES = [
  'Your ratings and watchlist',
  'Your comments',
  'Your place in other people’s circles, and theirs in yours',
  'Your invite code and notifications',
  'Titles you added yourself',
  'Your anonymous 5 ♥ votes in Loved by the Club',
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

      {s.access?.source === 'own' && s.access.will_renew && (
        <Card bg={color.a800} style={{ gap: 10 }}>
          <T size={14} color={color.a100}>
            Deleting your account doesn’t cancel your subscription. It’s billed by {storeName(s.access.store)}, so cancel it there first or you’ll keep being charged.
          </T>
          <Btn small label="Manage my subscription" onPress={() => manage(s.access?.store)} />
        </Card>
      )}
      {s.access?.source === 'own' && s.access.tier !== 'individual' && (
        <T size={13} color={c.textSoft}>People on your family plan will lose access.</T>
      )}

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
