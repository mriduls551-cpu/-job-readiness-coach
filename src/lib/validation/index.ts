/**
 * Input Validation Schemas using Zod
 * Ensures all API inputs are properly typed and safe
 */

import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// ASSESSMENT SCHEMAS
// ============================================================================

export const assessmentSchema = z.object({
  type: z.enum(['career_fit', 'quick_check']),
  responses: z.record(z.any()),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const completeAssessmentSchema = z.object({
  id: z.string().uuid('Invalid assessment ID'),
  roleScores: z.record(z.number()),
  selectedRole: z.string().min(1, 'Selected role is required'),
});

export type CompleteAssessmentInput = z.infer<typeof completeAssessmentSchema>;

// ============================================================================
// RESUME SCHEMAS
// ============================================================================

export const resumeSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
  certifications: z.array(z.string()).optional(),
  projects: z.array(z.any()).optional(),
});

export type ResumeInput = z.infer<typeof resumeSchema>;

// ============================================================================
// APPLICATION SCHEMAS
// ============================================================================

export const applicationSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  role_title: z.string().min(1, 'Role title is required'),
  status: z.enum(['applied', 'interview', 'offered', 'rejected']).optional(),
  notes: z.string().optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export const updateApplicationStatusSchema = z.object({
  id: z.string().uuid('Invalid application ID'),
  status: z.enum(['applied', 'interview', 'offered', 'rejected']),
});

export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;

// ============================================================================
// ACTION PLAN SCHEMAS
// ============================================================================

export const actionPlanSchema = z.object({
  week_number: z.number().int().positive('Week number must be positive'),
  tasks: z.array(z.object({
    task: z.string(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    completed: z.boolean().optional(),
  })),
});

export type ActionPlanInput = z.infer<typeof actionPlanSchema>;

// ============================================================================
// LEGACY COMPATIBILITY SCHEMAS
// ============================================================================

export const ResumeGetSchema = z.object({
  userId: z.string().min(1, 'User id is required'),
});

export const ResumeSchema = z.object({
  userId: z.string().min(1, 'User id is required'),
  resumeId: z.string().min(1, 'Resume id is required'),
  title: z.string().optional(),
  summary: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
  certifications: z.array(z.string()).optional(),
  projects: z.array(z.any()).optional(),
});

export const ResumeAutoGenerateSchema = z.object({
  userId: z.string().min(1, 'User id is required'),
  roleId: z.string().min(1, 'Role id is required'),
});

export const AdminUserDeleteSchema = z.object({
  userId: z.string().min(1, 'User id is required'),
});

export const AdminCronJobToggleSchema = z.object({
  jobId: z.string().min(1, 'Job id is required'),
  enabled: z.boolean(),
});

export const AdminCronJobExecuteSchema = z.object({
  jobId: z.string().min(1, 'Job id is required'),
});

// ============================================================================
// VALIDATION HELPER FUNCTION
// ============================================================================

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: message };
    }
    return { success: false, error: 'Validation failed' };
  }
}

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    const parsed = schema.parse(data);
    return {
      success: true as const,
      data: parsed,
      errors: [] as string[],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        errors: error.errors.map(
          (item) => `${item.path.join('.') || 'request'}: ${item.message}`
        ),
      };
    }

    return {
      success: false as const,
      errors: ['Validation failed'],
    };
  }
}
