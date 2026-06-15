import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db';
import { createSimplePdf } from '@/lib/pdf';
import { resolveRequestUserId } from '@/lib/request-user';

function buildResumeLines(resume: Awaited<ReturnType<ReturnType<typeof getDB>['getUserResume']>>) {
  if (!resume) return [];

  const lines = [
    resume.title,
    '',
    `${resume.email} ${resume.phone ? `| ${resume.phone}` : ''}`,
    resume.location,
    '',
    'Summary',
    resume.summary,
    '',
    'Skills',
    resume.skills.join(', '),
    '',
    'Experience',
    ...resume.experience.flatMap((item) => [
      `${item.role} - ${item.company}`,
      `${item.duration}`,
      item.description,
      '',
    ]),
    'Education',
    ...resume.education.flatMap((item) => [
      `${item.degree} - ${item.school}`,
      `${item.field} | ${item.year}`,
      '',
    ]),
  ];

  return lines.filter(Boolean);
}

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return new Response('Missing user id', { status: 401 });
  }

  const resume = await getDB().getUserResume(userId);
  if (!resume) {
    return new Response('Resume not found', { status: 404 });
  }

  const pdfBytes = createSimplePdf(buildResumeLines(resume));

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="job-readiness-resume.pdf"',
    },
  });
}
