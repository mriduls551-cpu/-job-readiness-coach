import { logger } from '@/lib/logger';
import type { JobCoachDatabase, Json } from '@/lib/job-coach-supabase.types';
import type {
  AssessmentScoringConfig,
  AssessmentScoringVariant,
} from '@/lib/assessment-experiments';
import type {
  AssessmentProfile,
  AssessmentResult,
  Locale,
  ReminderItem,
  ResumeDraft,
  RoleId,
  LocalizedText,
} from '@/lib/product';
import {
  buildReminders,
  buildStarterResume,
  generatePlanTasks,
  isActiveRoleId,
  scoreAssessment,
  validateAssessmentResponses,
} from '@/lib/product';
import {
  createServerClient,
  isSupabaseConfigured,
  type JobCoachSupabaseClient,
} from '@/lib/supabase';

type JobCoachTables = JobCoachDatabase['public']['Tables'];
type UserRow = JobCoachTables['job_coach_users']['Row'];
type AssessmentRow = JobCoachTables['job_coach_assessments']['Row'];
type AssessmentFeedbackRow = JobCoachTables['job_coach_assessment_feedback']['Row'];
type D1WaitlistRow = JobCoachTables['job_coach_d1_waitlist']['Row'];
type FunnelEventRow = JobCoachTables['job_coach_funnel_events']['Row'];
type PublicShareRow = JobCoachTables['job_coach_public_shares']['Row'];
type ResumeRow = JobCoachTables['job_coach_resumes']['Row'];
type ApplicationRow = JobCoachTables['job_coach_applications']['Row'];
type PlanRow = JobCoachTables['job_coach_action_plans']['Row'];
type NudgeRow = JobCoachTables['job_coach_nudges']['Row'];
type AgentMessageRow = JobCoachTables['job_coach_agent_messages']['Row'];
type AgentSessionRow = JobCoachTables['job_coach_agent_sessions']['Row'];

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentRecord {
  id: string;
  userId: string;
  responses: Record<string, string>;
  profile: AssessmentProfile;
  selectedRole?: RoleId;
  roleScores: Record<RoleId, number>;
  resultSnapshot?: AssessmentResult;
  scoringVersion?: string;
  catalogVersion?: string;
  scoringVariant?: string | null;
  status: 'completed' | 'in_progress';
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentFeedbackRecord {
  id: string;
  userId: string;
  assessmentId: string;
  rating: 'helpful' | 'unhelpful';
  comment: string;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
}

export interface D1WaitlistRecord {
  id: string;
  userId: string;
  assessmentId: string;
  selectedRoleId: RoleId;
  contactConsent: boolean;
  note: string;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelEventRecord {
  id: string;
  userId: string;
  eventName: string;
  properties: Record<string, Json>;
  locale: Locale;
  createdAt: string;
}

export interface PublicShareRecord {
  id: string;
  userId: string;
  assessmentId: string;
  publicId: string;
  firstName: string;
  locale: Locale;
  roleId: RoleId;
  roleName: LocalizedText;
  roleSummary: LocalizedText;
  dimensionSnapshot: AssessmentResult['dimensionSnapshot'];
  confidenceBand: AssessmentResult['confidenceBand'];
  visitCount: number;
  createdAt: string;
  updatedAt: string;
  lastVisitedAt: string | null;
}

export interface ShareStats {
  totalShares: number;
  totalVisits: number;
  visitRate: number;
}

export interface FunnelSummary {
  totalEvents: number;
  eventsByName: Record<string, number>;
  assessmentStarts: number;
  assessmentCompletes: number;
  resultsViewed: number;
  questionsAnsweredByIndex: Record<string, number>;
  completionRate: number;
  ctaSplit: {
    resume: number;
    practice: number;
  };
  feedback: {
    helpful: number;
    unhelpful: number;
    total: number;
  };
  waitlist: {
    total: number;
    consented: number;
  };
}

export interface ResumeRecord extends ResumeDraft {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationRecord {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  status: 'applied' | 'interview' | 'offered' | 'rejected';
  applicationDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'project' | 'assessment' | 'networking';
  priority: 'high' | 'medium';
  dueDate: string;
  completed: boolean;
  linkedApplicationId?: string;
  completedAt?: string;
}

export interface ActionPlan {
  id: string;
  userId: string;
  roleId: RoleId;
  weekNumber: number;
  tasks: PlanTask[];
  generatedAt: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface AgentConversationMessage {
  id: string;
  userId: string;
  agentType: 'coach' | 'assessment' | 'resume' | 'planner';
  role: 'user' | 'assistant';
  content: string;
  locale: Locale;
  createdAt: string;
}

export interface AgentSession {
  id: string;
  userId: string;
  agentType: 'coach' | 'assessment' | 'resume' | 'planner';
  state: Record<string, unknown>;
  lastActiveAt: string;
}

export interface ReminderRecord extends ReminderItem {
  userId: string;
  createdAt: string;
}

export interface ProductDB {
  ensureUser(user: User): Promise<User>;
  getUser(userId: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: string): Promise<void>;
  saveAssessment(
    userId: string,
    responses: Record<string, string>,
    profile: AssessmentProfile,
    options?: {
      scoringVariant?: AssessmentScoringVariant | null;
      scoringConfig?: Partial<AssessmentScoringConfig> | null;
    }
  ): Promise<{ assessment: AssessmentRecord; result: ReturnType<typeof scoreAssessment> }>;
  getLatestAssessment(userId: string): Promise<AssessmentRecord | null>;
  getUserAssessments(userId: string): Promise<AssessmentRecord[]>;
  saveSelectedRole(userId: string, roleId: RoleId): Promise<AssessmentRecord | null>;
  saveAssessmentFeedback(
    userId: string,
    rating: 'helpful' | 'unhelpful',
    comment: string,
    locale: Locale
  ): Promise<AssessmentFeedbackRecord | null>;
  getAssessmentFeedback(userId: string): Promise<AssessmentFeedbackRecord | null>;
  saveD1Waitlist(
    userId: string,
    selectedRoleId: RoleId,
    contactConsent: boolean,
    note: string,
    locale: Locale
  ): Promise<D1WaitlistRecord | null>;
  getD1Waitlist(userId: string): Promise<D1WaitlistRecord | null>;
  saveFunnelEvent(
    userId: string,
    eventName: string,
    properties: Record<string, Json>,
    locale: Locale
  ): Promise<FunnelEventRecord | null>;
  getFunnelSummary(): Promise<FunnelSummary>;
  savePublicShare(
    userId: string,
    input: {
      assessmentId: string;
      publicId: string;
      firstName: string;
      locale: Locale;
      roleId: RoleId;
      roleName: LocalizedText;
      roleSummary: LocalizedText;
      dimensionSnapshot: AssessmentResult['dimensionSnapshot'];
      confidenceBand: AssessmentResult['confidenceBand'];
    }
  ): Promise<PublicShareRecord | null>;
  getPublicShare(publicId: string): Promise<PublicShareRecord | null>;
  recordPublicShareVisit(publicId: string): Promise<PublicShareRecord | null>;
  getShareStats(): Promise<ShareStats>;
  getOrCreateResume(
    userId: string,
    roleId: RoleId,
    profile: AssessmentProfile,
    user?: { name?: string; email?: string }
  ): Promise<ResumeRecord>;
  createResume(userId: string, data?: Partial<ResumeDraft>): Promise<ResumeRecord>;
  getResume(resumeId: string): Promise<ResumeRecord | null>;
  updateResume(identifier: string, data: Partial<ResumeDraft>): Promise<ResumeRecord>;
  getUserResume(userId: string): Promise<ResumeRecord | null>;
  getUserApplications(userId: string): Promise<ApplicationRecord[]>;
  createApplication(
    userId: string,
    input: {
      companyName: string;
      roleTitle: string;
      notes: string;
    }
  ): Promise<ApplicationRecord>;
  updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: ApplicationRecord['status']
  ): Promise<ApplicationRecord>;
  getOrCreatePlan(userId: string, roleId: RoleId, profile: AssessmentProfile): Promise<ActionPlan>;
  updateTask(
    userId: string,
    planId: string,
    taskId: string,
    completed: boolean
  ): Promise<ActionPlan>;
  getUserPlan(userId: string): Promise<ActionPlan | null>;
  getUserActivePlan(userId: string): Promise<ActionPlan | null>;
  seedReminders(userId: string, locale: Locale, roleId?: RoleId): Promise<ReminderRecord[]>;
  getReminders(userId: string, locale: Locale, roleId?: RoleId): Promise<ReminderRecord[]>;
  appendConversation(
    userId: string,
    input: Omit<AgentConversationMessage, 'id' | 'createdAt' | 'userId'>
  ): Promise<AgentConversationMessage>;
  getConversation(userId: string): Promise<AgentConversationMessage[]>;
  setSession(
    userId: string,
    agentType: AgentSession['agentType'],
    state: Record<string, unknown>
  ): Promise<AgentSession>;
  getSession(userId: string, agentType: AgentSession['agentType']): Promise<AgentSession | null>;
  getDashboardSnapshot(userId: string, locale: Locale): Promise<{
    assessment: AssessmentRecord | null;
    reminders: ReminderRecord[];
    applications: ApplicationRecord[];
    plan: ActionPlan | null;
    resume: ResumeRecord | null;
    selectedRole?: string | null;
  }>;
  getDashboardStats(userId: string): Promise<{
    assessment: AssessmentRecord | null;
    resume: ResumeRecord | null;
    applications: { total: number };
    applicationStats: {
      total: number;
      applied: number;
      interview: number;
      offered: number;
      rejected: number;
    };
    plan: ActionPlan | null;
    planProgress: number;
  }>;
}

function emptyResumeRecord(data?: Partial<ResumeDraft>): ResumeDraft {
  return {
    title: data?.title || '',
    summary: data?.summary || '',
    email: data?.email || '',
    phone: data?.phone || '',
    location: data?.location || '',
    skills: data?.skills || [],
    experience: data?.experience || [],
    education: data?.education || [],
    certifications: data?.certifications || [],
  };
}

function nowIso() {
  return new Date().toISOString();
}

function asRecord(value: Json | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

function asStringRecord(value: Json | null | undefined) {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, String(item ?? '')])
  ) as Record<string, string>;
}

function asRoleScoreRecord(value: Json | null | undefined) {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, Number(item ?? 0)])
  ) as Record<RoleId, number>;
}

