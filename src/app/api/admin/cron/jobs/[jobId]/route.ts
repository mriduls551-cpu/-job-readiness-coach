import { NextRequest } from 'next/server';
import { getCronService } from '@/lib/cron-service';
import { success, error } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/types/api';
import { validateRequest, AdminCronJobToggleSchema } from '@/lib/validation';
import { verifyAdminRequest } from '@/lib/auth/authorization';

/**
 * PUT /api/admin/cron/jobs/:jobId
 * Update cron job (enable/disable)
 * ✅ P0-3: Admin route protection
 * ✅ P0-4: Input validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // P0-3: Verify admin access
    const adminCheck = await verifyAdminRequest(request, 'cron_job_update');
    if (!adminCheck.authorized) {
      return adminCheck.response;
    }
    const requestingUserId = adminCheck.user.id;

    const { jobId } = await params;
    const body = await request.json();

    // P0-4: Validate input with Zod
    const validation = validateRequest(AdminCronJobToggleSchema, { jobId, ...body });
    if (!validation.success) {
      logger.warn('Cron job PUT validation failed', {
        errors: validation.errors,
      });
      return error(
        `Validation failed: ${validation.errors.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }

    const { enabled } = validation.data;

    logger.info('Updating cron job', {
      jobId,
      enabled,
      requestingAdmin: requestingUserId,
    });

    const cronService = getCronService();
    const job = cronService.getJob(jobId);

    if (!job) {
      logger.warn('Cron job not found', { jobId });
      return error('Job not found', HttpStatus.NOT_FOUND);
    }

    // Update job
    job.enabled = enabled;

    logger.info('Cron job updated', {
      jobId,
      enabled,
      requestingAdmin: requestingUserId,
    });

    return success(job, 'Cron job updated');
  } catch (err) {
    logger.error('Failed to update cron job', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return error('Failed to update cron job', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
