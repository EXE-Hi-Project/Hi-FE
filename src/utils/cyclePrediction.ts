import type { CycleInsights } from '../types/shared';

export function getEstimatedPeriodDisplayDay(insights?: CycleInsights | null) {
  const value = insights?.estimatedPeriodDay;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

export function getPrimaryPredictionRange(insights?: CycleInsights | null) {
  const fallback = insights?.estimatedPeriodStartDate ?? insights?.estimatedNextStartDate ?? null;
  return {
    start: insights?.predictionRange50Start ?? fallback,
    end: insights?.predictionRange50End ?? fallback,
  };
}
