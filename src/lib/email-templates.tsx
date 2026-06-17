import type { CSSProperties, ReactNode } from 'react';
import { render } from '@react-email/render';

const shellStyle: CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  color: '#173235',
  lineHeight: 1.6,
  padding: '24px',
};

const panelStyle: CSSProperties = {
  border: '1px solid #d9e4e2',
  borderRadius: '12px',
  padding: '20px',
  backgroundColor: '#fffdf8',
};

const headingStyle: CSSProperties = {
  color: '#0a5a60',
  margin: '0 0 12px',
};

const mutedStyle: CSSProperties = {
  color: '#5e7476',
};

function EmailShell({ children }: { children: ReactNode }) {
  return (
    <html>
      <body style={shellStyle}>
        <div style={panelStyle}>{children}</div>
      </body>
    </html>
  );
}

async function renderEmail(element: ReactNode) {
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text };
}

export async function renderAssessmentEmailTemplate({
  userName,
  selectedRole,
  score,
}: {
  userName: string;
  selectedRole: string;
  score: number;
}) {
  return renderEmail(
    <EmailShell>
      <h2 style={headingStyle}>Your Career Assessment Results</h2>
      <p>Hi {userName},</p>
      <p>Great news. Based on your assessment, we recommend this role:</p>
      <h3>{selectedRole}</h3>
      <p>
        Your match score: <strong>{score}%</strong>
      </p>
      <p>Next steps:</p>
      <ol>
        <li>Build your resume</li>
        <li>Complete your action plan</li>
        <li>Start applying to jobs</li>
      </ol>
      <p style={mutedStyle}>Good luck with your next step.</p>
    </EmailShell>
  );
}

export async function renderPlanReminderEmailTemplate({
  userName,
  weekNumber,
}: {
  userName: string;
  weekNumber: number;
}) {
  return renderEmail(
    <EmailShell>
      <h2 style={headingStyle}>Your Weekly Action Plan</h2>
      <p>Hi {userName},</p>
      <p>Do not forget to check your action plan for this week.</p>
      <p>Week {weekNumber} tasks:</p>
      <ul>
        <li>Master core skills</li>
        <li>Build a portfolio project</li>
        <li>Practice interview questions</li>
        <li>Network with professionals</li>
      </ul>
      <p style={mutedStyle}>Keep up the steady progress.</p>
    </EmailShell>
  );
}

export async function renderApplicationEmailTemplate({
  userName,
  companyName,
  roleTitle,
}: {
  userName: string;
  companyName: string;
  roleTitle: string;
}) {
  return renderEmail(
    <EmailShell>
      <h2 style={headingStyle}>Application Recorded</h2>
      <p>Hi {userName},</p>
      <p>We have recorded your application to:</p>
      <p>
        <strong>{companyName}</strong> - {roleTitle}
      </p>
      <p>We are tracking this for you and will remind you about follow-ups.</p>
      <p style={mutedStyle}>Good luck with your application.</p>
    </EmailShell>
  );
}
