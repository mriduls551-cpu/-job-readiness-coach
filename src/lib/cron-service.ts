import { logger } from './logger';
import { getDB } from './db';
import { getEmailService } from './email-service';

export interface CronJob {
  id: string;
  name: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  lastRun?: string;
  nextRun: string;
  enabled: boolean;
  description: string;
}

/**
 * Mock Cron Service for localhost development
 * In Phase 5, this will be replaced with real cron jobs (node-cron, Bull, etc.)
 * or serverless functions (AWS Lambda, Google Cloud Functions)
 */
class CronService {
  private jobs: Map<string, CronJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeJobs();
  }

  private initializeJobs(): void {
    // Weekly plan reminder job
    this.register({
      id: 'weekly-plan-reminder',
      name: 'Weekly Plan Reminder',
      schedule: 'weekly',
      enabled: true,
      description: 'Send weekly action plan reminders to users',
      nextRun: this.calculateNextRun('weekly'),
    });

    // Application follow-up job
    this.register({
      id: 'app-followup',
      name: 'Application Follow-up',
      schedule: 'weekly',
      enabled: true,
      description: 'Remind users to follow up on pending applications',
      nextRun: this.calculateNextRun('weekly'),
    });

    // Daily digest job
    this.register({
      id: 'daily-digest',
      name: 'Daily Digest',
      schedule: 'daily',
      enabled: true,
      description: 'Send daily progress digest to users',
      nextRun: this.calculateNextRun('daily'),
    });
  }

  private register(job: CronJob): void {
    this.jobs.set(job.id, job);
    logger.info('Cron job registered', { jobId: job.id, schedule: job.schedule });
  }

  private calculateNextRun(schedule: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    const next = new Date(now);

    switch (schedule) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0); // 9 AM next day
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        next.setHours(9, 0, 0, 0); // 9 AM next week
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(9, 0, 0, 0); // 9 AM first day of next month
        break;
    }

    return next.toISOString();
  }

  /**
   * Get all registered cron jobs
   */
  getJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get a specific job
   */
  getJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Execute a cron job immediately
   */
  async execute(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.error('Cron job not found', { jobId });
      return false;
    }

    if (!job.enabled) {
      logger.warn('Cron job disabled', { jobId });
      return false;
    }

    logger.info('Executing cron job', { jobId, name: job.name });

    try {
      switch (jobId) {
        case 'weekly-plan-reminder':
          await this.executeWeeklyPlanReminder();
          break;
        case 'app-followup':
          await this.executeApplicationFollowup();
          break;
        case 'daily-digest':
          await this.executeDailyDigest();
          break;
      }

      // Update last run time
      job.lastRun = new Date().toISOString();
      job.nextRun = this.calculateNextRun(job.schedule);

      logger.info('Cron job completed', { jobId });
      return true;
    } catch (error) {
      logger.error('Cron job failed', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Weekly plan reminder logic
   */
  private async executeWeeklyPlanReminder(): Promise<void> {
    const db = getDB();
    const emailService = getEmailService();

    // Get all users
    const users = await db.getAllUsers();

    for (const user of users) {
      const plan = await db.getUserActivePlan(user.id);
      if (plan) {
        const email = await emailService.generatePlanReminderEmail(
          user.name,
          user.email,
          plan.weekNumber
        );
        await emailService.send(email);
      }
    }
  }

  /**
   * Application follow-up logic
   */
  private async executeApplicationFollowup(): Promise<void> {
    const db = getDB();
    const emailService = getEmailService();

    // Get all users
    const users = await db.getAllUsers();

    for (const user of users) {
      const applications = await db.getUserApplications(user.id);

      // Filter applications that need follow-up (applied > 14 days ago)
      const needsFollowup = applications.filter((app) => {
        const appDate = new Date(app.applicationDate);
        const now = new Date();
        const daysDiff = (now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > 14 && app.status === 'applied';
      });

      if (needsFollowup.length > 0) {
        const subject = `Follow-up: Check on your ${needsFollowup.length} pending application(s)`;
        await emailService.send({
          to: user.email,
          subject,
          html: `
            <h2>Time to Follow Up!</h2>
            <p>Hi ${user.name},</p>
            <p>You have ${needsFollowup.length} application(s) pending for more than 2 weeks.
               Consider following up with the hiring manager!</p>
            <ul>
              ${needsFollowup.map((app) => `<li>${app.companyName} - ${app.roleTitle}</li>`).join('')}
            </ul>
          `,
        });
      }
    }
  }

  /**
   * Daily digest logic
   */
  private async executeDailyDigest(): Promise<void> {
    const db = getDB();
    const emailService = getEmailService();

    // Get all users
    const users = await db.getAllUsers();

    for (const user of users) {
      const stats = await db.getDashboardStats(user.id);

      const email = {
        to: user.email,
        subject: 'Your Daily Progress Digest',
        html: `
          <h2>Today's Progress</h2>
          <p>Hi ${user.name},</p>
          <p>Here's your daily summary:</p>
          <ul>
            <li>Applications: ${stats.applicationStats.total}</li>
            <li>Pending Interviews: ${stats.applicationStats.interview}</li>
            <li>Plan Progress: ${stats.planProgress}%</li>
          </ul>
          <p>Keep up the momentum!</p>
        `,
      };

      await emailService.send(email);
    }
  }

  /**
   * Schedule a job to run at a specific time (for localhost testing)
   */
  scheduleJobForTesting(jobId: string, delayMs: number): void {
    // Clear existing timer if any
    if (this.timers.has(jobId)) {
      clearTimeout(this.timers.get(jobId)!);
    }

    const timer = setTimeout(() => {
      this.execute(jobId);
      this.timers.delete(jobId);
    }, delayMs);

    this.timers.set(jobId, timer);
    logger.info('Job scheduled for testing', { jobId, delayMs });
  }

  /**
   * Cancel a scheduled job
   */
  cancelJob(jobId: string): void {
    if (this.timers.has(jobId)) {
      clearTimeout(this.timers.get(jobId)!);
      this.timers.delete(jobId);
      logger.info('Scheduled job cancelled', { jobId });
    }
  }
}

// Singleton instance
let cronService: CronService | null = null;

export function getCronService(): CronService {
  if (!cronService) {
    cronService = new CronService();
  }
  return cronService;
}