function asArray<T>(value: Json | null | undefined) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asLocalizedText(value: Json | null | undefined): ReminderItem['title'] {
  const record = asRecord(value);
  return {
    en: typeof record.en === 'string' ? record.en : '',
    hi: typeof record.hi === 'string' ? record.hi : '',
  };
}

function asDimensionSnapshot(
  value: Json | null | undefined
): AssessmentResult['dimensionSnapshot'] {
  const record = asRecord(value);
  return {
    numerical: Number(record.numerical ?? 0),
    'people-reactive': Number(record['people-reactive'] ?? 0),
    'people-proactive': Number(record['people-proactive'] ?? 0),
    'process-ops': Number(record['process-ops'] ?? 0),
    'creative-output': Number(record['creative-output'] ?? 0),
    'analytical-output': Number(record['analytical-output'] ?? 0),
  };
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssessmentRow(row: AssessmentRow): AssessmentRecord {
  const profileRecord = asRecord(row.profile);
  return {
    id: row.id,
    userId: row.user_id,
    responses: asStringRecord(row.responses),
    profile: {
      ...(profileRecord as Partial<AssessmentProfile>),
      locale: (profileRecord.locale as Locale | undefined) === 'hi' ? 'hi' : 'en',
    },
    selectedRole: isActiveRoleId(row.selected_role) ? row.selected_role : undefined,
    roleScores: asRoleScoreRecord(row.role_scores),
    resultSnapshot: row.result_snapshot
      ? (row.result_snapshot as unknown as AssessmentResult)
      : undefined,
    scoringVersion: row.scoring_version || undefined,
    catalogVersion: row.catalog_version || undefined,
    scoringVariant: row.scoring_variant || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssessmentFeedbackRow(row: AssessmentFeedbackRow): AssessmentFeedbackRecord {
  return {
    id: row.id,
    userId: row.user_id,
    assessmentId: row.assessment_id,
    rating: row.rating,
    comment: row.comment,
    locale: row.locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapD1WaitlistRow(row: D1WaitlistRow): D1WaitlistRecord {
  return {
    id: row.id,
    userId: row.user_id,
    assessmentId: row.assessment_id,
    selectedRoleId: row.selected_role_id as RoleId,
    contactConsent: row.contact_consent,
    note: row.note,
    locale: row.locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFunnelEventRow(row: FunnelEventRow): FunnelEventRecord {
  return {
    id: row.id,
    userId: row.user_id,
    eventName: row.event_name,
    properties: asRecord(row.properties) as Record<string, Json>,
    locale: row.locale,
    createdAt: row.created_at,
  };
}

function mapPublicShareRow(row: PublicShareRow): PublicShareRecord {
  return {
    id: row.id,
    userId: row.user_id,
    assessmentId: row.assessment_id,
    publicId: row.public_id,
    firstName: row.first_name,
    locale: row.locale,
    roleId: row.role_id as RoleId,
    roleName: asLocalizedText(row.role_name),
    roleSummary: asLocalizedText(row.role_summary),
    dimensionSnapshot: asDimensionSnapshot(row.dimension_snapshot),
    confidenceBand: row.confidence_band,
    visitCount: row.visit_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastVisitedAt: row.last_visited_at,
  };
}

function mapResumeRow(row: ResumeRow): ResumeRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    summary: row.summary,
    email: row.email,
    phone: row.phone,
    location: row.location,
    skills: asArray<string>(row.skills),
    experience: asArray<ResumeDraft['experience'][number]>(row.experience),
    education: asArray<ResumeDraft['education'][number]>(row.education),
    certifications: asArray<string>(row.certifications),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApplicationRow(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    status: row.status,
    applicationDate: row.application_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlanRow(row: PlanRow): ActionPlan {
  return {
    id: row.id,
    userId: row.user_id,
    roleId: row.role_id as RoleId,
    weekNumber: row.week_number,
    tasks: asArray<PlanTask>(row.tasks),
    generatedAt: row.generated_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReminderRow(row: NudgeRow): ReminderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: asLocalizedText(row.title),
    body: asLocalizedText(row.body),
    tone: row.tone,
    createdAt: row.created_at,
  };
}

function mapAgentMessageRow(row: AgentMessageRow): AgentConversationMessage {
  return {
    id: row.id,
    userId: row.user_id,
    agentType: row.agent_type,
    role: row.role,
    content: row.content,
    locale: row.locale,
    createdAt: row.created_at,
  };
}

function mapAgentSessionRow(row: AgentSessionRow): AgentSession {
  return {
    id: row.id,
    userId: row.user_id,
    agentType: row.agent_type,
    state: asRecord(row.state),
    lastActiveAt: row.last_active_at,
  };
}

class InMemoryDB implements ProductDB {
  private users = new Map<string, User>();
  private assessments = new Map<string, AssessmentRecord>();
  private assessmentFeedback = new Map<string, AssessmentFeedbackRecord>();
  private d1Waitlist = new Map<string, D1WaitlistRecord>();
  private funnelEvents = new Map<string, FunnelEventRecord>();
  private publicShares = new Map<string, PublicShareRecord>();
  private resumes = new Map<string, ResumeRecord>();
  private applications = new Map<string, ApplicationRecord>();
  private plans = new Map<string, ActionPlan>();
  private reminders = new Map<string, ReminderRecord[]>();
  private conversations = new Map<string, AgentConversationMessage[]>();
  private sessions = new Map<string, AgentSession>();

  constructor() {
    // TD-01: in-memory store does NOT survive restarts/serverless cold starts.
    // Warn loudly so a deployed/preview env never silently loses user data.
    logger.warn(
      '⚠️  Using in-memory database — data will NOT persist across restarts or serverless cold starts. Configure Supabase for any shared/deployed environment.'
    );
  }

  async ensureUser(user: User) {
    const existing = this.users.get(user.id);
    if (existing) {
      const updated = { ...existing, ...user, updatedAt: user.updatedAt || nowIso() };
      this.users.set(user.id, updated);
      return updated;
    }
    this.users.set(user.id, user);
    return user;
  }

  async getUser(userId: string) {
    return this.users.get(userId) || null;
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }

  async deleteUser(userId: string) {
    this.users.delete(userId);
    this.assessments.forEach((item, key) => {
      if (item.userId === userId) this.assessments.delete(key);
    });
    this.assessmentFeedback.forEach((item, key) => {
      if (item.userId === userId) this.assessmentFeedback.delete(key);
    });
    this.d1Waitlist.forEach((item, key) => {
      if (item.userId === userId) this.d1Waitlist.delete(key);
    });
    this.funnelEvents.forEach((item, key) => {
      if (item.userId === userId) this.funnelEvents.delete(key);
    });
    this.publicShares.forEach((item, key) => {
      if (item.userId === userId) this.publicShares.delete(key);
    });
    this.resumes.forEach((item, key) => {
      if (item.userId === userId) this.resumes.delete(key);
    });
    this.applications.forEach((item, key) => {
      if (item.userId === userId) this.applications.delete(key);
    });
    this.plans.forEach((item, key) => {
      if (item.userId === userId) this.plans.delete(key);
    });
    this.reminders.delete(userId);
    this.conversations.delete(userId);
  }

  async saveAssessment(
    userId: string,
    responses: Record<string, string>,
    profile: AssessmentProfile,
    options?: {
      scoringVariant?: AssessmentScoringVariant | null;
      scoringConfig?: Partial<AssessmentScoringConfig> | null;
    }
  ) {
    const canonicalResponses = validateAssessmentResponses(responses).canonicalResponses;
    const result = scoreAssessment(
      canonicalResponses,
      profile,
      profile.locale,
      options?.scoringConfig || undefined
    );
    const assessment: AssessmentRecord = {
      id: `assessment-${Date.now()}`,
      userId,
      responses: canonicalResponses,
      profile: result.profile,
      selectedRole: result.topRoles[0]?.roleId,
      roleScores: result.allScores,
      resultSnapshot: result,
      scoringVersion: result.scoringVersion,
      catalogVersion: result.catalogVersion,
      scoringVariant: options?.scoringVariant ?? null,
      status: 'completed',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.assessments.set(assessment.id, assessment);
    return { assessment, result };
  }

  async getLatestAssessment(userId: string) {
    return (
      Array.from(this.assessments.values())
        .filter((item) => item.userId === userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] || null
    );
  }

  async getUserAssessments(userId: string) {
    return Array.from(this.assessments.values()).filter((item) => item.userId === userId);
  }

  async saveSelectedRole(userId: string, roleId: RoleId) {
    const latest = await this.getLatestAssessment(userId);
    if (!latest) return null;
    latest.selectedRole = roleId;
    latest.updatedAt = nowIso();
    this.assessments.set(latest.id, latest);
    return latest;
  }

  async saveAssessmentFeedback(
    userId: string,
    rating: 'helpful' | 'unhelpful',
    comment: string,
    locale: Locale
  ) {
    const latest = await this.getLatestAssessment(userId);
    if (!latest) return null;

    const key = `${userId}:${latest.id}`;
    const existing = this.assessmentFeedback.get(key);
    const timestamp = nowIso();
    const feedback: AssessmentFeedbackRecord = {
      id: existing?.id || `feedback-${Date.now()}`,
      userId,
      assessmentId: latest.id,
      rating,
      comment,
      locale,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    this.assessmentFeedback.set(key, feedback);
    return feedback;
  }

  async getAssessmentFeedback(userId: string) {
    return (
      Array.from(this.assessmentFeedback.values())
        .filter((item) => item.userId === userId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null
    );
  }

  async saveD1Waitlist(
    userId: string,
    selectedRoleId: RoleId,
    contactConsent: boolean,
    note: string,
    locale: Locale
  ) {
    const latest = await this.getLatestAssessment(userId);
    if (!latest) return null;

    const key = `${userId}:${latest.id}`;
    const existing = this.d1Waitlist.get(key);
    const timestamp = nowIso();
    const waitlist: D1WaitlistRecord = {
      id: existing?.id || `waitlist-${Date.now()}`,
      userId,
      assessmentId: latest.id,
      selectedRoleId,
      contactConsent,
      note,
      locale,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    this.d1Waitlist.set(key, waitlist);
    return waitlist;
  }

  async getD1Waitlist(userId: string) {
    return (
      Array.from(this.d1Waitlist.values())
        .filter((item) => item.userId === userId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null
    );
  }

  async saveFunnelEvent(
    userId: string,
    eventName: string,
    properties: Record<string, Json>,
    locale: Locale
  ) {
    const event: FunnelEventRecord = {
      id: `event-${Date.now()}-${this.funnelEvents.size + 1}`,
      userId,
      eventName,
      properties,
      locale,
      createdAt: nowIso(),
    };
    this.funnelEvents.set(event.id, event);
    return event;
  }

  async getFunnelSummary() {
    return buildFunnelSummary(
      Array.from(this.funnelEvents.values()),
      Array.from(this.assessmentFeedback.values()),
      Array.from(this.d1Waitlist.values())
    );
  }

  async savePublicShare(
    userId: string,
    input: {
      assessmentId: string;
      publicId: string;
      firstName: string;
      locale: Locale;
      roleId: RoleId;
      roleName: LocalizedText;
      roleSummary: LocalizedText;
      dimensionSnapshot: AssessmentResult['dimensionSnapshot'];
      confidenceBand: AssessmentResult['confidenceBand'];
    }
  ) {
    const key = `${userId}:${input.assessmentId}`;
    const existing = this.publicShares.get(key);
    const timestamp = nowIso();
    const share: PublicShareRecord = {
      id: existing?.id || `share-${Date.now()}`,
      userId,
      assessmentId: input.assessmentId,
      publicId: existing?.publicId || input.publicId,
      firstName: input.firstName,
      locale: input.locale,
      roleId: input.roleId,
      roleName: input.roleName,
      roleSummary: input.roleSummary,
      dimensionSnapshot: input.dimensionSnapshot,
      confidenceBand: input.confidenceBand,
      visitCount: existing?.visitCount || 0,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
      lastVisitedAt: existing?.lastVisitedAt || null,
    };

    this.publicShares.set(key, share);
    return share;
  }

  async getPublicShare(publicId: string) {
    return (
      Array.from(this.publicShares.values()).find((item) => item.publicId === publicId) || null
    );
  }

  async recordPublicShareVisit(publicId: string) {
    const existing = await this.getPublicShare(publicId);
    if (!existing) return null;

    existing.visitCount += 1;
    existing.lastVisitedAt = nowIso();
    existing.updatedAt = nowIso();
    this.publicShares.set(`${existing.userId}:${existing.assessmentId}`, existing);
    return existing;
  }

  async getShareStats() {
    const shares = Array.from(this.publicShares.values());
    const totalVisits = shares.reduce((sum, item) => sum + item.visitCount, 0);
    return {
      totalShares: shares.length,
      totalVisits,
      visitRate: shares.length > 0 ? totalVisits / shares.length : 0,
    };
  }

  async getOrCreateResume(
    userId: string,
    roleId: RoleId,
    profile: AssessmentProfile,
    user?: { name?: string; email?: string }
  ) {
    const existing = Array.from(this.resumes.values()).find((resume) => resume.userId === userId);
    if (existing) return existing;

    const draft = buildStarterResume(roleId, profile, user);
    const created: ResumeRecord = {
      id: `resume-${Date.now()}`,
      userId,
      ...draft,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.resumes.set(created.id, created);
    return created;
  }

  async createResume(userId: string, data?: Partial<ResumeDraft>) {
    const created: ResumeRecord = {
      id: `resume-${Date.now()}`,
      userId,
      ...emptyResumeRecord(data),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.resumes.set(created.id, created);
    return created;
  }

  async getResume(resumeId: string) {
    return this.resumes.get(resumeId) || null;
  }

  async updateResume(identifier: string, data: Partial<ResumeDraft>) {
    const existing =
      this.resumes.get(identifier) ||
      Array.from(this.resumes.values()).find((resume) => resume.userId === identifier);

    if (!existing) {
      throw new Error('Resume not found');
    }

    const updated: ResumeRecord = {
      ...existing,
      ...data,
      updatedAt: nowIso(),
    };
    this.resumes.set(updated.id, updated);
    return updated;
  }

  async getUserResume(userId: string) {
    return Array.from(this.resumes.values()).find((resume) => resume.userId === userId) || null;
  }

  async getUserApplications(userId: string) {
    return Array.from(this.applications.values())
      .filter((application) => application.userId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async createApplication(
    userId: string,
    input: {
      companyName: string;
      roleTitle: string;
      notes: string;
    }
  ) {
    const application: ApplicationRecord = {
      id: `application-${Date.now()}`,
      userId,
      companyName: input.companyName,
      roleTitle: input.roleTitle,
      status: 'applied',
      applicationDate: nowIso(),
      notes: input.notes,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.applications.set(application.id, application);
    return application;
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: ApplicationRecord['status']
  ) {
    const application = this.applications.get(applicationId);
    if (!application || application.userId !== userId) {
      throw new Error('Application not found');
    }
    application.status = status;
    application.updatedAt = nowIso();
    this.applications.set(applicationId, application);
    return application;
  }

  async getOrCreatePlan(userId: string, roleId: RoleId, profile: AssessmentProfile) {
    const existing = Array.from(this.plans.values())
      .filter((plan) => plan.userId === userId && plan.status === 'active')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

    if (existing) return existing;

    const applicationCount = (await this.getUserApplications(userId)).length;
    const plan: ActionPlan = {
      id: `plan-${Date.now()}`,
      userId,
      roleId,
      weekNumber: 1,
      tasks: generatePlanTasks(roleId, profile, applicationCount),
      generatedAt: nowIso(),
      status: 'active',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  async updateTask(userId: string, planId: string, taskId: string, completed: boolean) {
    const plan = this.plans.get(planId);
    if (!plan || plan.userId !== userId) {
      throw new Error('Plan not found');
    }

    plan.tasks = plan.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completed,
            completedAt: completed ? nowIso() : undefined,
          }
        : task
    );
    plan.updatedAt = nowIso();
    this.plans.set(plan.id, plan);
    return plan;
  }

  async getUserPlan(userId: string) {
    return (
      Array.from(this.plans.values())
        .filter((plan) => plan.userId === userId && plan.status === 'active')
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] || null
    );
  }

  async getUserActivePlan(userId: string) {
    return this.getUserPlan(userId);
  }

  async seedReminders(userId: string, locale: Locale, roleId?: RoleId) {
    const existing = this.reminders.get(userId);
    if (existing?.length) return existing;

    const created = buildReminders(roleId, locale).map((item) => ({
      ...item,
      userId,
      createdAt: nowIso(),
    }));
    this.reminders.set(userId, created);
    return created;
  }

  async getReminders(userId: string, locale: Locale, roleId?: RoleId) {
    return this.seedReminders(userId, locale, roleId);
  }

  async appendConversation(
    userId: string,
    input: Omit<AgentConversationMessage, 'id' | 'createdAt' | 'userId'>
  ) {
    const messages = this.conversations.get(userId) || [];
    const created: AgentConversationMessage = {
      id: `message-${Date.now()}-${messages.length + 1}`,
      userId,
      createdAt: nowIso(),
      ...input,
    };
    const next = [...messages, created].slice(-10);
    this.conversations.set(userId, next);
    return created;
  }

  async getConversation(userId: string) {
    return this.conversations.get(userId) || [];
  }

  async setSession(
    userId: string,
    agentType: AgentSession['agentType'],
    state: Record<string, unknown>
  ) {
    const session: AgentSession = {
      id: `${userId}-${agentType}`,
      userId,
      agentType,
      state,
      lastActiveAt: nowIso(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(userId: string, agentType: AgentSession['agentType']) {
    return this.sessions.get(`${userId}-${agentType}`) || null;
  }

  async getDashboardSnapshot(userId: string, locale: Locale) {
    const assessment = await this.getLatestAssessment(userId);
    const selectedRole = assessment?.selectedRole;
    const reminders = await this.getReminders(userId, locale, selectedRole);
    const applications = await this.getUserApplications(userId);
    const plan = await this.getUserPlan(userId);
    const resume = await this.getUserResume(userId);

    return {
      assessment,
      reminders,
      applications,
      plan,
      resume,
      selectedRole,
    };
  }

  async getDashboardStats(userId: string) {
    const snapshot = await this.getDashboardSnapshot(userId, 'en');
    return buildDashboardStats(snapshot);
  }
}

class SupabaseDB implements ProductDB {
  private client: JobCoachSupabaseClient;

  constructor() {
    const client = createServerClient();
    if (!client) {
      throw new Error('Supabase persistence requested without full configuration');
    }

    this.client = client;
    logger.info('Job coach Supabase database ready');
  }

  private throwIfError(context: string, error: { message: string } | null) {
    if (!error) return;
    logger.error(`Supabase ${context} failed`, { error: error.message });
    throw new Error(error.message);
  }

  async ensureUser(user: User) {
    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('job_coach_users')
      .upsert(
        [{
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          preferred_locale: 'en',
          created_at: user.createdAt || timestamp,
          updated_at: timestamp,
        }],
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    this.throwIfError('ensureUser', error);
    return mapUserRow(data);
  }

  async getUser(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_users')
      .select('*')
      .eq('id', userId)
      .limit(1);

    this.throwIfError('getUser', error);
    return data?.[0] ? mapUserRow(data[0]) : null;
  }

  async getAllUsers() {
    const { data, error } = await this.client
      .from('job_coach_users')
      .select('*')
      .order('created_at', { ascending: false });

    this.throwIfError('getAllUsers', error);
    return (data || []).map(mapUserRow);
  }

  async deleteUser(userId: string) {
    const { error } = await this.client.from('job_coach_users').delete().eq('id', userId);
    this.throwIfError('deleteUser', error);
  }

  async saveAssessment(
    userId: string,
    responses: Record<string, string>,
    profile: AssessmentProfile,
    options?: {
      scoringVariant?: AssessmentScoringVariant | null;
      scoringConfig?: Partial<AssessmentScoringConfig> | null;
    }
  ) {
    const canonicalResponses = validateAssessmentResponses(responses).canonicalResponses;
    const result = scoreAssessment(
      canonicalResponses,
      profile,
      profile.locale,
      options?.scoringConfig || undefined
    );
    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('job_coach_assessments')
      .insert({
        user_id: userId,
        responses: canonicalResponses,
        profile: result.profile,
        selected_role: result.topRoles[0]?.roleId || null,
        role_scores: result.allScores,
        result_snapshot: result as unknown as Json,
        scoring_version: result.scoringVersion,
        catalog_version: result.catalogVersion,
        scoring_variant: options?.scoringVariant ?? null,
        status: 'completed',
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();

    this.throwIfError('saveAssessment', error);
    return {
      assessment: mapAssessmentRow(data),
      result,
    };
  }

  async getLatestAssessment(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_assessments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    this.throwIfError('getLatestAssessment', error);
    return data?.[0] ? mapAssessmentRow(data[0]) : null;
  }

  async getUserAssessments(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_assessments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    this.throwIfError('getUserAssessments', error);
    return (data || []).map(mapAssessmentRow);
  }

  async saveSelectedRole(userId: string, roleId: RoleId) {
    const latest = await this.getLatestAssessment(userId);
    if (!latest) return null;

    const { data, error } = await this.client
      .from('job_coach_assessments')
      .update({
        selected_role: roleId,
        updated_at: nowIso(),
      })
      .eq('id', latest.id)
      .select('*')
      .single();

    this.throwIfError('saveSelectedRole', error);
    return mapAssessmentRow(data);
  }

  async saveAssessmentFeedback(
    userId: string,
    rating: 'helpful' | 'unhelpful',
    comment: string,
    locale: Locale
  ) {
    const latest = await this.getLatestAssessment(userId);
    if (!latest) return null;

    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('job_coach_assessment_feedback')
      .upsert(
        [{
          user_id: userId,
          assessment_id: latest.id,
          rating,
          comment,
          locale,
          created_at: timestamp,
          updated_at: timestamp,
        }],
        { onConflict: 'user_id,assessment_id' }
      )
      .select('*')
      .single();

    this.throwIfError('saveAssessmentFeedback', error);
    return mapAssessmentFeedbackRow(data);
  }

  async getAssessmentFeedback(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_assessment_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    this.throwIfError('getAssessmentFeedback', error);
    return data?.[0] ? mapAssessmentFeedbackRow(data[0]) : null;
  }

  async saveD1Waitlist(
    userId: string,
    selectedRoleId: RoleId,
    contactConsent: boolean,
    note: string,
    locale: Locale
  ) {
    const latest = await this.getLatestAssessment(userId);
    if (!latest) return null;

    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('job_coach_d1_waitlist')
      .upsert(
        [{
          user_id: userId,
          assessment_id: latest.id,
          selected_role_id: selectedRoleId,
          contact_consent: contactConsent,
          note,
          locale,
          created_at: timestamp,
          updated_at: timestamp,
        }],
        { onConflict: 'user_id,assessment_id' }
      )
      .select('*')
      .single();

    this.throwIfError('saveD1Waitlist', error);
    return mapD1WaitlistRow(data);
  }

  async getD1Waitlist(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_d1_waitlist')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    this.throwIfError('getD1Waitlist', error);
    return data?.[0] ? mapD1WaitlistRow(data[0]) : null;
  }

  async saveFunnelEvent(
    userId: string,
    eventName: string,
    properties: Record<string, Json>,
    locale: Locale
  ) {
    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('job_coach_funnel_events')
      .insert({
        user_id: userId,
        event_name: eventName,
        properties,
        locale,
        created_at: timestamp,
      })
      .select('*')
      .single();

    this.throwIfError('saveFunnelEvent', error);
    return mapFunnelEventRow(data);
  }

  async getFunnelSummary() {
    const [eventsResponse, feedbackResponse, waitlistResponse] = await Promise.all([
      this.client.from('job_coach_funnel_events').select('*').order('created_at', { ascending: true }),
      this.client.from('job_coach_assessment_feedback').select('*').order('created_at', { ascending: true }),
      this.client.from('job_coach_d1_waitlist').select('*').order('created_at', { ascending: true }),
    ]);

    this.throwIfError('getFunnelSummary.events', eventsResponse.error);
    this.throwIfError('getFunnelSummary.feedback', feedbackResponse.error);
    this.throwIfError('getFunnelSummary.waitlist', waitlistResponse.error);

    return buildFunnelSummary(
      (eventsResponse.data || []).map(mapFunnelEventRow),
      (feedbackResponse.data || []).map(mapAssessmentFeedbackRow),
      (waitlistResponse.data || []).map(mapD1WaitlistRow)
    );
  }

  async savePublicShare(
    userId: string,
    input: {
      assessmentId: string;
      publicId: string;
      firstName: string;
      locale: Locale;
      roleId: RoleId;
      roleName: LocalizedText;
      roleSummary: LocalizedText;
      dimensionSnapshot: AssessmentResult['dimensionSnapshot'];
      confidenceBand: AssessmentResult['confidenceBand'];
    }
  ) {
    const latest = await this.getLatestAssessment(userId);
    if (!latest || latest.id !== input.assessmentId) return null;

    const existing = await this.getPublicShare(input.publicId);
    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('job_coach_public_shares')
      .upsert(
        [{
          id: existing?.id,
          user_id: userId,
          assessment_id: input.assessmentId,
          public_id: existing?.publicId || input.publicId,
          first_name: input.firstName,
          locale: input.locale,
          role_id: input.roleId,
          role_name: input.roleName,
          role_summary: input.roleSummary,
          dimension_snapshot: input.dimensionSnapshot,
          confidence_band: input.confidenceBand,
          visit_count: existing?.visitCount || 0,
          created_at: existing?.createdAt || timestamp,
          updated_at: timestamp,
          last_visited_at: existing?.lastVisitedAt || null,
        }],
        { onConflict: 'user_id,assessment_id' }
      )
      .select('*')
      .single();

    this.throwIfError('savePublicShare', error);
    return mapPublicShareRow(data);
  }

  async getPublicShare(publicId: string) {
    const { data, error } = await this.client
      .from('job_coach_public_shares')
      .select('*')
      .eq('public_id', publicId)
      .limit(1);

    this.throwIfError('getPublicShare', error);
    return data?.[0] ? mapPublicShareRow(data[0]) : null;
  }

  async recordPublicShareVisit(publicId: string) {
    const share = await this.getPublicShare(publicId);
    if (!share) return null;

    const { data, error } = await this.client
      .from('job_coach_public_shares')
      .update({
        visit_count: share.visitCount + 1,
        last_visited_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq('public_id', publicId)
      .select('*')
      .single();

    this.throwIfError('recordPublicShareVisit', error);
    return mapPublicShareRow(data);
  }

  async getShareStats() {
    const { data, error } = await this.client
      .from('job_coach_public_shares')
      .select('visit_count');

    this.throwIfError('getShareStats', error);
    const totalShares = data?.length || 0;
    const totalVisits =
      data?.reduce((sum, item) => sum + Number((item as { visit_count?: number }).visit_count || 0), 0) || 0;
    return {
      totalShares,
      totalVisits,
      visitRate: totalShares > 0 ? totalVisits / totalShares : 0,
    };
  }

  async getOrCreateResume(
    userId: string,
    roleId: RoleId,
    profile: AssessmentProfile,
    user?: { name?: string; email?: string }
  ) {
    const existing = await this.getUserResume(userId);
    if (existing) return existing;

    const draft = buildStarterResume(roleId, profile, user);
    return this.createResume(userId, draft);
  }

  async createResume(userId: string, data?: Partial<ResumeDraft>) {
    const resume = emptyResumeRecord(data);
    const timestamp = nowIso();
    const { data: row, error } = await this.client
      .from('job_coach_resumes')
      .insert({
        user_id: userId,
        title: resume.title,
        summary: resume.summary,
        email: resume.email,
        phone: resume.phone,
        location: resume.location,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        certifications: resume.certifications,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();

    this.throwIfError('createResume', error);
    return mapResumeRow(row);
  }

  async getResume(resumeId: string) {
    const { data, error } = await this.client
      .from('job_coach_resumes')
      .select('*')
      .eq('id', resumeId)
      .limit(1);

    this.throwIfError('getResume', error);
    return data?.[0] ? mapResumeRow(data[0]) : null;
  }

  async updateResume(identifier: string, data: Partial<ResumeDraft>) {
    const existing = (await this.getResume(identifier)) || (await this.getUserResume(identifier));
    if (!existing) {
      throw new Error('Resume not found');
    }

    const { data: row, error } = await this.client
      .from('job_coach_resumes')
      .update({
        title: data.title ?? existing.title,
        summary: data.summary ?? existing.summary,
        email: data.email ?? existing.email,
        phone: data.phone ?? existing.phone,
        location: data.location ?? existing.location,
        skills: data.skills ?? existing.skills,
        experience: data.experience ?? existing.experience,
        education: data.education ?? existing.education,
        certifications: data.certifications ?? existing.certifications,
        updated_at: nowIso(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    this.throwIfError('updateResume', error);
    return mapResumeRow(row);
  }

  async getUserResume(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_resumes')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    this.throwIfError('getUserResume', error);
    return data?.[0] ? mapResumeRow(data[0]) : null;
  }

  async getUserApplications(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    this.throwIfError('getUserApplications', error);
    return (data || []).map(mapApplicationRow);
  }

  async createApplication(
    userId: string,
    input: {
      companyName: string;
      roleTitle: string;
      notes: string;
    }
  ) {
    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('job_coach_applications')
      .insert({
        user_id: userId,
        company_name: input.companyName,
        role_title: input.roleTitle,
        status: 'applied',
        application_date: timestamp,
        notes: input.notes,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();

    this.throwIfError('createApplication', error);
    return mapApplicationRow(data);
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: ApplicationRecord['status']
  ) {
    const { data, error } = await this.client
      .from('job_coach_applications')
      .update({
        status,
        updated_at: nowIso(),
      })
      .eq('id', applicationId)
      .eq('user_id', userId)
      .select('*')
      .single();

    this.throwIfError('updateApplicationStatus', error);
    return mapApplicationRow(data);
  }

  async getOrCreatePlan(userId: string, roleId: RoleId, profile: AssessmentProfile) {
    const existing = await this.getUserPlan(userId);
    if (existing) return existing;

    const applicationCount = (await this.getUserApplications(userId)).length;
    const timestamp = nowIso();
    const { data, error } = await this.client
      .from('job_coach_action_plans')
      .insert({
        user_id: userId,
        role_id: roleId,
        week_number: 1,
        tasks: generatePlanTasks(roleId, profile, applicationCount),
        generated_at: timestamp,
        status: 'active',
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*')
      .single();

    this.throwIfError('getOrCreatePlan', error);
    return mapPlanRow(data);
  }

  async updateTask(userId: string, planId: string, taskId: string, completed: boolean) {
    const plan = await this.getUserPlan(userId);
    if (!plan || plan.id !== planId) {
      throw new Error('Plan not found');
    }

    const tasks = plan.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            completed,
            completedAt: completed ? nowIso() : undefined,
          }
        : task
    );

    const { data, error } = await this.client
      .from('job_coach_action_plans')
      .update({
        tasks,
        updated_at: nowIso(),
      })
      .eq('id', planId)
      .eq('user_id', userId)
      .select('*')
      .single();

    this.throwIfError('updateTask', error);
    return mapPlanRow(data);
  }

  async getUserPlan(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_action_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    this.throwIfError('getUserPlan', error);
    return data?.[0] ? mapPlanRow(data[0]) : null;
  }

  async getUserActivePlan(userId: string) {
    return this.getUserPlan(userId);
  }

  async seedReminders(userId: string, locale: Locale, roleId?: RoleId) {
    const { data: existingRows, error: existingError } = await this.client
      .from('job_coach_nudges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    this.throwIfError('seedReminders.select', existingError);

    const existing = (existingRows || []).map(mapReminderRow);
    const roleMatches =
      existingRows?.length &&
      existingRows.every((row) => (row.role_id || null) === (roleId || null));

    if (existing.length && roleMatches) {
      return existing;
    }

    if (existingRows?.length) {
      const { error: deleteError } = await this.client
        .from('job_coach_nudges')
        .delete()
        .eq('user_id', userId);
      this.throwIfError('seedReminders.delete', deleteError);
    }

    const createdAt = nowIso();
    const reminders = buildReminders(roleId, locale);
    const { data, error } = await this.client
      .from('job_coach_nudges')
      .insert(
        reminders.map((item) => ({
          user_id: userId,
          role_id: roleId || null,
          locale,
          title: item.title,
          body: item.body,
          tone: item.tone,
          created_at: createdAt,
        }))
      )
      .select('*');

    this.throwIfError('seedReminders.insert', error);
    return (data || []).map(mapReminderRow);
  }

  async getReminders(userId: string, locale: Locale, roleId?: RoleId) {
    const { data, error } = await this.client
      .from('job_coach_nudges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    this.throwIfError('getReminders', error);
    if (!data?.length) {
      return this.seedReminders(userId, locale, roleId);
    }

    return data.map(mapReminderRow);
  }

  async appendConversation(
    userId: string,
    input: Omit<AgentConversationMessage, 'id' | 'createdAt' | 'userId'>
  ) {
    const { data, error } = await this.client
      .from('job_coach_agent_messages')
      .insert({
        user_id: userId,
        agent_type: input.agentType,
        role: input.role,
        content: input.content,
        locale: input.locale,
        created_at: nowIso(),
      })
      .select('*')
      .single();

    this.throwIfError('appendConversation', error);
    return mapAgentMessageRow(data);
  }

  async getConversation(userId: string) {
    const { data, error } = await this.client
      .from('job_coach_agent_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_type', 'coach')
      .order('created_at', { ascending: false })
      .limit(10);

    this.throwIfError('getConversation', error);
    return (data || []).map(mapAgentMessageRow).reverse();
  }

  async setSession(
    userId: string,
    agentType: AgentSession['agentType'],
    state: Record<string, unknown>
  ) {
    const { data, error } = await this.client
      .from('job_coach_agent_sessions')
      .upsert(
        [{
          id: `${userId}-${agentType}`,
          user_id: userId,
          agent_type: agentType,
          state,
          last_active_at: nowIso(),
        }],
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    this.throwIfError('setSession', error);
    return mapAgentSessionRow(data);
  }

  async getSession(userId: string, agentType: AgentSession['agentType']) {
    const { data, error } = await this.client
      .from('job_coach_agent_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_type', agentType)
      .limit(1);

    this.throwIfError('getSession', error);
    return data?.[0] ? mapAgentSessionRow(data[0]) : null;
  }

  async getDashboardSnapshot(userId: string, locale: Locale) {
    const assessment = await this.getLatestAssessment(userId);
    const selectedRole = assessment?.selectedRole;
    const reminders = await this.getReminders(userId, locale, selectedRole);
    const applications = await this.getUserApplications(userId);
    const plan = await this.getUserPlan(userId);
    const resume = await this.getUserResume(userId);

    return {
      assessment,
      reminders,
      applications,
      plan,
      resume,
      selectedRole,
    };
  }

  async getDashboardStats(userId: string) {
    const snapshot = await this.getDashboardSnapshot(userId, 'en');
    return buildDashboardStats(snapshot);
  }
}

function buildDashboardStats(snapshot: Awaited<ReturnType<ProductDB['getDashboardSnapshot']>>) {
  const appliedCount = snapshot.applications.filter((item) => item.status === 'applied').length;
  const interviewCount = snapshot.applications.filter(
    (item) => item.status === 'interview'
  ).length;
  const offeredCount = snapshot.applications.filter((item) => item.status === 'offered').length;
  const rejectedCount = snapshot.applications.filter(
    (item) => item.status === 'rejected'
  ).length;
  const completedTasks = snapshot.plan?.tasks.filter((task) => task.completed).length || 0;
  const totalTasks = snapshot.plan?.tasks.length || 0;
  const planProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    assessment: snapshot.assessment,
    resume: snapshot.resume,
    applications: {
      total: snapshot.applications.length,
    },
    applicationStats: {
      total: snapshot.applications.length,
      applied: appliedCount,
      interview: interviewCount,
      offered: offeredCount,
      rejected: rejectedCount,
    },
    plan: snapshot.plan,
    planProgress,
  };
}

function buildFunnelSummary(
  events: FunnelEventRecord[],
  feedback: AssessmentFeedbackRecord[],
  waitlist: D1WaitlistRecord[]
): FunnelSummary {
  const eventsByName = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.eventName] = (acc[event.eventName] || 0) + 1;
    return acc;
  }, {});

  const totalEvents = events.length;
  const assessmentStarts = eventsByName.assessment_start || 0;
  const assessmentCompletes = eventsByName.assessment_complete || 0;
  const resultsViewed = eventsByName.results_viewed || 0;
  const resumeClicks = eventsByName.cta_resume_clicked || 0;
  const practiceClicks = eventsByName.cta_practice_clicked || 0;
  const questionsAnsweredByIndex = events.reduce<Record<string, number>>((acc, event) => {
    if (event.eventName !== 'question_answered') {
      return acc;
    }

    const indexValue = event.properties.question_index;
    const index =
      typeof indexValue === 'number' && Number.isFinite(indexValue)
        ? String(Math.trunc(indexValue))
        : null;

    if (index) {
      acc[index] = (acc[index] || 0) + 1;
    }

    return acc;
  }, {});

  const completionRate = assessmentStarts > 0 ? assessmentCompletes / assessmentStarts : 0;

  const helpfulFeedback = feedback.filter((item) => item.rating === 'helpful').length;
  const unhelpfulFeedback = feedback.filter((item) => item.rating === 'unhelpful').length;
  const totalFeedback = feedback.length;

  const consented = waitlist.filter((item) => item.contactConsent).length;

  return {
    totalEvents,
    eventsByName,
    assessmentStarts,
    assessmentCompletes,
    resultsViewed,
    questionsAnsweredByIndex,
    completionRate,
    ctaSplit: {
      resume: resumeClicks,
      practice: practiceClicks,
    },
    feedback: {
      helpful: helpfulFeedback,
      unhelpful: unhelpfulFeedback,
      total: totalFeedback,
    },
    waitlist: {
      total: waitlist.length,
      consented,
    },
  };
}

// Anchored to globalThis (not plain module-level variables) because Next.js dev-mode
// hot-reloading re-evaluates this module on every recompile, which would otherwise wipe
// all in-memory data (users, assessments, resumes, plans, applications) between requests
// that happen to straddle a recompile. globalThis survives module re-evaluation within
// the same Node process. Same fix as the equivalent issue in mock-auth.ts.
declare global {
  // eslint-disable-next-line no-var
  var __dbMemoryInstance: InMemoryDB | undefined;
  // eslint-disable-next-line no-var
  var __dbSupabaseInstance: SupabaseDB | undefined;
}

export function isInMemoryPersistenceAllowed() {
  const override = process.env.ALLOW_IN_MEMORY_DB;

  if (override === 'true') {
    return true;
  }

  if (override === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

export function getPersistenceMode(): 'supabase' | 'memory' | 'unavailable' {
  if (isSupabaseConfigured()) {
    return 'supabase';
  }

  if (isInMemoryPersistenceAllowed()) {
    return 'memory';
  }

  return 'unavailable';
}

export function getDB(): ProductDB {
  if (isSupabaseConfigured()) {
    if (!globalThis.__dbSupabaseInstance) {
      globalThis.__dbSupabaseInstance = new SupabaseDB();
    }
    return globalThis.__dbSupabaseInstance;
  }

  if (!isInMemoryPersistenceAllowed()) {
    throw new Error(
      'Persistent storage is not configured. Configure Supabase or explicitly allow in-memory mode for local QA only.'
    );
  }

  if (!globalThis.__dbMemoryInstance) {
    globalThis.__dbMemoryInstance = new InMemoryDB();
  }

  return globalThis.__dbMemoryInstance;
}
