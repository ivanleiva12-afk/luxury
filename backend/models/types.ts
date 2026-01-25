/**
 * 🏷️ TYPE DEFINITIONS - Sala Oscura Backend
 * 
 * Interfaces TypeScript que mapean al schema de DynamoDB
 */

// ==========================================
// 🔑 BASE TYPES
// ==========================================

export type UserType = 'escort' | 'cliente' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PlanType = 'luxury' | 'vip' | 'premium';
export type CarouselType = 'luxury' | 'vip-black' | 'premium-select';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type MediaType = 'photo' | 'video' | 'story' | 'instant';
export type MediaCategory = 'profile' | 'verification' | 'document' | 'receipt';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type PostCategory = 'general' | 'zona-clientas' | 'rating' | 'recommendation';

// ==========================================
// 👤 USER & AUTH
// ==========================================

export interface User {
  // DynamoDB Keys
  PK: `USER#${string}`;        // USER#uuid
  SK: 'PROFILE';
  GSI1PK: `EMAIL#${string}`;   // EMAIL#user@email.com
  GSI1SK: 'USER';
  GSI2PK: `USERNAME#${string}`; // USERNAME#camila_vip
  GSI2SK: 'USER';
  
  // Attributes
  userId: string;
  email: string;
  passwordHash: string;         // bcrypt hash
  username: string;
  displayName: string;
  userType: UserType;
  status: UserStatus;
  phone?: string;
  createdAt: string;            // ISO timestamp
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Session {
  PK: `SESSION#${string}`;
  SK: 'METADATA';
  GSI1PK: `USER#${string}`;
  GSI1SK: 'SESSION';
  
  sessionId: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: string;
  TTL: number;                  // Epoch timestamp for auto-delete
}

// ==========================================
// 📸 PROFILE (Public Escort Profile)
// ==========================================

export interface PhysicalInfo {
  age: number;
  height: number;               // cm
  weight: number;               // kg
  ethnicity?: string;           // Brasileña, Colombiana, etc.
  skinTone?: string;            // Blanca, Trigueña, Morena
  measurements?: {
    bust: number;
    waist: number;
    hips: number;
  };
}

export interface ProfileAttributes {
  hairColor?: string;
  eyeColor?: string;
  bodyType?: string;            // Atlética, Curvy, Delgada
  tattoos?: boolean;
  piercings?: boolean;
  smoker?: boolean;
}

export interface PriceRange {
  CLP: number;
  USD?: number;
}

export interface ProfilePrices {
  hour?: PriceRange;
  twoHours?: PriceRange;
  threeHours?: PriceRange;
  overnight?: PriceRange;
  travel?: PriceRange;
}

export interface ProfileStats {
  likes: number;
  views: number;
  recommendations: number;
  experiences: number;
  rating: number;               // 0-5
  ratingCount: number;
}

export interface EscortProfile {
  // DynamoDB Keys
  PK: `USER#${string}`;
  SK: 'PUBLIC_PROFILE';
  GSI1PK: `PLAN#${PlanType}`;
  GSI1SK: string;               // createdAt for ordering
  GSI2PK: `CITY#${string}`;
  GSI2SK: string;               // commune
  
  // Basic Info
  userId: string;
  displayName: string;
  bio?: string;
  slogan?: string;
  
  // Status
  verified: boolean;
  profileVisible: boolean;
  featured: boolean;
  
  // Plan
  planType: PlanType;
  carouselType: CarouselType;
  
  // Location
  city: string;
  commune?: string;
  neighborhood?: string;
  
  // Contact
  whatsapp: string;
  telegram?: string;
  onlyFans?: string;
  
  // Media
  profilePhotoUrl?: string;     // S3 URL
  galleryCount: number;
  videoCount: number;
  
  // Details
  physicalInfo: PhysicalInfo;
  attributes: ProfileAttributes;
  services: string[];           // ['oral', 'americana', 'masajes']
  prices: ProfilePrices;
  
  // Schedule
  schedule?: {
    [day: string]: {
      available: boolean;
      hours?: string;           // "10:00 - 22:00"
    };
  };
  
  // Stats
  stats: ProfileStats;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 📷 MEDIA
// ==========================================

export interface Media {
  PK: `USER#${string}`;
  SK: `MEDIA#${string}`;        // MEDIA#uuid
  
  mediaId: string;
  userId: string;
  mediaType: MediaType;
  category: MediaCategory;
  
  // S3 References
  s3Key: string;                // photos/user123/photo-1.jpg
  s3Bucket: string;
  thumbnailKey?: string;
  
  // File Info
  mimeType: string;             // image/jpeg, video/mp4
  size: number;                 // bytes
  width?: number;
  height?: number;
  duration?: number;            // for videos, in seconds
  
