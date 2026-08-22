import { describe, expect, it } from 'vitest';
import type { CycleInsights } from '../types/shared';
import { getCycleDayKind } from './cycleCalendar';

const insights: CycleInsights = {
  cycleCount: 1,
  estimatedPeriodStartDate: '2026-08-28',
  estimatedPeriodEndDate: '2026-09-01',
  predictedStartEarliest: '2026-08-21',
  predictedStartLatest: '2026-09-04',
  averagePeriodLength: 5,
  periodStatus: 'UPCOMING',
  hasOutliers: false,
  warnings: [],
  advancedAnalyticsAvailable: true,
};

function localDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

describe('getCycleDayKind', () => {
  it('renders only the central estimated period, not the uncertainty window', () => {
    expect(getCycleDayKind(localDate('2026-08-22'), [], insights)).toBeNull();
    expect(getCycleDayKind(localDate('2026-08-28'), [], insights)).toBe('predicted');
    expect(getCycleDayKind(localDate('2026-09-01'), [], insights)).toBe('predicted');
    expect(getCycleDayKind(localDate('2026-09-02'), [], insights)).toBeNull();
  });
});
