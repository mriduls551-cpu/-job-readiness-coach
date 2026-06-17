import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db';
import { createResumePdf } from '@/lib/resume-pdf';
import { resolveRequestUserId } from '@/lib/request-user';
import type { ResumeDraft } from '@/lib/product';

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return new Response('Missing user id', { status: 401 });
  }

  const resume = await getDB().getUserResume(userId);
  if (!resume) {
    return new Response('Resume not found', { status: 404 });
  }

  const pdfBuffer = await createResumePdf(resume as ResumeDraft);

  return new Response(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="job-readiness-resume.pdf"',
    },
  });
}
