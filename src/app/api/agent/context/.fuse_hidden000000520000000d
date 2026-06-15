import { NextRequest } from 'next/server';
import { success } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { resolveRequestUserId } from '@/lib/request-user';

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return success({ messages: [] });
  }
  const messages = await getDB().getConversation(userId);

  return success({
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })),
  });
}
