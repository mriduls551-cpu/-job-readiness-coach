import { NextRequest } from 'next/server';
import { getEmailService } from '@/lib/email-service';
import { success, error } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/types/api';
import { verifyAdminRequest } from '@/lib/auth/authorization';

/**
 * GET /api/admin/email/logs
 * Get email logs
 * ✅ P0-3: Admin route protection
 */
export async function GET(request: NextRequest) {
  try {
    // P0-3: Verify admin access
    const adminCheck = await verifyAdminRequest(request, 'email_logs');
    if (!adminCheck.authorized) {
      return adminCheck.response;
    }
    const requestingUserId = adminCheck.user.id;

    logger.info('Fetching email logs', { requestingAdmin: requestingUserId });

    const emailService = getEmailService();
    const logs = emailService.getLogs();

    logger.info('Email logs retrieved', {
      totalLogs: logs.length,
      requestingAdmin: requestingUserId,
    });

    return success(logs, 'Email logs retrieved');
  } catch (err) {
    logger.error('Failed to fetch email logs', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return error('Failed to fetch email logs', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * DELETE /api/admin/email/logs
 * Clear all email logs
 * ✅ P0-3: Admin route protection
 */
export async function DELETE(request: NextRequest) {
  try {
    // P0-3: Verify admin access
    const adminCheck = await verifyAdminRequest(request, 'email_logs_deletion');
    if (!adminCheck.authorized) {
      return adminCheck.response;
    }
    const requestingUserId = adminCheck.user.id;

    logger.info('Clearing email logs', { requestingAdmin: requestingUserId });

    const emailService = getEmailService();
    emailService.clearLogs();

    logger.info('Email logs cleared', { requestingAdmin: requestingUserId });

    return success(
      { message: 'Logs cleared', clearedBy: requestingUserId },
      'Email logs cleared'
    );
  } catch (err) {
    logger.error('Failed to clear email logs', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return error('Failed to clear logs', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
