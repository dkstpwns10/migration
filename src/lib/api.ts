import { API_BASE_URL } from './constants';

// API client with credentials included for cookie-based auth
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      credentials: 'include', // Required for cookie-based auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    // Handle 401 - redirect to login (except for auth check endpoints)
    if (response.status === 401) {
      // Don't redirect for auth check endpoints or if already on signin page
      const isAuthCheckEndpoint = endpoint === '/auth/me' || endpoint === '/auth/login';
      const isSigninPage = typeof window !== 'undefined' && window.location.pathname === '/signin';

      if (!isAuthCheckEndpoint && !isSigninPage) {
        window.location.href = '/signin';
      }
      throw new Error('Unauthorized');
    }

    // Handle 404 on login - user not registered
    if (response.status === 404 && endpoint === '/auth/login') {
      throw new ApiError('USER_NOT_FOUND', 404, '미가입 유저입니다.');
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.code || 'UNKNOWN_ERROR',
        response.status,
        errorData.message || '오류가 발생했습니다.',
        errorData.errors
      );
    }

    // Handle 204 No Content or empty body
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // For file uploads (multipart/form-data)
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    // Handle 401 - redirect to login
    if (response.status === 401) {
      const isSigninPage = typeof window !== 'undefined' && window.location.pathname === '/signin';
      if (!isSigninPage) {
        window.location.href = '/signin';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.code || 'UPLOAD_ERROR',
        response.status,
        errorData.message || '업로드에 실패했습니다.',
        errorData.errors
      );
    }

    // Handle 204 No Content or empty body
    if (response.status === 204) {
      return {} as T;
    }

    // Parse response body regardless of Content-Type
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      console.error('Failed to parse upload response:', text);
      return {} as T;
    }
  }
}

// Custom API Error class
export class ApiError extends Error {
  code: string;
  status: number;
  errors?: Array<{ field: string; reason: string }>;

  constructor(
    code: string,
    status: number,
    message: string,
    errors?: Array<{ field: string; reason: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.errors = errors;
  }
}

export const api = new ApiClient(API_BASE_URL);

// Type definitions for API responses
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  trackId?: number;
  trackName?: string;
  profileImageUrl?: string;
}

export interface Track {
  id: number;
  trackName: string;
  startDate: string;
  endDate: string;
}

export interface PostSummary {
  id: number;
  topic: string;
  title: string;
  preview: string;
  author: {
    id: number;
    name: string;
    profileImageUrl?: string;
  };
  reactionCount: number;
  commentCount: number;
  viewCount: number;
  isReacted: boolean;
  createdAt: string;
  highlightType?: string;
}

export interface Post {
  id: number;
  topic: string;
  title: string;
  content: string;
  preview: string;
  author: {
    id: number;
    name: string;
    trackName?: string;
    profileImageUrl?: string;
  };
  reactionCount: number;
  commentCount: number;
  viewCount: number;
  isReacted: boolean;
  isAuthor: boolean;
  createdAt: string;
  updatedAt: string;
  highlightType?: string;
}

export interface Comment {
  id: number;
  content: string;
  author: {
    id: number;
    name: string;
    profileImageUrl?: string;
  };
  parentId?: number;
  reactionCount: number;
  isReacted: boolean;
  isAuthor: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  mentionedUsers?: Array<{ id: number; name: string }>;
}

export interface Study {
  id: number;
  name: string;
  description: string;
  capacity: number;
  currentMemberCount: number;
  status: string;
  budget: string;
  chatUrl?: string;
  refUrl?: string;
  tags: string[];
  leader: {
    id: number;
    name: string;
    trackName?: string;
    profileImageUrl?: string;
  };
  schedule?: {
    id: number;
    month: string;
    recruitStartDate: string;
    recruitEndDate: string;
    studyEndDate: string;
  };
  isLeader: boolean;
  isRecruitmentClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  relatedId?: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  hasNext: boolean;
  totalElements?: number;
  totalPages?: number;
}

