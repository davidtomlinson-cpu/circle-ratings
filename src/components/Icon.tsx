// Lucide-style icons (24px grid, stroke 2.75, round caps/joins), drawn with react-native-svg.
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from '../theme';

export const HEART_PATH =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';

const P = (d: string) => <Path key={d} d={d} />;

const ICONS = {
  sun: [<Circle key="c" cx={12} cy={12} r={4} />, ...['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(P)],
  circleCheck: [<Circle key="c" cx={12} cy={12} r={10} />, P('m9 12 2 2 4-4')],
  globe: [<Circle key="c" cx={12} cy={12} r={10} />, P('M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'), P('M2 12h20')],
  sparkles: [P('M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z')],
  bookmark: [P('m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z')],
  heart: [P(HEART_PATH)],
  search: [<Circle key="c" cx={11} cy={11} r={8} />, P('m21 21-4.3-4.3')],
  bell: [P('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'), P('M10.3 21a1.94 1.94 0 0 0 3.4 0')],
  chevronRight: [P('m9 18 6-6-6-6')],
  arrowLeft: [P('m12 19-7-7 7-7'), P('M19 12H5')],
  plus: [P('M5 12h14'), P('M12 5v14')],
  x: [P('M18 6 6 18'), P('m6 6 12 12')],
  check: [P('M20 6 9 17l-5-5')],
  userPlus: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), <Circle key="c" cx={9} cy={7} r={4} />, P('M19 8v6'), P('M22 11h-6')],
  users: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), <Circle key="c" cx={9} cy={7} r={4} />, P('M22 21v-2a4 4 0 0 0-3-3.87'), P('M16 3.13a4 4 0 0 1 0 7.75')],
  lock: [<Rect key="r" x={3} y={11} width={18} height={11} rx={2} />, P('M7 11V7a5 5 0 0 1 10 0v4')],
  settings: [P('M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'), <Circle key="c" cx={12} cy={12} r={3} />],
} as const;

export type IconName = keyof typeof ICONS | 'heart5';

type Props = { name: IconName; size?: number; color?: string; fill?: string; strokeWidth?: number };

export function Icon({ name, size = 24, color: stroke = color.n100, fill = 'none', strokeWidth = 2.75 }: Props) {
  if (name === 'heart5') {
    // "My list" tab: heart with a 5 inside.
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth - 0.75} strokeLinecap="round" strokeLinejoin="round">
        <Path d={HEART_PATH} fill={fill} />
        <Path d="M13.6 7.6h-3l-.3 2.6c.4-.3.9-.4 1.4-.4 1.1 0 1.9.8 1.9 1.9s-.8 1.9-1.9 1.9c-.7 0-1.2-.2-1.6-.7" strokeWidth={1.6} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </Svg>
  );
}
