import { Resend } from 'resend';
import { logger } from './logger';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

  generateAssessmentEmail(
    userName: string,
    userEmail: string,
    selectedRole: string,
    score: number
  ): EmailOptions {
    const safeUserName = escapeHtml(userName);
    const safeSelectedRole = escapeHtml(selectedRole);
    return {
      to: userEmail,
      subject: sanitizeSubject('Career Assessment Results - You matched ' + selectedRole + '!'),
      html:
        '<h2>Your Career Assessment Results</h2>' +
        '<p>Hi ' + safeUserName + ',</p>' +
        '<p>Great news! Based on your assessment, we recommend the following role:</p>' +
        '<h3>' + safeSelectedRole + '</h3>' +
        '<p>Your match score: <strong>' + score + '%</strong></p>' +
        '<p>Next steps:</p>' +
        '<ol>' +
        '<li>Build your resume</li>' +
        '<li>Complete your action plan</li>' +
        '<li>Start applying to jobs</li>' +
        '</ol>' +
        '<p>Good luck!</p>',
      text: 'Your assessment result: ' + selectedRole + ' (' + score + '%)',
    };
  }

  generatePlanReminderEmail(
    userName: string,
    userEmail: string,
    weekNumber: number
  ): EmailOptions {
    const safeUserName = escapeHtml(userName);
    return {
      to: userEmail,
      subject: sanitizeSubject('Week ' + weekNumber + ' Action Plan Reminder'),
      html:
        '<h2>Your Weekly Action Plan</h2>' +
        '<p>Hi ' + safeUserName + ',</p>' +
        '<p>Do not forget to check your action plan for this week!</p>' +
        '<p>Week ' + weekNumber + ' tasks:</p>' +
        '<ul>' +
        '<li>Master core skills</li>' +
        '<li>Build portfolio project</li>' +
        '<li>Practice interview questions</li>' +
        '<li>Network with professionals</li>' +
        '</ul>' +
        '<p>Keep up the great work!</p>',
      text: 'Reminder: Check your Week ' + weekNumber + ' action plan',
    };
  }

  generateApplicationEmail(
    userName: string,
    userEmail: string,
    companyName: string,
    roleTitle: string
  ): EmailOptions {
    const safeUserName = escapeHtml(userName);
    const safeCompanyName = escapeHtml(companyName);
    const safeRoleTitle = escapeHtml(roleTitle);
    return {
      to: userEmail,
      subject: sanitizeSubject('Application Confirmed - ' + companyName + ' ' + roleTitle),
      html:
        '<h2>Application Recorded</h2>' +
        '<p>Hi ' + safeUserName + ',</p>' +
        '<p>We have recorded your application to:</p>' +
        '<p><strong>' + safeCompanyName + '</strong> - ' + safeRoleTitle + '</p>' +
        '<p>We are tracking this for you and will remind you about follow-ups.</p>' +
        '<p>Good luck with your application!</p>',
      text: 'Application recorded: ' + companyName + ' - ' + roleTitle,
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
