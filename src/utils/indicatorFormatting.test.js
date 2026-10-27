import { describe, expect, it } from 'vitest';
import { formatMad, formatNumber, formatPercent, formatSignedPercent } from './indicatorFormatting.js';

describe('indicator formatting', () => {
  it('formats signed percentages with French decimal separators', () => {
    expect(formatSignedPercent(34.523)).toBe('+34,52 %');
    expect(formatSignedPercent(-78.63)).toBe('−78,63 %');
    expect(formatSignedPercent(0)).toBe('0,00 %');
  });

  it('formats numbers and MAD to two decimals', () => {
    expect(formatNumber(3556.666)).toBe('3 556,67');
    expect(formatMad(3556.666)).toBe('3 556,67 MAD');
    expect(formatPercent(34.5)).toBe('34,50 %');
  });

  it('shows a dash for absent or invalid values', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatSignedPercent(undefined)).toBe('—');
    expect(formatMad(Number.NaN)).toBe('—');
  });
});
