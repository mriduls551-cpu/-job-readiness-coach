import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db';
import { getCronService } from '@/lib/cron-service';
import { getEmailService } from '@/lib/email-service';
import { success, error } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/types/api';
import { verifyAdminRequest } from '@/lib/auth/authorization';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 * ✅ P0-3: Admin route protection
 */
export async function GET(request: NextRequest) {
  try {
    // P0-3: Verify admin access
    const adminCheck = await verifyAdminRequest(request, 'admin_stats');
    if (!adminCheck.authorized) {
      return adminCheck.response;
    }
    const requestingUserId = adminCheck.user.id;

    logger.info('Fetching admin stats', { requestingAdmin: requestingUserId });

    const db = getDB();
    const cronService = getCronService();
    const emailService = getEmailService();

    // Get user count
    const users = await db.getAllUsers();
    const totalUsers = users.length;

    // Get assessment count
    let totalAssessments = 0;
    for (const user of users) {
      const assessments = await db.getUserAssessments(user.id);
      totalAssessments += assessments.filter((a) => a.status === 'completed').length;
    }

    // Get application count
    let totalApplications = 0;
    for (const user of users) {
      const applications = await db.getUserApplications(user.id);
      totalApplications += applications.length;
    }

    // Get email logs
    const emailLogs = emailService.getLogs();
    const emailsSent = emailLogs.filter((log) => log.status === 'sent').length;
    const funnel = await db.getFunnelSummary();
    const share = await db.getShareStats();

    // Get cron jobs status
    const cronJobs = cronService.getJobs();
    const cronJobsStatus = cronJobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.enabled ? 'enabled' : 'disabled',
      lastRun: job.lastRun,
    }));

    const stats = {
      totalUsers,
      totalAssessments,
      totalApplications,
      emailsSent,
      funnel,
      share,
      cronJobsStatus,
    };

    logger.info('Admin stats retrieved', {
      ...stats,
      requestingAdmin: requestingUserId,
    });

    return success(stats, 'Admin stats retrieved');
  } catch (err) {
    logger.error('Failed to fetch admin stats', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return error('Failed to fetch admin stats', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
