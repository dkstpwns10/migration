// PotenUp Community Constants

const BASE_URL = '/api';
const VERSION = '/v1';

export const API_BASE_URL = `${BASE_URL}${VERSION}`;

// Topic types for posts
export const TOPICS = {
  ALL: 'ALL',
  NOTICE: 'NOTICE',
  KNOWLEDGE: 'KNOWLEDGE',
  EMPLOYMENT_TIP: 'EMPLOYMENT_TIP',
  SMALL_TALK: 'SMALL_TALK',
} as const;

export type TopicType = keyof typeof TOPICS;

export const TOPIC_LABELS: Record<TopicType, string> = {
  ALL: '전체',
  NOTICE: '공지사항',
  KNOWLEDGE: '지식줍줍',
  EMPLOYMENT_TIP: '취업팁',
  SMALL_TALK: '자유게시판',
};

export const TOPIC_COLORS: Record<TopicType, string> = {
  ALL: 'secondary',
  NOTICE: 'notice',
  KNOWLEDGE: 'knowledge',
  EMPLOYMENT_TIP: 'employment',
  SMALL_TALK: 'smalltalk',
};

// Study status
export const STUDY_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
} as const;

export type StudyStatusType = keyof typeof STUDY_STATUS;

export const STUDY_STATUS_LABELS: Record<StudyStatusType, string> = {
  PENDING: '승인대기',
  APPROVED: '모집중',
  CLOSED: '모집마감',
  REJECTED: '거절됨',
};

// Budget types
export const BUDGET_TYPES = {
  FREE: 'FREE',
  PAID: 'PAID',
  BOOK: 'BOOK',
  MEAL: 'MEAL',
} as const;

export type BudgetType = keyof typeof BUDGET_TYPES;

export const BUDGET_LABELS: Record<BudgetType, string> = {
  FREE: '무료',
  PAID: '유료',
  BOOK: '책',
  MEAL: '식비',
};

// Recruitment status
export const RECRUITMENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type RecruitmentStatusType = keyof typeof RECRUITMENT_STATUS;

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatusType, string> = {
  PENDING: '대기중',
  APPROVED: '승인됨',
  REJECTED: '거절됨',
};

// Reaction types
export const REACTION_TYPES = {
  LIKE: 'LIKE',
} as const;

export const TARGET_TYPES = {
  POST: 'POST',
  COMMENT: 'COMMENT',
} as const;

// User roles
export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = keyof typeof USER_ROLES;

// Navigation items
export const NAV_ITEMS = [
  { href: '/', label: '피드', icon: 'Home' },
  { href: '/studies', label: '스터디', icon: 'Users' },
  { href: '/mypage', label: '마이페이지', icon: 'User' },
] as const;

// Main category tabs (PC view)
export const MAIN_CATEGORY_TABS = [
  { id: 'all', label: '전체', topics: ['ALL'] },
  { id: 'notice', label: '공지사항', topics: ['NOTICE'] },
  { id: 'info', label: '정보공유', topics: ['KNOWLEDGE', 'EMPLOYMENT_TIP'] },
  { id: 'free', label: '자유게시판', topics: ['SMALL_TALK'] },
] as const;

// Sub-tabs for 정보공유
export const INFO_SUB_TABS = [
  { topic: 'KNOWLEDGE', label: '지식줍줍' },
  { topic: 'EMPLOYMENT_TIP', label: '취업팁' },
] as const;

export const TOPIC_NAV_ITEMS = [
  { topic: 'ALL', label: '전체' },
  { topic: 'NOTICE', label: '공지사항' },
  { topic: 'KNOWLEDGE', label: '지식줍줍' },
  { topic: 'EMPLOYMENT_TIP', label: '취업팁' },
  { topic: 'SMALL_TALK', label: '자유게시판' },
] as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;

// Validation
export const VALIDATION = {
  NAME_MAX_LENGTH: 10,
  PHONE_PATTERN: /^01[0-9]{8,9}$/,
  POST_TITLE_MAX: 100,
  POST_CONTENT_MAX: 10000,
  COMMENT_MAX: 2000,
  STUDY_NAME_MIN: 2,
  STUDY_NAME_MAX: 50,
  STUDY_DESC_MAX: 300,
  STUDY_CAPACITY_MIN: 2,
  STUDY_TAGS_MAX: 5,
} as const;
