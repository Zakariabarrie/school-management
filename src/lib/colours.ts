export interface SchoolColours {
  menu: string;
  button: string;
  highlight: string;
  page: string;
  card: string;
  text: string;
  muted: string;
  line: string;
  success: string;
  warning: string;
  danger: string;
}

export const DEFAULT_COLOURS: SchoolColours = {
  menu: '#1c3144',
  button: '#2f5570',
  highlight: '#3d6d64',
  page: '#f3f0ea',
  card: '#fffcf8',
  text: '#1e2a32',
  muted: '#5c6b74',
  line: '#e4dfd6',
  success: '#2c6b4a',
  warning: '#8a5a2a',
  danger: '#8d3e3e',
};

function palette(patch: Partial<SchoolColours>): SchoolColours {
  return { ...DEFAULT_COLOURS, ...patch };
}

export const COLOUR_PRESETS: { name: string; colours: SchoolColours }[] = [
  { name: 'ScienceWorld', colours: DEFAULT_COLOURS },
  { name: 'Forest', colours: palette({ menu: '#1b3a32', button: '#2f6b4f', highlight: '#5e8f62', page: '#f2f6f1' }) },
  { name: 'Coast', colours: palette({ menu: '#16324f', button: '#1f6f8b', highlight: '#3d8b9c', page: '#f1f6f8' }) },
  { name: 'Clay', colours: palette({ menu: '#3d2c29', button: '#8a4b3c', highlight: '#a36b4a', page: '#f7f3ee' }) },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColour(value: string): boolean {
  return HEX.test(value);
}

export function sameColours(left: SchoolColours, right: SchoolColours): boolean {
  return (Object.keys(DEFAULT_COLOURS) as (keyof SchoolColours)[]).every((key) => left[key].toLowerCase() === right[key].toLowerCase());
}

function channel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

export function mixColour(colour: string, withColour: string, weight: number): string {
  const blend = (index: number) => Math.round(channel(colour, index) * (1 - weight) + channel(withColour, index) * weight);
  return `#${[0, 1, 2].map((index) => blend(index).toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const part = (index: number) => {
    const value = channel(hex, index) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * part(0) + 0.7152 * part(1) + 0.0722 * part(2);
}

export function onColour(colour: string, dark = '#1e2a32'): string {
  return luminance(colour) > 0.62 ? dark : '#ffffff';
}

export function schoolColours(colours?: Partial<SchoolColours>): SchoolColours {
  const next = { ...DEFAULT_COLOURS };
  for (const key of Object.keys(DEFAULT_COLOURS) as (keyof SchoolColours)[]) {
    const value = colours?.[key];
    if (value && isHexColour(value)) next[key] = value;
  }
  return next;
}

export function applySchoolColours(colours?: Partial<SchoolColours>) {
  const next = schoolColours(colours);
  const root = document.documentElement;
  const darkMenu = luminance(next.menu) < 0.45;
  root.style.setProperty('--navy', next.menu);
  root.style.setProperty('--navy-lift', mixColour(next.menu, '#ffffff', 0.16));
  root.style.setProperty('--blue', next.button);
  root.style.setProperty('--blue-soft', mixColour(next.button, '#ffffff', 0.86));
  root.style.setProperty('--on-button', onColour(next.button, next.text));
  root.style.setProperty('--teal', next.highlight);
  root.style.setProperty('--teal-soft', mixColour(next.highlight, '#ffffff', 0.86));
  root.style.setProperty('--paper', next.page);
  root.style.setProperty('--card', next.card);
  root.style.setProperty('--ink', next.text);
  root.style.setProperty('--muted', next.muted);
  root.style.setProperty('--line', next.line);
  root.style.setProperty('--wash', mixColour(next.page, next.line, 0.55));
  root.style.setProperty('--green', next.success);
  root.style.setProperty('--green-soft', mixColour(next.success, '#ffffff', 0.86));
  root.style.setProperty('--amber', next.warning);
  root.style.setProperty('--amber-soft', mixColour(next.warning, '#ffffff', 0.86));
  root.style.setProperty('--red', next.danger);
  root.style.setProperty('--red-soft', mixColour(next.danger, '#ffffff', 0.86));
  root.style.setProperty('--on-menu', darkMenu ? mixColour(next.menu, '#ffffff', 0.78) : next.text);
  root.style.setProperty('--on-menu-muted', darkMenu ? mixColour(next.menu, '#ffffff', 0.55) : next.muted);
  root.style.setProperty('--on-menu-strong', darkMenu ? '#ffffff' : next.text);
  root.style.setProperty('--menu-accent', darkMenu ? mixColour(next.highlight, '#ffffff', 0.45) : next.highlight);
}

export function themePaint() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    button: read('--blue', DEFAULT_COLOURS.button),
    highlight: read('--teal', DEFAULT_COLOURS.highlight),
    warning: read('--amber', DEFAULT_COLOURS.warning),
    muted: read('--muted', DEFAULT_COLOURS.muted),
    line: read('--line', DEFAULT_COLOURS.line),
  };
}