  // Display
  isPublic: boolean;
  order: number;
  caption?: string;
  
  // Timestamps
  uploadedAt: string;
  TTL?: number;                 // For stories/instants
}

// ==========================================
// 🔐 VERIFICATION
// ==========================================

export interface Verification {
  PK: `USER#${string}`;
  SK: `VERIFICATION#${'selfie' | 'document' | 'receipt'}`;
  
  userId: string;
  type: 'selfie' | 'document' | 'receipt';
  s3Key: string;                // Private bucket path
  
  status: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;          // Admin userId
  rejectionReason?: string;
  notes?: string;
  
  uploadedAt: string;
}

// ==========================================
// 💳 SUBSCRIPTIONS & PAYMENTS
// ==========================================

export interface PlanLimits {
  photos: number;               // 0 = unlimited
  videos: number;
  stories: number;
  instants: number;
}

export interface Subscription {
  PK: `USER#${string}`;
  SK: 'SUBSCRIPTION#CURRENT';
  GSI1PK: `PLAN#${PlanType}`;
  GSI1SK: string;               // expiryDate
  
  userId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  
  // Dates
  startDate: string;
  expiryDate: string;
  duration: number;             // days
  
  // Payment
  price: number;
  currency: 'CLP' | 'USD';
  paymentMethod: 'transfer' | 'card' | 'crypto';
  transactionId?: string;
  receiptS3Key?: string;
  
  // Plan Limits
  limits: PlanLimits;
  
