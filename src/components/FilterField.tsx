// Filter box for your own lists (Watchlist, My list): narrows the list as you type. The "+ Add" button
// next to it opens catalogue Search on the same category, carrying over what was typed.
import { router } from 'expo-router';
import { Pressable, TextInput, View } from 'react-native';
import { KIND } from '../data/model';
import type { Cat } from '../data/types';
import { c, color } from '../theme';
import { Icon } from './Icon';
import { Row, T } from './ui';

/** Case- and accent-insensitive "does every typed word appear?" match. */
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matches(q: string, ...fields: (string | undefined)[]) {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold(fields.filter(Boolean).join(' '));
  return words.every((w) => hay.includes(w));
}

export function FilterField({ value, onChange, placeholder, cat }: { value: string; onChange: (v: string) => void; placeholder: string; cat: Cat | 'All' }) {
  const one = cat !== 'All' ? cat : null;
  const add = () => {
    const q = value.trim();
    const params: Record<string, string> = {};
    if (one) params.cat = one;
    if (q) params.q = q;
    router.push(Object.keys(params).length ? { pathname: '/search', params } : '/search');
  };
  return (
    <Row gap={8}>
      <Row gap={8} style={{ flex: 1, height: 46, borderRadius: 23, borderWidth: 2, borderColor: color.n700, backgroundColor: color.n800, paddingHorizontal: 14 }}>
        <Icon name="search" size={16} color={color.n400} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={color.n500}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={placeholder}
          style={{ flex: 1, color: c.text, fontFamily: 'Figtree_400Regular', fontSize: 14, height: '100%', ...({ outlineWidth: 0 } as object) }}
        />
        {!!value && (
          <Pressable onPress={() => onChange('')} accessibilityLabel="Clear" hitSlop={10}>
            <Icon name="x" size={16} color={color.n400} />
          </Pressable>
        )}
      </Row>
      <Pressable
        onPress={add}
        accessibilityRole="button"
        accessibilityLabel={one ? `Add ${KIND[one].short.toLowerCase()}` : 'Add a title'}
        style={({ pressed }) => ({ height: 46, borderRadius: 23, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.n700, opacity: pressed ? 0.8 : 1 })}
      >
        <Icon name="plus" size={16} />
        <T size={13} weight="bold">Add</T>
      </Pressable>
    </Row>
  );
}

/** "No match" line with a way to search the whole catalogue for it. */
export function NoMatch({ q, where, cat }: { q: string; where: string; cat: Cat | 'All' }) {
  const params: Record<string, string> = { q: q.trim() };
  if (cat !== 'All') params.cat = cat;
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
      <T size={14} color={c.textMuted} center>Nothing in {where} matches “{q.trim()}”.</T>
      <Pressable onPress={() => router.push({ pathname: '/search', params })} accessibilityRole="button">
        <T size={14} weight="bold" color={c.link}>Search everything for it</T>
      </Pressable>
    </View>
  );
}
