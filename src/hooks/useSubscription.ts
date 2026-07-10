import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export interface SubscriptionInfo {
  plan: 'FREE' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';
  tier: 'FREE' | 'PREMIUM';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  activeUntil: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  couplePremium: boolean;
  sharedFromPartner: boolean;
  entitlements: SubscriptionEntitlements;
  aiUsage: AiUsage;
}

export interface SubscriptionEntitlements {
  fullHealthHistoryForAi: boolean;
  aiResponseStyles: boolean;
  emailReminders: boolean;
  customReminderSchedule: boolean;
  fertilityWindowReminders: boolean;
  healthVideos: boolean;
  productRecommendations: boolean;
  advancedCycleAnalytics: boolean;
  coupleDailyQuestions: boolean;
  coupleQuestionHistory: boolean;
  coupleConversation: boolean;
  contextualPartnerCare: boolean;
  partnerCareReminders: boolean;
  priorityAi: boolean;
}

export interface AiUsage {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export interface TransactionInfo {
  _id: string;
  userId: string;
  userEmail: string;
  orderCode: number;
  amount: number;
  plan: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'canceled';
  description: string;
  createdAt: string;
  updatedAt: string;
}

export function useSubscription() {
  const userId = useAuthStore((state) => state.user?._id ?? null);
  return useQuery<SubscriptionInfo>({
    queryKey: ['subscription', userId],
    queryFn: () => api.get('/payments/subscription').then((r) => r.data.data),
    enabled: !!userId,
  });
}

export function usePaymentHistory() {
  const userId = useAuthStore((state) => state.user?._id ?? null);
  return useQuery<TransactionInfo[]>({
    queryKey: ['paymentHistory', userId],
    queryFn: () => api.get('/payments/history').then((r) => r.data.data),
    enabled: !!userId,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planType: 'monthly' | 'yearly') =>
      api.post('/payments/create-checkout-session', { 
        priceId: planType,
        origin: window.location.origin
      }).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data.activated) {
        toast.success('Da kich hoat goi Hi thanh cong');
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
        queryClient.invalidateQueries({ queryKey: ['plan-pricing'] });
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('Không tìm thấy URL thanh toán');
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi tạo phiên thanh toán';
      toast.error(msg);
      console.error('Checkout error:', error);
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/payments/cancel').then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || 'Đã dừng gia hạn gói Hi');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi hủy subscription';
      toast.error(msg);
      console.error('Cancel subscription error:', error);
    },
  });
}