  // Usage (current period)
  usage: {
    photosUsed: number;
    videosUsed: number;
    storiesUsed: number;
    instantsUsed: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface PaymentHistory {
  PK: `USER#${string}`;
  SK: `PAYMENT#${string}`;      // PAYMENT#timestamp
  
  paymentId: string;
  userId: string;
  planType: PlanType;
  amount: number;
  currency: 'CLP' | 'USD';
  method: 'transfer' | 'card' | 'crypto';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  
  transactionId?: string;
  receiptS3Key?: string;
  notes?: string;
  
  processedAt?: string;
  processedBy?: string;         // Admin who approved
  createdAt: string;
}

// ==========================================
// 💬 FORUM - SALA OSCURA
// ==========================================

export interface ForumPost {
  PK: `POST#${string}`;
  SK: 'METADATA';
  GSI1PK: `CATEGORY#${PostCategory}`;
  GSI1SK: string;               // createdAt
  GSI2PK: `AUTHOR#${string}`;
  GSI2SK: string;               // createdAt
  
  postId: string;
  authorId: string;
  authorName: string;
  authorType: UserType;
  authorAvatar?: string;
  
  category: PostCategory;
  title?: string;
  content: string;
  
  // Mentions & Tags
  mentions: string[];           // ['@camila_vip', '@sofia_premium']
  tags?: string[];
  
  // Engagement
  likes: number;
  likedBy?: string[];           // UserIds who liked
  repliesCount: number;
  
  // Flags
  isAnonymous: boolean;
  isPinned: boolean;
  isLocked: boolean;
  
  // Moderation
  reported: boolean;
  reportCount?: number;
  moderatedAt?: string;
  moderatedBy?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ForumReply {
  PK: `POST#${string}`;
  SK: `REPLY#${string}#${string}`; // REPLY#timestamp#replyId
  
  replyId: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorType: UserType;
  authorAvatar?: string;
  
  content: string;
  mentions?: string[];
  
  likes: number;
  likedBy?: string[];
  
  isAnonymous: boolean;
  
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// ⭐ RATINGS
// ==========================================

export interface RatingCategories {
  attention: number;            // 1-5
  hygiene: number;
  punctuality: number;
  communication: number;
  overall: number;
}

export interface Rating {
  PK: `RATING#${string}`;       // RATING#escortUserId
  SK: `${string}#${string}`;    // timestamp#ratingId
  GSI1PK: `RATER#${string}`;
  GSI1SK: string;               // escortUserId
  
  ratingId: string;
  escortId: string;
  raterId: string;
  raterName: string;
  
  score: number;                // 1-5 overall
  categories: RatingCategories;
  comment?: string;
  
  verified: boolean;            // Verified client
  isAnonymous: boolean;
  
  // Moderation
  approved: boolean;
  moderatedAt?: string;
  moderatedBy?: string;
  
  createdAt: string;
}

// ==========================================
// 📩 MENTIONS & NOTIFICATIONS
// ==========================================

export interface Mention {
  PK: `MENTION#${string}`;      // MENTION#mentionedUserId
  SK: `${string}#${string}`;    // timestamp#postId
  
  mentionId: string;
  mentionedUserId: string;
  mentionedBy: string;
  mentionedByName: string;
  
  postId: string;
  postType: 'post' | 'reply';
  preview: string;              // First 100 chars
  
  read: boolean;
  readAt?: string;
  
  createdAt: string;
}

// ==========================================
// 🔥 STORIES & INSTANTES
// ==========================================

export interface Story {
  PK: `STORY#${string}`;        // STORY#userId
  SK: `${string}#${string}`;    // timestamp#storyId
  GSI1PK: 'ACTIVE_STORIES';
  GSI1SK: string;               // expiresAt
  
  storyId: string;
  userId: string;
  type: 'story' | 'instant';
  
  // Media
  mediaType: 'image' | 'video';
  s3Key: string;
  thumbnailKey?: string;
  
  // Content
  caption?: string;
  
  // Stats
  viewCount: number;
  viewedBy?: string[];
  
  // Timing
  createdAt: string;
  expiresAt: string;
  TTL: number;                  // Epoch for auto-delete
}

// ==========================================
// ⚙️ CONFIGURATION
// ==========================================

export interface PlanConfig {
  name: string;
  price: number;
  currency: 'CLP';
  duration: number;             // days
  features: string[];
  limits: PlanLimits;
  carouselPosition: number;
  color: string;
  badge?: string;
}

export interface PlansConfiguration {
  PK: 'CONFIG';
  SK: 'PLANS';
  
  plans: {
    luxury: PlanConfig;
    vip: PlanConfig;
    premium: PlanConfig;
  };
  
  updatedAt: string;
  updatedBy: string;
}

export interface DiscountCode {
  code: string;
  discountPercent: number;
  validFor: PlanType[];
  maxUses?: number;
  currentUses: number;
  validUntil?: string;
  createdBy: string;
  createdAt: string;
}

export interface DiscountsConfiguration {
  PK: 'CONFIG';
  SK: 'DISCOUNTS';
  
  codes: DiscountCode[];
  
  updatedAt: string;
  updatedBy: string;
}

export interface BankConfiguration {
  PK: 'CONFIG';
  SK: 'BANK';
  
  bank: string;
  accountType: string;
  accountNumber: string;
  rut: string;
  name: string;
  email: string;
  
  updatedAt: string;
  updatedBy: string;
}

export interface EmailConfiguration {
  PK: 'CONFIG';
  SK: 'EMAIL';
  
  provider: 'ses' | 'smtp';
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  
  // SES Config
  sesRegion?: string;
  
  // SMTP Config
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;        // Encrypted
  
  updatedAt: string;
  updatedBy: string;
}

// ==========================================
// 📧 CONTACT MESSAGES
// ==========================================

export interface ContactMessage {
  PK: `MESSAGE#${string}`;
  SK: 'METADATA';
  GSI1PK: 'MESSAGES';
  GSI1SK: string;               // createdAt
  
  messageId: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  
  read: boolean;
  readAt?: string;
  readBy?: string;
  
  replied: boolean;
  repliedAt?: string;
  repliedBy?: string;
  
  createdAt: string;
}

// ==========================================
// 📊 ANALYTICS (Future)
// ==========================================

export interface DailyStats {
  PK: `STATS#${string}`;        // STATS#userId
  SK: `DAY#${string}`;          // DAY#2026-01-15
  
  userId: string;
  date: string;
  
  profileViews: number;
  uniqueVisitors: number;
  likes: number;
  whatsappClicks: number;
  shares: number;
  
  // Breakdown by hour (optional)
  hourlyViews?: { [hour: string]: number };
}

// ==========================================
// 🔧 UTILITY TYPES
// ==========================================

export type EntityType = 
  | User 
  | Session 
  | EscortProfile 
  | Media 
  | Verification
  | Subscription 
  | PaymentHistory
  | ForumPost 
  | ForumReply 
  | Rating 
  | Mention 
  | Story
  | ContactMessage;

// Key Builders
export const Keys = {
  user: (userId: string) => ({ PK: `USER#${userId}`, SK: 'PROFILE' }),
  profile: (userId: string) => ({ PK: `USER#${userId}`, SK: 'PUBLIC_PROFILE' }),
  media: (userId: string, mediaId: string) => ({ PK: `USER#${userId}`, SK: `MEDIA#${mediaId}` }),
  verification: (userId: string, type: 'selfie' | 'document' | 'receipt') => ({ PK: `USER#${userId}`, SK: `VERIFICATION#${type}` }),
  subscription: (userId: string) => ({ PK: `USER#${userId}`, SK: 'SUBSCRIPTION#CURRENT' }),
  post: (postId: string) => ({ PK: `POST#${postId}`, SK: 'METADATA' }),
  story: (userId: string, storyId: string) => ({ PK: `STORY#${userId}`, SK: storyId }),
  config: (type: string) => ({ PK: 'CONFIG', SK: type }),
};
