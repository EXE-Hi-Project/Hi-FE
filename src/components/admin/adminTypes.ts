export interface AdminOverviewStats {
  usersTotal: number;
  usersFemale: number;
  usersMale: number;
  adminsTotal: number;
  cyclesTotal: number;
  symptomsTotal: number;
  notificationsTotal: number;
  unreadNotifications: number;
  chatMessagesTotal: number;
}

export interface AdminFinancialReport {
  estimatedPaidUsers: number;
  estimatedMrrUsd: number;
  estimatedAiCostMonthlyUsd: number;
  infraCostUsd: number;
  estimatedGrossProfitUsd: number;
  estimatedGrossMarginPct: number;
  arpuUsd: number;
  monthlyChurnRatePct: number;
  estimatedLtvUsd: number;
  assumptions: {
    paidUserRate: number;
    avgMessagesPerConversation: number;
    avgTokensPerConversation: number;
    aiCostPer1kTokens: number;
  };
}

export interface AffiliateReport {
  orders: number;
  totalCommissionVnd: number;
  settledCommissionVnd: number;
  totalRevenueVnd: number;
}

export interface MonthlyFinancialItem {
  month: string;
  newUsers: number;
  chatMessages: number;
  revenueUsd: number;
  aiCostUsd: number;
  actualTokens?: number | null;
  isActual?: boolean;
  netUsd: number;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  gender: 'female' | 'male' | 'other';
  role: 'user' | 'admin';
  accountStatus?: 'ACTIVE' | 'LOCKED' | 'DELETED';
  accountStatusReason?: string | null;
  onboardingCompleted?: boolean;
  createdAt: string;
  subscription?: {
    plan: 'free' | 'premium';
    status?: string | null;
    currentPeriodEnd?: string | null;
  };
  latestOtpDelivery?: OtpDelivery;
}

export interface AdminSubscriptionStats {
  free: number;
  hiPro: number;
  hiMax: number;
  activePaidTotal: number;
}

export interface AdminCoupleStats {
  eligibleUsers: number;
  pairedUsers: number;
  pairedCouples: number;
  unpairedUsers: number;
  pairingRatePct: number;
}

export interface OtpDelivery {
  id: string;
  purpose: 'ACTIVATION' | 'PASSWORD_RESET';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'BOUNCED' | 'COMPLAINED' | 'DELAYED' | 'FAILED';
  reason?: string | null;
  attemptedAt: string;
  statusUpdatedAt: string;
}

export interface PayOSTransaction {
  _id: string;
  userId: string;
  userEmail: string;
  orderCode: number;
  amount: number;
  plan: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayOSReport {
  totalRevenueVnd: number;
  completedOrdersCount: number;
  totalOrdersCount: number;
  statusBreakdown: {
    completed: number;
    pending: number;
    canceled: number;
  };
  transactions: PayOSTransaction[];
}

export interface AdminOverviewResponse {
  success: boolean;
  overview: AdminOverviewStats;
  financialReport: AdminFinancialReport;
  monthlyFinancials: MonthlyFinancialItem[];
  recentUsers: AdminUser[];
  payosReport: PayOSReport;
  affiliateReport?: AffiliateReport;
  subscriptionStats?: AdminSubscriptionStats;
  coupleStats?: AdminCoupleStats;
}

export type AdminTab =
  | 'overview'
  | 'analytics'
  | 'revenue'
  | 'pricing'
  | 'users'
  | 'videos'
  | 'questions'
  | 'affiliate'
  | 'couplePlaces'
  | 'notifications'
  | 'support'
  | 'system';
