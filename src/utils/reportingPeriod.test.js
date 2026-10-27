import { describe, expect, it } from 'vitest';
import { getLatestCompletedMonth, getPeriodsThroughSelection } from './reportingPeriod.js';

describe('getLatestCompletedMonth', () => {
  it('selects the newest available period before the current month', () => {
    expect(getLatestCompletedMonth(['2026-10', '2026-09', '2026-08'], new Date(2026, 9, 24)))
      .toBe('2026-09');
  });

  it('uses the newest period when only the current month is available', () => {
    expect(getLatestCompletedMonth(['2026-10'], new Date(2026, 9, 24))).toBe('2026-10');
  });

  it('ignores invalid periods and handles an empty list', () => {
    expect(getLatestCompletedMonth(['invalid', '2026-08'], new Date(2026, 9, 24))).toBe('2026-08');
    expect(getLatestCompletedMonth([], new Date(2026, 9, 24))).toBe('');
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