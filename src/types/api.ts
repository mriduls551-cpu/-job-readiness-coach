/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Paginated response format
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  RATE_LIMIT_EXCEEDED = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  token: string;
  expiresIn: number;
}

/**
 * Assessment result
 */
export interface AssessmentResult {
  id: string;
  userId: string;
  assessmentType: 'career_fit' | 'quick_check';
  selectedRole: string;
  roleScores: Record<string, number>;
  completedAt: string;
}

/**
 * User profile
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  location: string | null;
  role: 'user' | 'admin';
  language: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard data
 */
export interface DashboardData {
  user: UserProfile;
  assessment: AssessmentResult | null;
  resume: {
    id: string;
    title: string | null;
    skills: string[];
  } | null;
  applications: {
    total: number;
    statuses: Record<string, number>;
  };
  plan: {
    id: string;
    tasksTotal: number;
    tasksCompleted: number;
    nextAction?: string;
  } | null;
  progress: {
    percentComplete: number;
    nextStep: string;
  };
}

/**
 * Admin audit log entry
 */
export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, any>;
  timestamp: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  checks: {
    database: 'ok' | 'error';
    auth: 'ok' | 'error';
    persistenceMode: 'supabase' | 'memory' | 'unavailable';
    lastMigration: string;
    timestamp: string;
  };
}
