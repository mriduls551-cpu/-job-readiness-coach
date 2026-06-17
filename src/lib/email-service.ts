import { Resend } from 'resend';
import { logger } from './logger';
import {
  renderApplicationEmailTemplate,
  renderAssessmentEmailTemplate,
  renderPlanReminderEmailTemplate,
} from './email-templates';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed';
  timestamp: string;
  error?: string;
}

function sanitizeSubject(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

class EmailService {
  private logs: EmailLog[] = [];
  private resend: Resend | null = null;
  private fromAddress: string;

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    this.fromAddress =
      process.env.RESEND_FROM_EMAIL || 'Job Readiness Coach <noreply@jobreadinesscoach.in>';
  }

  async send(options: EmailOptions): Promise<boolean> {
    const logEntry: EmailLog = {
      id: `email-${Date.now()}`,
      to: options.to,
      subject: options.subject,
      status: 'sent',
      timestamp: new Date().toISOString(),
    };

    // No API key — log only (dev / local mode)
    if (!this.resend) {
      this.logs.push(logEntry);
      logger.info('[Email mock] Would send email', {
        to: options.to,
        subject: options.subject,
      });
      return true;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logs.push(logEntry);
      logger.info('Email sent via Resend', { to: options.to, subject: options.subject });
      return true;
    } catch (err) {
      const failed: EmailLog = {
        ...logEntry,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
      this.logs.push(failed);
      logger.error('Email failed via Resend', { to: options.to, error: err });
      return false;
    }
  }

  getLogs(): EmailLog[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  async generateAssessmentEmail(
    userName: string,
    userEmail: string,
    selectedRole: string,
    score: number
  ): Promise<EmailOptions> {
    const rendered = await renderAssessmentEmailTemplate({
      userName,
      selectedRole,
      score,
    });
    return {
      to: userEmail,
      subject: sanitizeSubject('Career Assessment Results - You matched ' + selectedRole + '!'),
      html: rendered.html,
      text: rendered.text,
    };
  }

  async generatePlanReminderEmail(
    userName: string,
    userEmail: string,
    weekNumber: number
  ): Promise<EmailOptions> {
    const rendered = await renderPlanReminderEmailTemplate({
      userName,
      weekNumber,
    });
    return {
      to: userEmail,
      subject: sanitizeSubject('Week ' + weekNumber + ' Action Plan Reminder'),
      html: rendered.html,
      text: rendered.text,
    };
  }

  async generateApplicationEmail(
    userName: string,
    userEmail: string,
    companyName: string,
    roleTitle: string
  ): Promise<EmailOptions> {
    const rendered = await renderApplicationEmailTemplate({
      userName,
      companyName,
      roleTitle,
    });
    return {
      to: userEmail,
      subject: sanitizeSubject('Application Confirmed - ' + companyName + ' ' + roleTitle),
      html: rendered.html,
      text: rendered.text,
    };
  }
}

let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}
