// Inlined from packages/shared — kept in sync manually.
// @hi/shared is a local monorepo package not published to npm;
// inlining here avoids the E404 in standalone CI environments.

// ── user.types ──────────────────────────────────────────────
export type UserRole = 'user' | 'admin';
export type Gender = 'female' | 'male' | 'other';
export type AuthProvider = 'local' | 'google' | 'facebook';
export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'DELETED';
export type AiPersonality = 'friendly' | 'professional' | 'caring' | 'playful';
export type AiTone = 'warm' | 'casual' | 'formal' | 'FRIENDLY' | 'PLAYFUL' | 'SCIENTIFIC' | 'CONCISE' | 'CARE_PARTNER';

export interface User {
  _id: string;
  name: string;
  email: string;
  role?: UserRole;
  gender: Gender;
  avatar?: string;
  authProvider?: AuthProvider;
  googleId?: string;
  facebookId?: string;
  partnerId?: string | null;
  partnerCode?: string;
  birthDate?: string;
  height?: number;
  weight?: number;
  interests?: string[];
  goals?: string[];
  defaultCycleLength?: number;
  defaultPeriodLength?: number;
  lastPeriodDate?: string;
  lastPeriodEndDate?: string;
  irregularCycle?: boolean;
  pregnant?: boolean;
  postpartum?: boolean;
  breastfeeding?: boolean;
  hormonalContraception?: boolean;
  perimenopause?: boolean;
  aiPersonality?: AiPersonality;
  aiTone?: AiTone;
  periodReminder?: boolean;
  reminderDaysBefore?: number;
  partnerNotifications?: boolean;
  partnerSharingPreferences?: PartnerSharingPreferences;
  notificationPreferences?: PartnerExperiencePreferences;
  onboardingCompleted?: boolean;
  accountStatus?: AccountStatus;
  accountStatusReason?: string | null;
  subscription?: UserSubscription;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartnerSharingPreferences {
  shareDetailedSymptoms: boolean;
  shareHealthNotes: boolean;
  shareMood: boolean;
  shareCycleData: boolean;
  consentVersion?: string;
  consentedAt?: string;
}

export interface PartnerExperiencePreferences {
  dailyHealthTipsEmailEnabled?: boolean;
  dailyQuestionsEnabled?: boolean;
  contextualCareSuggestionsEnabled?: boolean;
  coupleQuestionAnswerEmailEnabled?: boolean;
  coupleQuestionCommentEmailEnabled?: boolean;
  coupleQuestionEditEmailEnabled?: boolean;
}

export interface UserSubscription {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: 'free' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  currentPeriodEnd: string | null;
}

// ── cycle.types ──────────────────────────────────────────────
export interface CycleRecord {
  _id: number;
  userId: string;
  startDate: string;
  endDate?: string | null;
  cycleLength: number;
  periodLength: number;
  notes?: string;
  status?: 'ONGOING' | 'NEEDS_CONFIRMATION' | 'COMPLETED' | null;
  lastBleedingDate?: string | null;
  endDateEstimated?: boolean;
  isIgnored?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCycleRecordDto {
  startDate: string;
  endDate?: string | null;
  cycleLength?: number;
  periodLength?: number;
  status?: 'ONGOING' | 'NEEDS_CONFIRMATION' | 'COMPLETED';
  isIgnored?: boolean;
}

export interface UpdateCycleRecordDto extends Partial<CreateCycleRecordDto> {}

export interface PhaseSymptomImpact {
  phase: string;
  impactScore: number;
  occurrenceCount: number;
}

export interface SymptomImpactItem {
  symptomId: number;
  symptomName: string;
  impactScore: number;
  averageSeverity: number;
  occurrenceCount: number;
}

export interface CycleTrendPoint {
  cycleId: number;
  startDate: string;
  cycleLength?: number | null;
  periodLength?: number | null;
  outlier?: boolean;
}

export interface CycleInsights {
  cycleCount: number;
  averageCycleLength?: number | null;
  averagePeriodLength?: number | null;
  lastStartDate?: string | null;
  lastRecordedStartDate?: string | null;
  lastRecordedEndDate?: string | null;
  lastBleedingDate?: string | null;
  estimatedCurrentCycleStartDate?: string | null;
  estimatedPeriodStartDate?: string | null;
  estimatedPeriodEndDate?: string | null;
  predictedStartEarliest?: string | null;
  predictedStartLatest?: string | null;
  predictionRange50Start?: string | null;
  predictionRange50End?: string | null;
  predictionRange80Start?: string | null;
  predictionRange80End?: string | null;
  estimatedNextStartDate?: string | null;
  estimatedNextEndDate?: string | null;
  estimatedOvulationDate?: string | null;
  ovulationDateEarliest?: string | null;
  ovulationDateLatest?: string | null;
  fertileWindowStartDate?: string | null;
  fertileWindowEndDate?: string | null;
  currentCycleDay?: number | null;
  currentPhase?: string | null;
  periodStatus?: 'CONFIRMED' | 'NEEDS_CONFIRMATION' | 'UPCOMING' | 'PREDICTED' | 'DELAYED';
  periodOngoing?: boolean;
  confirmedPeriodDay?: number | null;
  estimatedCycleDay?: number | null;
  estimatedPhase?: string | null;
  periodDelayDays?: number | null;
  daysUntilEstimatedPeriod?: number | null;
  estimatedPeriodDay?: number | null;
  fertilityStatus?: 'UNKNOWN' | 'ESTIMATED_WINDOW' | 'OUTSIDE_ESTIMATED_WINDOW';
  regularityStatus?: 'UNKNOWN' | 'REGULAR' | 'NORMAL' | 'IRREGULAR';
  regularityScore?: number;
  regularityLabel?: string;
  regularityReasons?: string[];
  cycleTrendPoints?: CycleTrendPoint[];
  predictionConfidence?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  predictionBasis?: string;
  predictionModel?: 'PERSONAL_DEFAULT' | 'WEIGHTED_MEDIAN' | 'EWMA' | 'RECENT_MEDIAN' | string;
  predictionErrorMedianDays?: number | null;
  predictionInterval50Days?: number | null;
  predictionInterval80Days?: number | null;
  estimatedPeriodLengthMin?: number | null;
  estimatedPeriodLengthMax?: number | null;
  suspectedMissedCycleCount?: number;
  dataQualityIssues?: string[];
  cycleCompleteness?: number;
  fertilityEstimateAvailable?: boolean;
  algorithmVersion?: string;
  hasOutliers: boolean;
  warnings: string[];
  symptomImpactScore?: number;
  phaseSymptomImpacts?: PhaseSymptomImpact[];
  topSymptoms?: SymptomImpactItem[];
  advancedAnalyticsAvailable: boolean;
}

export type Cycle = CycleRecord;

// ── health.types ─────────────────────────────────────────────
export type SymptomCategory = 'PHYSICAL' | 'EMOTIONAL' | 'FLUID' | 'OTHER';
export type SymptomSeverity = 'MILD' | 'MODERATE' | 'SEVERE';
export type FlowIntensity = 'NONE' | 'LIGHT' | 'MEDIUM' | 'HEAVY';

export interface UpsertDailyLogDto {
  flowIntensity?: FlowIntensity;
  confirmPeriodStart?: boolean;
  confirmPeriodEnd?: boolean;
  hasClots?: boolean;
  moodScore?: number;
  notes?: string;
  symptoms?: Array<{
    symptomId: number;
    severity?: SymptomSeverity;
  }>;
}

export interface UpdateDailyLogMoodDto {
  moodScore?: number;
  notes?: string;
}

export interface SymptomDictionary {
  id: number;
  name: string;
  category: SymptomCategory;
  iconUrl?: string;
  active: boolean;
}

export interface DailyLogSymptom {
  _id: number;
  dailyLogId: number;
  symptomId: number;
  severity: SymptomSeverity;
  symptomName?: string;
  category?: SymptomCategory;
  iconUrl?: string;
}

export interface DailyLog {
  _id: number;
  userId: string;
  logDate: string;
  flowIntensity: FlowIntensity;
  hasClots?: boolean;
  moodScore?: number;
  notes?: string;
  symptoms: DailyLogSymptom[];
  createdAt?: string;
  updatedAt?: string;
}

// ── api.types ────────────────────────────────────────────────
export interface ApiResponse<TData = unknown> {
  success: boolean;
  message?: string;
  data?: TData;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

// ── content.types ───────────────────────────────────────────
export type HealthVideoStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type HealthVideoTargetAudience = 'FEMALE' | 'MALE' | 'BOTH';

export interface HealthVideo {
  _id: number;
  youtubeVideoId: string;
  title: string;
  description?: string;
  channelName: string;
  sourceUrl: string;
  thumbnailUrl: string;
  topicTags: string[];
  interestTags: string[];
  goalTags: string[];
  phaseTags: string[];
  language: string;
  priority: number;
  status: HealthVideoStatus;
  targetAudience?: HealthVideoTargetAudience;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertHealthVideoDto {
  youtubeVideoId: string;
  title: string;
  description?: string;
  channelName: string;
  topicTags?: string[];
  interestTags?: string[];
  goalTags?: string[];
  phaseTags?: string[];
  language?: string;
  priority?: number;
  status?: HealthVideoStatus;
  targetAudience?: HealthVideoTargetAudience;
}

export type CoupleQuestionStatus = 'UNANSWERED' | 'WAITING_PARTNER' | 'UNLOCKED' | 'SKIPPED';

export interface CoupleAnswer {
  userId: string;
  content: string;
  answeredAt: string;
  updatedAt: string;
}

export interface CoupleMessage {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface CoupleQuestionSession {
  _id: string;
  questionDate: string;
  questionText: string;
  category: string;
  status: CoupleQuestionStatus;
  activePair: boolean;
  unlocked: boolean;
  myAnswer?: CoupleAnswer | null;
  partnerAnswer?: CoupleAnswer | null;
  partnerAnswered: boolean;
  messages: CoupleMessage[];
  skipped: boolean;
}

export interface CoupleQuestionHistory {
  items: CoupleQuestionSession[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface PartnerCareSuggestion {
  _id: string;
  suggestionDate: string;
  sourceType: 'SYMPTOM' | 'NOTE' | 'MOOD' | 'CYCLE' | 'QUESTION' | 'GENERAL';
  reason: string;
  action: string;
  messageTemplate: string;
}

export type CoupleAnniversaryType = 'START_DATE' | 'MEMORY';
export type CoupleAnniversaryColor = 'pink' | 'rose' | 'violet' | 'sky' | 'emerald' | 'amber';
export type CoupleAnniversaryEffect = 'none' | 'sparkle' | 'float' | 'glow' | 'confetti';

export interface CoupleAnniversaryEvent {
  _id: string;
  pairKey: string;
  type: CoupleAnniversaryType;
  eventDate: string;
  title: string;
  note?: string;
  color: CoupleAnniversaryColor;
  effect: CoupleAnniversaryEffect;
  icon: string;
  sticker: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoupleAnniversaryOptions {
  colors: CoupleAnniversaryColor[];
  effects: CoupleAnniversaryEffect[];
  icons: string[];
  stickers: string[];
}

export interface CoupleAnniversarySummary {
  startDate?: CoupleAnniversaryEvent | null;
  daysTogether?: number | null;
  events: CoupleAnniversaryEvent[];
  options: CoupleAnniversaryOptions;
}

export type CouplePlaceCategory =
  | 'FOOD'
  | 'CAFE'
  | 'DATE_SPOT'
  | 'ENTERTAINMENT'
  | 'CINEMA'
  | 'PARK'
  | 'SHOPPING'
  | 'OTHER';

export type CouplePlaceStatus = 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED';
export type CouplePlaceSource = 'USER' | 'OSM' | 'GOOGLE' | 'HYBRID';
export type CouplePlaceVisibility = 'PUBLIC' | 'COUPLE_PRIVATE';
export type CouplePlaceSearchSource = 'HI' | 'VIETMAP' | 'TOMTOM' | 'PHOTON';

export interface CouplePlaceSearchSuggestion {
  id: string;
  name: string;
  address: string;
  displayName: string;
  lat?: number;
  lng?: number;
  type?: string;
  source: CouplePlaceSearchSource;
  visibility?: CouplePlaceVisibility;
  distanceMeters?: number;
  refId?: string;
  requiresResolve: boolean;
}

export interface CouplePlaceLocation {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  district?: string;
}

export interface CouplePlacePhoto {
  _id: number;
  placeId: number;
  userId: string;
  userName: string;
  objectKey: string;
  url: string;
  contentType: string;
  status: CouplePlaceStatus;
  createdAt?: string;
}

export interface CouplePlaceReview {
  _id: number;
  placeId: number;
  userId: string;
  userName: string;
  rating: number;
  content?: string;
  status: CouplePlaceStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type CouplePlaceReportStatus = 'OPEN' | 'RESOLVED';

export interface CouplePlaceReport {
  _id: number;
  placeId: number;
  targetType: string;
  targetId?: number;
  userId: string;
  userName: string;
  reason: string;
  status: CouplePlaceReportStatus;
  createdAt?: string;
}

export interface CouplePlace {
  _id?: number;
  name: string;
  description?: string;
  category: CouplePlaceCategory;
  location: CouplePlaceLocation;
  source: CouplePlaceSource;
  visibility?: CouplePlaceVisibility;
  googlePlaceId?: string;
  googleRating?: number;
  googleUserRatingCount?: number;
  googleMapsUri?: string;
  userRatingAvg?: number;
  reviewCount?: number;
  likeCount?: number;
  dislikeCount?: number;
  saveCount?: number;
  reportCount?: number;
  status: CouplePlaceStatus;
  createdBy?: string;
  createdByName?: string;
  tags?: string[];
  coverPhotoUrl?: string;
  distanceMeters?: number;
  likedByMe?: boolean;
  dislikedByMe?: boolean;
  savedByMe?: boolean;
  ownedByMe?: boolean;
  reviewedByMe?: boolean;
  photos?: CouplePlacePhoto[];
  recentReviews?: CouplePlaceReview[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCouplePlaceDto {
  name: string;
  description?: string;
  category: CouplePlaceCategory;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  district?: string;
  googlePlaceId?: string;
  googleRating?: number;
  googleUserRatingCount?: number;
  googleMapsUri?: string;
  tags?: string[];
  anonymous?: boolean;
  nickname?: string;
  visibility?: CouplePlaceVisibility;
}

export interface AdminCouplePlace extends Omit<CouplePlace, 'location'> {
  location?: CouplePlaceLocation | null;
  metadataOnly?: boolean;
}

export interface AdminCouplePlaceReviewPage {
  items: CouplePlaceReview[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

