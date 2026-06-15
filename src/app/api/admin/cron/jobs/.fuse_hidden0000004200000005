import { NextRequest } from 'next/server';
import { getCronService } from '@/lib/cron-service';
import { success, error } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/types/api';
import { verifyAdminRequest } from '@/lib/auth/authorization';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/cron/jobs
 * Get all cron jobs
 * ✅ P0-3: Admin route protection
 */
export async function GET(request: NextRequest) {
  try {
    // P0-3: Verify admin access
    const adminCheck = await verifyAdminRequest(request, 'cron_jobs');
    if (!adminCheck.authorized) {
      return adminCheck.response;
    }
    const requestingUserId = adminCheck.user.id;

    logger.info('Fetching cron jobs', { requestingAdmin: requestingUserId });

    const cronService = getCronService();
    const jobs = cronService.getJobs();

    logger.info('Cron jobs retrieved', {
      totalJobs: jobs.length,
      requestingAdmin: requestingUserId,
    });

    return success(jobs, 'Cron jobs retrieved');
  } catch (err) {
    logger.error('Failed to fetch cron jobs', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return error('Failed to fetch cron jobs', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
