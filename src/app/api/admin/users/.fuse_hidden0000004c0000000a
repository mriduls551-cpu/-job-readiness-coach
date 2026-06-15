import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db';
import { success, error } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/types/api';
import { verifyAdminRequest } from '@/lib/auth/authorization';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Get all users (admin only)
 * ✅ P0-3: Admin route protection
 */
export async function GET(request: NextRequest) {
  try {
    // P0-3: Verify admin access (middleware + extra check)
    const adminCheck = await verifyAdminRequest(request, 'users_list');
    if (!adminCheck.authorized) {
      return adminCheck.response;
    }
    const requestingUserId = adminCheck.user.id;

    logger.info('Fetching all users for admin', { requestingUserId });

    const db = getDB();
    const users = await db.getAllUsers();

    const userData = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));

    logger.info('Users list retrieved', {
      requestingUserId,
      totalUsers: userData.length,
    });

    return success(userData, 'Users retrieved');
  } catch (err) {
    logger.error('Failed to fetch users', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return error('Failed to fetch users', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
