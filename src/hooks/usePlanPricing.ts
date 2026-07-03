import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface PlanPrice {
  id: 'monthly' | 'yearly';
  code: 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';
  name: 'Hi Pro' | 'Hi Max';
  durationDays: number;
  basePrice: number;
  currentPrice: number;
  discountPercent: number;
}

export interface SaleCampaignView {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  hiProSalePrice: number;
  hiMaxSalePrice: number;
  startsAt: string;
  endsAt: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'DISABLED';
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanPricing {
  hiPro: PlanPrice;
  hiMax: PlanPrice;
  activeSale?: SaleCampaignView | null;
}

const fallbackProPrice = Number(import.meta.env.VITE_PAYMENT_PLAN_MONTHLY_PRICE || 49_000);
const fallbackMaxPrice = Number(import.meta.env.VITE_PAYMENT_PLAN_YEARLY_PRICE || 399_000);

export const FALLBACK_PRICING: PlanPricing = {
  hiPro: {
    id: 'monthly', code: 'PREMIUM_MONTHLY', name: 'Hi Pro', durationDays: 30,
    basePrice: fallbackProPrice, currentPrice: fallbackProPrice, discountPercent: 0,
  },
  hiMax: {
    id: 'yearly', code: 'PREMIUM_YEARLY', name: 'Hi Max', durationDays: 365,
    basePrice: fallbackMaxPrice, currentPrice: fallbackMaxPrice, discountPercent: 0,
  },
  activeSale: null,
};

export function usePlanPricing() {
  return useQuery<PlanPricing>({
    queryKey: ['plan-pricing'],
    queryFn: () => api.get('/plans/pricing').then(({ data }) => data.data as PlanPricing),
    staleTime: 60_000,
    refetchInterval: 60_000,
    placeholderData: FALLBACK_PRICING,
  });
}

export function formatPlanPrice(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}
