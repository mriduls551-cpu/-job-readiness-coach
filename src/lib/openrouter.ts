import type {
  AssessmentProfile,
  Locale,
  RoleDefinition,
  RoleMatch,
  RoleId,
} from '@/lib/product';
import {
  buildRoleRationale,
  generateCoachFallbackReply,
  ROLE_DEFINITIONS,
} from '@/lib/product';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

// The user's name never leaves our system — models get only the fields that
// improve the reply (city, degree, constraints). Applies to every payload
// built in this module.
function sanitizeProfileForModel(profile: AssessmentProfile): Omit<AssessmentProfile, 'fullName'> {
  const { fullName: _fullName, ...rest } = profile;
  return rest;
}

function getBaseUrl() {
  return process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
}

function getHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Job Readiness Coach',
  };
}

function getTimeoutMs() {
  const raw = Number(process.env.OPENROUTER_TIMEOUT_MS || 12000);
  return Number.isFinite(raw) && raw > 0 ? raw : 12000;
}

async function callOpenRouter(
  messages: ChatMessage[],
  task: 'chat' | 'rationale' | 'extract'
) {
  const model =
    task === 'chat'
      ? process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini'
      : process.env.OPENROUTER_REASONING_MODEL || 'openai/gpt-4o-mini';

  // Hard cap on generated tokens so a crafted prompt cannot run up cost.
  const maxTokens = task === 'chat' ? 600 : task === 'rationale' ? 800 : 500;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: getHeaders(),
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: task === 'extract' ? 0.2 : 0.5,
        max_tokens: maxTokens,
        messages,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenRouter request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export class OpenRouterService {
  static isConfigured() {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  static async generateRoleExplanations(
    matches: RoleMatch[],
    profile: AssessmentProfile,
    locale: Locale
  ) {
    if (!this.isConfigured() || matches.length === 0) {
      return matches.map((match) => ({
        roleId: match.roleId,
        rationale: buildRoleRationale(
          match.role,
          match.supportingSignals,
          profile,
          locale
        ),
      }));
    }

    try {
      const prompt = [
        {
          role: 'system' as const,
          content:
            locale === 'en'
              ? 'You are a calm career coach for first-generation job seekers in India. Write short, plain-language role explanations. Avoid hype. No markdown.'
              : 'आप भारत में पहली नौकरी खोजने वाले युवाओं के लिए शांत और व्यावहारिक करियर मार्गदर्शक हैं। भूमिकाओं का विवरण छोटी और सरल हिंदी में लिखिए। बढ़ा-चढ़ाकर दावे न करें और मार्कडाउन का उपयोग न करें।',
        },
        {
          role: 'user' as const,
          content: JSON.stringify({
            locale,
            profile: sanitizeProfileForModel(profile),
            matches: matches.map((match) => ({
              role: match.role.name[locale],
              summary: match.role.summary[locale],
              signals: match.supportingSignals.map((signal) => signal[locale]),
            })),
            output: 'Return JSON array of {roleId, rationale}.',
          }),
        },
      ];

      const raw = await callOpenRouter(prompt, 'rationale');
      const parsed = JSON.parse(raw) as Array<{
        roleId: RoleId;
        rationale: string;
      }>;

      return parsed.map((item) => ({
        roleId: item.roleId,
        rationale: {
          en:
            locale === 'en'
              ? item.rationale
              : matches.find((match) => match.roleId === item.roleId)?.rationale.en ||
                item.rationale,
          hi:
            locale === 'hi'
              ? item.rationale
              : matches.find((match) => match.roleId === item.roleId)?.rationale.hi ||
                item.rationale,
        },
      }));
    } catch {
      return matches.map((match) => ({
        roleId: match.roleId,
        rationale: buildRoleRationale(
          match.role,
          match.supportingSignals,
          profile,
          locale
        ),
      }));
    }
  }

  static async chat(
    message: string,
    locale: Locale,
    context: {
      profile?: AssessmentProfile;
      roleId?: RoleId;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    }
  ) {
    if (!this.isConfigured()) {
      return generateCoachFallbackReply(message, locale, context.roleId);
    }

    try {
      const role: RoleDefinition | null = context.roleId
        ? ROLE_DEFINITIONS[context.roleId]
        : null;

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content:
            locale === 'en'
              ? 'You are Job Readiness Coach, a practical and supportive AI coach for entry-level white-collar job seekers in India. Keep replies short, helpful, and realistic. Do not fabricate job openings or legal advice.'
              : 'आप भारत में शुरुआती कार्यालयी नौकरी खोजने वाले युवाओं के लिए सहायक करियर मार्गदर्शक हैं। उत्तर छोटे, उपयोगी और वास्तविक हिंदी में रखें। नौकरी के अवसर या कानूनी सलाह गढ़कर न दें।',
        },
      ];

      if (context.profile) {
        messages.push({
          role: 'system',
          content: JSON.stringify({
            locale,
            profile: sanitizeProfileForModel(context.profile),
            selectedRole: role?.name[locale],
          }),
        });
      }

      for (const item of context.history || []) {
        messages.push({
          role: item.role,
          content: item.content,
        });
      }

      messages.push({
        role: 'user',
        content: message,
      });

      const reply = await callOpenRouter(messages, 'chat');
      return reply || generateCoachFallbackReply(message, locale, context.roleId);
    } catch {
      return generateCoachFallbackReply(message, locale, context.roleId);
    }
  }
}
