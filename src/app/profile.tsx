import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { BackHeader, Disc, H, Page, Row, T } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useApp, useMe, wantKeys } from '../state/store';
import { c, color } from '../theme';

const VIS = { all: 'All my contacts', some: 'Only people I choose', locked: 'Locked · only you' } as const;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T size={12} weight="bold" color={c.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.6, paddingLeft: 4 }}>{title}</T>
      <View style={{ backgroundColor: color.n800, borderRadius: 24, paddingHorizontal: 16 }}>{children}</View>
    </View>
  );
}

function Item({ label, sub, right, onPress, first }: { label: string; sub?: string; right?: ReactNode; onPress?: () => void; first?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: first ? 0 : 1, borderTopColor: color.n700 }}>
      <View style={{ flex: 1 }}>
        <T size={14} weight="bold">{label}</T>
        {!!sub && <T size={12} color={c.textMuted}>{sub}</T>}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={18} color={color.n400} /> : null)}
    </Pressable>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch value={value} onValueChange={onChange} trackColor={{ false: color.n600, true: color.s500 }} thumbColor={color.n100} {...({ activeThumbColor: color.n100 } as object)} />
  );
}

export default function Profile() {
  const s = useApp();
  const me = useMe();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.name);

  const saveName = () => {
    const n = name.trim();
    if (n && n !== s.name) s.setName(n);
    setEditing(false);
  };

  return (
    <Page>
      <BackHeader title="Profile" />
      <Row gap={16}>
        <Disc size={64} bg={color.s400} label={me.initial} />
        <View style={{ flex: 1, gap: 4 }}>
          {editing ? (
            <Field value={name} onChangeText={setName} onSubmitEditing={saveName} onBlur={saveName} autoFocus maxLength={60} style={{ height: 44 }} />
          ) : (
            <Pressable onPress={() => { setName(s.name); setEditing(true); }} accessibilityHint="Edit your name">
              <H size={26}>{me.name}</H>
            </Pressable>
          )}
          <T size={13} color={c.textMuted}>{wantKeys(s).length} on watchlist · {Object.keys(s.my).length} rated</T>
        </View>
      </Row>

      {s.access?.has_access && (
        <Group title="Account">
          <Item
            first
            label="Subscription"
            sub={s.access.source === 'family'
              ? `Member of ${s.access.owner_name}’s plan`
              : `${{ individual: 'Individual', family: 'Family', extended: 'Extended family' }[s.access.tier ?? 'individual']}${s.access.in_trial ? ' · free trial' : ''}${s.access.will_renew ? '' : ' · cancelled'}`}
            onPress={() => router.push('/subscription')}
          />
          <Item
            label="Family plan"
            sub={s.access.source === 'own' && s.access.tier !== 'individual' ? 'Invite family and manage places' : s.access.source === 'family' ? 'You’re on a family plan' : 'Upgrade to share with family'}
            onPress={() => router.push('/family')}
          />
        </Group>
      )}

      <Group title="Circle">
        <Item first label="Invite people" sub="Share your code" onPress={() => router.push('/invite')} />
        <Item label="Contacts" sub={s.circle.length ? `${s.circle.length} in your circle` : 'No one yet'} onPress={() => router.push('/contacts')} />
      </Group>

      <Group title="Privacy">
        <Item first label="Who can see My list" sub={VIS[s.vis]} onPress={() => router.push('/privacy')} />
        <Item label="Share my 5 ♥ titles worldwide" sub="Added anonymously to Loved worldwide" right={<Toggle value={s.settings.contribute} onChange={(v) => s.setSetting('contribute', v)} />} />
      </Group>

      <Group title="Notifications">
        <Item first label="Circle activity" sub="When someone rates something you have" right={<Toggle value={s.settings.notify} onChange={(v) => s.setSetting('notify', v)} />} />
        <Item label="Billing tips and offers" sub="Required reminders, like your trial ending, are always sent" right={<Toggle value={s.settings.remind} onChange={(v) => s.setSetting('remind', v)} />} />
      </Group>

      <Pressable onPress={() => supabase.auth.signOut()} style={{ alignItems: 'center', paddingVertical: 8 }}>
        <T size={15} weight="bold" color={color.a400}>Sign out</T>
      </Pressable>
      <Pressable onPress={() => router.push('/delete-account')} style={{ alignItems: 'center', paddingVertical: 4 }}>
        <T size={13} weight="bold" color={c.textMuted}>Delete account</T>
      </Pressable>
      <T size={11} color={c.textMuted} center>{versionLine()}</T>
    </Page>
  );
}

/** Which app version and over-the-air update this phone is running, for support. */
function versionLine() {
  const v = `SofaClub ${Constants.expoConfig?.version ?? ''}`.trim();
  if (!Updates.isEnabled || Updates.isEmbeddedLaunch || !Updates.createdAt) return `${v} · original build`;
  const when = Updates.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `${v} · update ${when}`;
}
