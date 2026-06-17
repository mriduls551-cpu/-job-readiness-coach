import { NextRequest } from 'next/server';
import { success, error } from '@/lib/api-response';
import { getCronService } from '@/lib/cron-service';
import { verifyCronRequest } from '@/lib/cron-auth';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/types/api';

export const dynamic = 'force-dynamic';

async function executeCronJob(request: NextRequest, jobId: string) {
  const cronCheck = verifyCronRequest(request);
  if (!cronCheck.authorized) {
    return cronCheck.response;
  }

  const cronService = getCronService();
  const job = cronService.getJob(jobId);

  if (!job) {
    return error('Cron job not found', HttpStatus.NOT_FOUND);
  }

  if (!job.enabled) {
    return error('Cron job is disabled', HttpStatus.CONFLICT);
  }

  logger.info('Cron endpoint triggered', {
    jobId,
    source: cronCheck.source,
  });

  const executed = await cronService.execute(jobId);
  const updatedJob = cronService.getJob(jobId);

  if (!executed || !updatedJob?.lastRun) {
    logger.error('Cron endpoint execution failed', {
      jobId,
      source: cronCheck.source,
    });

    return error('Failed to execute cron job', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  return success(
    {
      job: updatedJob,
      source: cronCheck.source,
      executedAt: updatedJob.lastRun,
    },
    'Cron job executed'
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  return executeCronJob(request, jobId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  return executeCronJob(request, jobId);
}
