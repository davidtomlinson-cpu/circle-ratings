import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Field } from '../components/Field';
import { BackHeader, Btn, Card, H, Page, T } from '../components/ui';
import { friendlyError, supabase } from '../lib/supabase';
import { c, color } from '../theme';

const EMAIL = /.+@.+\..+/;

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const valid = name.trim().length > 0 && EMAIL.test(email.trim()) && password.length >= 8;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    setBusy(false);
    if (e) return setError(friendlyError(e));
    // With email confirmation on, there's no session until the link is clicked.
    if (!data.session) setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <Page>
        <BackHeader title="" />
        <H size={30}>Check your email</H>
        <T size={15} color={c.textSoft}>We’ve sent a link to {sentTo}. Tap it to confirm your account, then come back and sign in.</T>
        <Btn label="Go to sign in" onPress={() => router.replace('/sign-in')} />
      </Page>
    );
  }

  return (
    <Page>
      <BackHeader title="" />
      <View>
        <H size={30}>Create your account</H>
        <T size={13} color={c.textMuted}>Step 1 of 2</T>
      </View>
      {/* Apple and Google sign-in need the Apple Developer and Google Cloud setup first. */}
      <View style={{ gap: 12 }}>
        <Field placeholder="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={60} />
        <Field placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field placeholder="Password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      </View>
      {!!error && (
        <Card bg={color.a800} style={{ padding: 14 }}><T size={13} color={color.a100}>{error}</T></Card>
      )}
      <Btn label={busy ? 'Creating account…' : 'Create account'} disabled={!valid || busy} onPress={submit} />
      <Pressable onPress={() => router.replace('/sign-in')} style={{ alignItems: 'center' }}>
        <T size={14} weight="bold" color={color.a300}>I already have an account</T>
      </Pressable>
      <Pressable onPress={() => router.push('/family-join')} style={{ alignItems: 'center' }}>
        <T size={14} weight="bold" color={c.link}>Have a family invitation?</T>
      </Pressable>
      <T size={12} color={c.textMuted} center>By continuing you agree to the Terms and Privacy Policy.</T>
    </Page>
  );
}
