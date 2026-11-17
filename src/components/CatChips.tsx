import { KIND, item } from '../data/model';
import { CATS, type Cat } from '../data/types';
import { useApp } from '../state/store';
import { Chip, ChipRow } from './ui';

export function CatChips({ keys, value, onChange }: { keys: string[]; value: Cat | 'All'; onChange: (c: Cat | 'All') => void }) {
  const custom = useApp((s) => s.custom);
  const cats = keys.map((k) => item(k, custom).cat);
  return (
    <ChipRow>
      {(['All', ...CATS] as const).map((x) => {
        const n = x === 'All' ? keys.length : cats.filter((y) => y === x).length;
        return <Chip key={x} label={`${x === 'All' ? 'All' : KIND[x].short} · ${n}`} on={value === x} onPress={() => onChange(x)} />;
      })}
    </ChipRow>
  );
}
