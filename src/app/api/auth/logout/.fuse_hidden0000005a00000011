import { mockAuth } from '@/lib/mock-auth';
import { success } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isLocalAuthEnabled } from '@/lib/auth-mode';

export async function POST() {
  try {
    logger.info('Logout endpoint called');

    if (!isSupabaseConfigured() && isLocalAuthEnabled()) {
      await mockAuth.logout();
    }

    const response = success(
      { message: 'Logout successful' },
      'Logged out successfully'
    );

    // Clear auth cookie
    response.cookies.delete('auth-token');

    return response;
  } catch (err) {
    logger.error('Logout error', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    const response = success(
      { message: 'Logout completed' },
      'Logged out'
    );
    response.cookies.delete('auth-token');

    return response;
  }
}
