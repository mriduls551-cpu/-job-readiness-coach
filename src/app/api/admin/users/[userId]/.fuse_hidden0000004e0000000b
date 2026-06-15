import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db';
import { success, error } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/types/api';
import { validateRequest, AdminUserDeleteSchema } from '@/lib/validation';
import { verifyAdminRequest } from '@/lib/auth/authorization';

/**
 * DELETE /api/admin/users/:userId
 * Delete a user and all their data
 * ✅ P0-3: Admin route protection
 * ✅ P0-4: Input validation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // P0-3: Verify admin access
    const adminCheck = await verifyAdminRequest(request, 'user_deletion');
    if (!adminCheck.authorized) {
      return adminCheck.response;
    }
    const requestingUserId = adminCheck.user.id;

    const userId = params.userId;

    // P0-4: Validate userId parameter
    const validation = validateRequest(AdminUserDeleteSchema, { userId });
    if (!validation.success) {
      logger.warn('User delete validation failed', {
        errors: validation.errors,
      });
      return error(
        `Validation failed: ${validation.errors.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }

    logger.info('Deleting user', {
      userId: validation.data.userId,
      requestingAdmin: requestingUserId,
    });

    const db = getDB();

    // Verify user exists
    const user = await db.getUser(validation.data.userId);
    if (!user) {
      logger.warn('User not found for deletion', {
        userId: validation.data.userId,
      });
      return error('User not found', HttpStatus.NOT_FOUND);
    }

    // Prevent deleting yourself
    if (requestingUserId === validation.data.userId) {
      logger.warn('Admin attempted to delete themselves', {
        userId: validation.data.userId,
      });
      return error('Cannot delete your own account', HttpStatus.BAD_REQUEST);
    }

    // Delete user (cascade deletes all their data)
    await db.deleteUser(validation.data.userId);

    logger.info('User deleted successfully', {
      deletedUserId: validation.data.userId,
      deletedEmail: user.email,
      deletedByAdmin: requestingUserId,
    });

    return success(
      { message: 'User deleted successfully', deletedUser: user.email },
      'User deleted',
      HttpStatus.OK
    );
  } catch (err) {
    logger.error('Failed to delete user', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return error('Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
