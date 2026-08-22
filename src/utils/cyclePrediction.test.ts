import { describe, expect, it } from 'vitest';
import type { CycleInsights } from '../types/shared';
import { getEstimatedPeriodDisplayDay, getPrimaryPredictionRange } from './cyclePrediction';

function insights(overrides: Partial<CycleInsights> = {}): CycleInsights {
  return {
    cycleCount: 6,
    predictionConfidence: 'MEDIUM',
    hasOutliers: false,
    warnings: [],
    advancedAnalyticsAvailable: true,
    ...overrides,
  };
}

describe('cycle prediction presentation', () => {
  it('does not invent period day when backend returns null inside the uncertainty window', () => {
    expect(getEstimatedPeriodDisplayDay(insights({
      periodStatus: 'PREDICTED',
      estimatedPeriodStartDate: '2026-08-28',
      estimatedPeriodEndDate: '2026-09-01',
      estimatedPeriodDay: null,
    }))).toBeNull();
  });

  it('uses the calibrated 50 percent range as the primary range', () => {
    expect(getPrimaryPredictionRange(insights({
      estimatedPeriodStartDate: '2026-08-28',
      predictedStartEarliest: '2026-08-21',
      predictedStartLatest: '2026-09-04',
      predictionRange50Start: '2026-08-26',
      predictionRange50End: '2026-08-30',
    }))).toEqual({ start: '2026-08-26', end: '2026-08-30' });
  });
});