// Notification API 응답 타입
export interface NotificationResponse {
  id: number;
  type: string;
  title: string;
  content: string;
  actorId?: number;
  referenceType: 'POST' | 'STUDY';
  referenceId: number;
  status: 'READ' | 'UNREAD';
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationResponse[];
  hasNext: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

// 알림 타입 매핑 (백엔드 → 프론트엔드)
export const mapNotificationType = (type: string): string => {
  switch (type) {
    case 'POST_COMMENT':
    case 'COMMENT_REPLY':
    case 'COMMENT_MENTION':
      return 'COMMENT';
    case 'POST_REACTION':
    case 'COMMENT_REACTION':
      return 'LIKE';
    case 'ANNOUNCEMENT':
      return 'NOTICE';
    default:
      return type;
  }
};

// API 응답을 Notification 타입으로 변환
export const mapNotificationResponse = (item: NotificationResponse): Notification => ({
  id: item.id,
  type: mapNotificationType(item.type),
  message: item.content,
  isRead: item.status === 'READ',
  relatedId: item.referenceId,
  createdAt: item.createdAt,
});

// ==================== Study Related Types ====================

export type StudyStatus = 'PENDING' | 'APPROVED' | 'CLOSED' | 'REJECTED';
export type BudgetType = 'FREE' | 'PAID' | 'BOOK' | 'MEAL';
export type RecruitmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StudyLeader {
  id: number;
  name: string;
  trackId?: number;
  trackName?: string;
  profileImageUrl?: string;
}

export interface StudySchedule {
  id: number;
  month: string;
  recruitStartDate: string;
  recruitEndDate: string;
  studyEndDate: string;
}

export interface StudyDetail {
  id: number;
  scheduleId?: number;
  scheduleName?: string;
  leaderId: number;
  name: string;
  description: string;
  capacity: number;
  currentMemberCount: number;
  status: StudyStatus;
  budget: BudgetType;
  chatUrl?: string;
  refUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isRecruitmentClosed: boolean;
  isLeader: boolean;
  leader?: StudyLeader;
}

export interface StudyCreateRequest {
  name: string;
  description: string;
  capacity: number;
  budget: BudgetType;
  chatUrl: string;
  refUrl?: string;
  tags?: string[];
}

export interface StudyUpdateRequest {
  name?: string;
  description?: string;
  capacity?: number;
  budget?: BudgetType;
  scheduleId?: number;
  chatUrl?: string;
  refUrl?: string;
  tags?: string[];
}

export interface StudyRecruitRequest {
  appeal: string;
}

export interface Recruitment {
  id: number;
  studyId: number;
  studyName: string;
  trackName?: string;
  userId: number;
  userName: string;
  userProfileImageUrl?: string;
  appeal: string;
  status: RecruitmentStatus;
  createdAt: string;
  approvedAt?: string;
}

// ==================== Schedule Related Types ====================

export interface ScheduleCreateRequest {
  trackId: number;
  month: string;
  recruitStartDate: string;
  recruitEndDate: string;
  studyEndDate: string;
}

export interface ScheduleUpdateRequest {
  trackId?: number;
  months?: string;
  recruitStartDate?: string;
  recruitEndDate?: string;
  studyEndDate?: string;
}

export interface Schedule {
  id: number;
  trackId: number;
  trackName?: string;
  month: string;
  recruitStartDate: string;
  recruitEndDate: string;
  studyEndDate: string;
}

// ==================== Admin/Track Related Types ====================

export interface TrackCreateRequest {
  trackName: string;
  startDate: string;
  endDate: string;
}

export interface TrackUpdateRequest {
  trackName?: string;
  startDate?: string;
  endDate?: string;
}

export interface AdminTrack {
  trackId: number;
  trackName: string;
  startDate: string;
  endDate: string;
}

// ==================== Study API Functions ====================

export const studyApi = {
  // 스터디 목록 조회
  getStudies: (params?: {
    trackId?: number;
    status?: StudyStatus;
    page?: number;
    size?: number;
  }) => api.get<PaginatedResponse<Study>>('/studies', params),

  // 스터디 상세 조회
  getStudy: (studyId: number) => api.get<StudyDetail>(`/studies/${studyId}`),

  // 스터디 생성
  createStudy: (data: StudyCreateRequest) =>
    api.post<{ studyId: number }>('/studies', data),

  // 스터디 수정
  updateStudy: (studyId: number, data: StudyUpdateRequest) =>
    api.patch<void>(`/studies/${studyId}`, data),

  // 스터디 삭제
  deleteStudy: (studyId: number) => api.delete<void>(`/studies/${studyId}`),

  // 스터디 신청
  applyStudy: (studyId: number, data: StudyRecruitRequest) =>
    api.post<void>(`/studies/${studyId}/recruitments`, data),

  // 스터디 신청 취소
  cancelRecruitment: (studyId: number, recruitmentId: number) =>
    api.delete<void>(`/studies/${studyId}/recruitments/${recruitmentId}`),

  // 스터디 신청자 목록 조회 (스터디장)
  getRecruitments: (studyId: number) =>
    api.get<{ content: Recruitment[] }>(`/users/me/studies/${studyId}/recruitments`),

  // 스터디 신청 승인 (스터디장)
  approveRecruitment: (studyId: number, recruitmentId: number) =>
    api.patch<void>(`/studies/${studyId}/recruitments/${recruitmentId}/approve`),

  // 스터디 신청 거절 (스터디장)
  rejectRecruitment: (studyId: number, recruitmentId: number) =>
    api.patch<void>(`/studies/${studyId}/recruitments/${recruitmentId}/reject`),

  // 내 스터디 신청 목록 조회
  getMyRecruitments: () =>
    api.get<{ content: Recruitment[] }>('/users/me/recruitments'),

  // 스터디 승인 (관리자)
  approveStudy: (studyId: number) =>
    api.patch<void>(`/studies/${studyId}/approve`),

  // 스터디 거절 (관리자)
  rejectStudy: (studyId: number) =>
    api.patch<void>(`/studies/${studyId}/reject`),
};

// ==================== Schedule API Functions ====================

export const scheduleApi = {
  // 스터디 일정 생성
  createSchedule: (data: ScheduleCreateRequest) =>
    api.post<{ id: number; trackId: number; months: string }>('/studies/schedules', data),

  // 스터디 일정 수정
  updateSchedule: (id: number, data: ScheduleUpdateRequest) =>
    api.patch<{ id: number; trackId: number; months: string }>(`/studies/schedules/${id}`, data),

  // 스터디 일정 삭제
  deleteSchedule: (id: number) => api.delete<void>(`/studies/schedules/${id}`),
};

// ==================== Admin API Functions ====================

export const adminApi = {
  // 유저 목록 조회
  getUsers: (params?: { status?: string; page?: number; size?: number }) =>
    api.get<PaginatedResponse<{
      id: number;
      name: string;
      email: string;
      trackId: number;
      trackName: string;
      profileImageUrl?: string;
      status: string;
      createdAt: string;
    }>>('/admin/users', params),

  // 유저 수 조회
  getUsersCount: (status?: string) =>
    api.get<{ count: number }>('/admin/users/count', status ? { status } : undefined),

  // 유저 승인/거절 (단건)
  decideUser: (userId: number, decision: 'APPROVED' | 'REJECTED') =>
    api.put<void>(`/admin/users/${userId}/decision`, { decision }),

  // 유저 승인/거절 (다건)
  decideUsers: (decisions: Array<{ userId: number; decision: 'APPROVED' | 'REJECTED' }>) =>
    api.put<void>('/admin/users/decisions', { decisions }),

  // 트랙 목록 조회 (회원가입용)
  getTracks: () =>
    api.get<{ content: AdminTrack[] }>('/admin/tracks'),

  // 전체 트랙 목록 조회 (Admin 전용)
  getAllTracks: () =>
    api.get<{ content: AdminTrack[] }>('/admin/tracks/all'),

  // 트랙 생성
  createTrack: (data: TrackCreateRequest) =>
    api.post<{ trackId: number }>('/admin/tracks', data),

  // 트랙 수정
  updateTrack: (id: number, data: TrackUpdateRequest) =>
    api.patch<void>(`/admin/tracks/${id}`, data),

  // 트랙 삭제
  deleteTrack: (id: number) => api.delete<void>(`/admin/tracks/${id}`),

  // 스터디 목록 조회 (승인 대기)
  getPendingStudies: (params?: { page?: number; size?: number }) =>
    api.get<PaginatedResponse<Study>>('/studies', { ...params, status: 'PENDING' }),
};
