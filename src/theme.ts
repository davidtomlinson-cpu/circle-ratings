// Organic design system, dark usage. Values from the design handoff README.
export const color = {
  n100: '#f9f4ed', n200: '#eee7db', n300: '#dcd3c4', n400: '#c0b6a5', n500: '#a19786',
  n600: '#82796a', n700: '#645c50', n800: '#474238', n900: '#2e2b25',
  a100: '#fff2eb', a200: '#ffe1d0', a300: '#ffc6a5', a400: '#f6a06b', a500: '#d67f48',
  a600: '#b2622d', a700: '#8c491a', a800: '#643312', a900: '#402310',
  s100: '#f0fae1', s200: '#e1eecc', s300: '#ccdbb2', s400: '#aebf92', s500: '#8fa073',
  s600: '#728157', s700: '#56633f', s800: '#3d472b', s900: '#272e1b',
  ink: '#201e1d',
} as const;

export const c = {
  bg: color.n900,
  card: color.n800,
  text: color.n100,
  textSoft: color.n300,
  textMuted: color.n400,
  accent: color.a400,
  primary: color.a500,
  link: color.a300,
  positive: color.s700,
  divider: color.n700,
  ink: color.ink,
};

export const font = {
  display: 'Caprasimo_400Regular',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
};

export const radius = { pill: 999, card: 28, cardSm: 24, sheet: 34 };
export const space = { gutter: 20, section: 18 };

export const motion = {
  panelMs: 450,
  // cubic-bezier(.2,.9,.25,1)
  panelEase: [0.2, 0.9, 0.25, 1] as const,
};

/** Hex colour with alpha, e.g. alpha('#f6a06b', 0.14). */
export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
