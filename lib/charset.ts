export const CHARSET = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?\'"-()&@#%*/+=[]<>$',
];

export type Kind = 'upper' | 'lower' | 'digit' | 'punct';

export const kind = (ch: string): Kind =>
  /[A-Z]/.test(ch) ? 'upper' : /[a-z]/.test(ch) ? 'lower' : /\d/.test(ch) ? 'digit' : 'punct';

const PUNCT: Record<string, string> = {
  '.': 'Period', ',': 'Comma', ':': 'Colon', ';': 'Semicolon', '!': 'Exclamation mark',
  '?': 'Question mark', "'": 'Apostrophe', '"': 'Quotation mark', '-': 'Hyphen',
  '(': 'Left parenthesis', ')': 'Right parenthesis', '&': 'Ampersand', '@': 'At sign',
  '#': 'Number sign', '%': 'Percent sign', '*': 'Asterisk', '/': 'Slash', '+': 'Plus sign',
  '=': 'Equals sign', '[': 'Left bracket', ']': 'Right bracket', '<': 'Less-than sign',
  '>': 'Greater-than sign', '$': 'Dollar sign',
};

export function nameOf(ch: string) {
  const k = kind(ch);
  if (k === 'upper') return `Uppercase ${ch}`;
  if (k === 'lower') return `Lowercase ${ch}`;
  if (k === 'digit') return `Figure ${ch}`;
  return PUNCT[ch] ?? 'Symbol';
}

export const defaultAdvance = (ch: string) =>
  ({ upper: 620, lower: 500, digit: 540, punct: 280 })[kind(ch)];

export const unicodeLabel = (ch: string) =>
  'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
