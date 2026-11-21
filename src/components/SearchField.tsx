// A search box for the top of a section. Tapping it opens Search already set to that section's category,
// where "Add it yourself" defaults to the same category.
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { KIND } from '../data/model';
import type { Cat } from '../data/types';
import { color } from '../theme';
import { Icon } from './Icon';
import { T } from './ui';

export function SearchField({ cat }: { cat?: Cat | 'All' | null }) {
  const one = cat && cat !== 'All' ? cat : null;
  const what = one ? KIND[one].short.toLowerCase().replace(/^tv$/, 'TV') : 'films, TV, books and albums';
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={`Search or add ${what}`}
      onPress={() => router.push(one ? { pathname: '/search', params: { cat: one } } : '/search')}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: 23, paddingHorizontal: 16,
        borderWidth: 2, borderColor: color.n700, backgroundColor: color.n800, opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name="search" size={16} color={color.n400} />
      <T size={14} color={color.n500} style={{ flex: 1 }} numberOfLines={1}>Search or add {what}</T>
      <Icon name="plus" size={16} color={color.n400} />
    </Pressable>
  );
}
