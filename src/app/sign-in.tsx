import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Field } from '../components/Field';
import { BackHeader, Btn, Card, H, Page, T } from '../components/ui';
import { friendlyError, supabase } from '../lib/supabase';
import { c, color } from '../theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const submit = async () => {
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    // On success the auth listener in the root layout switches to the app.
    if (e) setError(friendlyError(e));
  };

  const reset = async () => {
    if (!/.+@.+\..+/.test(email.trim())) return setError('Enter your email above first.');
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (e) return setError(friendlyError(e));
    setError('');
    setNote(`If there’s an account for ${email.trim()}, a reset link is on its way.`);
  };

  return (
    <Page>
      <BackHeader title="" />
      <H size={30}>Welcome back</H>
      <View style={{ gap: 12 }}>
        <Field placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      </View>
      {!!error && <Card bg={color.a800} style={{ padding: 14 }}><T size={13} color={color.a100}>{error}</T></Card>}
      {!!note && <Card bg={color.s800} style={{ padding: 14 }}><T size={13} color={color.s100}>{note}</T></Card>}
      <Btn label={busy ? 'Signing in…' : 'Sign in'} disabled={!email.trim() || !password || busy} onPress={submit} />
      <Pressable onPress={reset} style={{ alignItems: 'center' }}>
        <T size={14} weight="bold" color={c.textSoft}>Forgot password?</T>
      </Pressable>
      <Pressable onPress={() => router.replace('/sign-up')} style={{ alignItems: 'center' }}>
        <T size={14} weight="bold" color={color.a300}>Create an account</T>
      </Pressable>
    </Page>
  );
}
