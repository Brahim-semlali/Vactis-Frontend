import { describe, expect, it } from 'vitest';
import { getLatestCompletedMonth, getPeriodsThroughSelection } from './reportingPeriod.js';

describe('getLatestCompletedMonth', () => {
  it('selects the most recent month of imported data', () => {
    expect(getLatestCompletedMonth(['2026-09', '2026-08', '2026-07'])).toBe('2026-09');
    expect(getLatestCompletedMonth(['2026-10', '2026-09', '2026-08'])).toBe('2026-10');
  });

  it('uses the newest period when only one month is available', () => {
    expect(getLatestCompletedMonth(['2026-09'])).toBe('2026-09');
  });

  it('ignores invalid periods and handles an empty list', () => {
    expect(getLatestCompletedMonth(['invalid', '2026-08'])).toBe('2026-08');
    expect(getLatestCompletedMonth([])).toBe('');
  });
});

describe('getPeriodsThroughSelection', () => {
  it('excludes periods after the selected month', () => {
    expect(getPeriodsThroughSelection(['2026-10', '2026-08', '2026-09'], '2026-09'))
      .toEqual(['2026-08', '2026-09']);
  });

  it('includes the current month when it is explicitly selected', () => {
    expect(getPeriodsThroughSelection(['2026-09', '2026-10'], '2026-10'))
      .toEqual(['2026-09', '2026-10']);
  });
});