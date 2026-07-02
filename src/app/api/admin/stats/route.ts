import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db';
import { getCronService } from '@/lib/cron-service';
import { getEmailService } from '@/lib/email-service';
import { success, error } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/types/api';
import { verifyAdminRequest } from '@/lib/auth/authorization';
import type { AssessmentFeedback } from '@/lib/product';

export const dynamic = 'force-dynamic';

type AssessmentClusterStats = {
  cluster: string;
  count: number;
  share: number;
};

type AssessmentFeedbackStats = {
  responses: number;
  rate: number;
  breakdown: Record<AssessmentFeedback, number>;
};

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
    const clusterCounts = new Map<string, number>();
    const feedbackBreakdown: Record<AssessmentFeedback, number> = {
      yes: 0,
      somewhat: 0,
      no: 0,
    };
    let feedbackResponses = 0;
    for (const user of users) {
      const assessments = await db.getUserAssessments(user.id);
      const completedAssessments = assessments.filter((assessment) => assessment.status === 'completed');
      totalAssessments += completedAssessments.length;

      for (const assessment of completedAssessments) {
        const cluster = assessment.resultSnapshot?.cluster || 'unknown';
        clusterCounts.set(cluster, (clusterCounts.get(cluster) || 0) + 1);

        if (assessment.feedback) {
          feedbackBreakdown[assessment.feedback] += 1;
          feedbackResponses += 1;
        }
      }
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

    // Get cron jobs status
    const cronJobs = cronService.getJobs();
    const cronJobsStatus = cronJobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.enabled ? 'enabled' : 'disabled',
      lastRun: job.lastRun,
    }));

    const clusterDistribution: AssessmentClusterStats[] = Array.from(clusterCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([cluster, count]) => ({
        cluster,
        count,
        share: totalAssessments > 0 ? count / totalAssessments : 0,
      }));

    const feedbackStats: AssessmentFeedbackStats = {
      responses: feedbackResponses,
      rate: totalAssessments > 0 ? feedbackResponses / totalAssessments : 0,
      breakdown: feedbackBreakdown,
    };

    const stats = {
      totalUsers,
      totalAssessments,
      totalApplications,
      emailsSent,
      clusterDistribution,
      feedbackStats,
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
