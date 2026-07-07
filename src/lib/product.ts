import {
  ASSESSMENT_QUESTIONS,
  BRANCH_QUESTIONS,
  ROLE_ORDER,
  ROLE_DEFINITIONS,
  TIE_BREAKER_QUESTION,
  AssessmentValidationError,
  buildRoleRationale,
  getLocaleValue,
  getNextQuestions,
  pruneOrphanResponses,
  scoreAssessment,
  validateAssessmentResponses,
  type AssessmentProfile,
  type AssessmentQuestion,
  type AssessmentResult,
  type ClusterId,
  type Locale,
  type LocalizedText,
  type RoleDefinition,
  type RoleId,
  type RoleMatch,
} from '@/lib/assessment-engine';
import { getRolePolicy } from '@/lib/matcher/catalog';

export {
  ASSESSMENT_QUESTIONS,
  BRANCH_QUESTIONS,
  ROLE_ORDER,
  ROLE_DEFINITIONS,
  TIE_BREAKER_QUESTION,
  AssessmentValidationError,
  buildRoleRationale,
  getLocaleValue,
  getNextQuestions,
  pruneOrphanResponses,
  scoreAssessment,
  validateAssessmentResponses,
};

export function isActiveRoleId(value: unknown): value is RoleId {
  return typeof value === 'string' && ROLE_ORDER.includes(value as RoleId);
}

export function getRoleCluster(roleId: RoleId): ClusterId {
  const policy = getRolePolicy(roleId);
  if (!policy) throw new Error(`Missing matching policy for ${roleId}`);
  return policy.cluster as ClusterId;
}


export type {
  AssessmentProfile,
  AssessmentQuestion,
  AssessmentResult,
  ClusterId,
  Locale,
  LocalizedText,
  RoleDefinition,
  RoleId,
  RoleMatch,
};

export interface ReminderItem {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  tone: 'info' | 'action' | 'celebration';
}

export interface ResumeDraft {
  title: string;
  summary: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    year: string;
  }>;
  certifications: string[];
}

export interface GeneratedPlanTask {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'project' | 'assessment' | 'networking';
  priority: 'high' | 'medium';
  dueDate: string;
  completed: boolean;
}

function formatEducationStream(stream?: string) {
  if (!stream) return '';
  return stream
    .replace('arts-humanities', 'Arts / Humanities')
    .replace('open-switch', 'General graduate')
    .replace(/-/g, ' ');
}

export function buildStarterResume(
  roleId: RoleId,
  profile: AssessmentProfile,
  user?: { name?: string; email?: string }
): ResumeDraft {
  const role = ROLE_DEFINITIONS[roleId];
  const fullName =
    user?.name ||
    profile.fullName ||
    user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ') ||
    'Candidate';
  const field =
    profile.degreeName || formatEducationStream(profile.educationStream) || 'Graduate';
  const summaryPrefix =
    field.toLowerCase() === 'graduate' ? 'Graduate' : `${field} graduate`;

  return {
    title: `${fullName} - ${role.name.en}`,
    summary: `${summaryPrefix} preparing for ${role.shortLabel.en} roles. Known for ${role.strengths
      .slice(0, 2)
      .map((item) => item.en.toLowerCase())
      .join(' and ')}. Looking for an entry-level opportunity to learn quickly and contribute consistently.`,
    email: user?.email || '',
    phone: '',
    location: profile.city || '',
    skills: role.strengths.map((item) => item.en),
    experience: [],
    education: [
      {
        school: '',
        degree: profile.degreeName || 'Bachelor degree',
        field,
        year: '',
      },
    ],
    certifications: [],
  };
}

export function generatePlanTasks(
  roleId: RoleId,
  profile: AssessmentProfile,
  applicationCount: number
): GeneratedPlanTask[] {
  const role = ROLE_DEFINITIONS[roleId];
  const tasks: GeneratedPlanTask[] = role.starterTasks.map((task, index) => ({
    id: `${roleId}-task-${index + 1}`,
    title: task.en,
    description:
      index === 0
        ? `Start with the highest leverage task for ${role.shortLabel.en}.`
        : `Keep this practical and tied to the jobs you want next.`,
    category: (['skill', 'project', 'assessment'] as const)[index] ?? 'assessment',
    priority: index === 0 ? 'high' : 'medium',
    dueDate: new Date(
      Date.now() + (index + 2) * 24 * 60 * 60 * 1000
    ).toISOString(),
    completed: false,
  }));

  if (applicationCount === 0) {
    tasks.unshift({
      id: `${roleId}-apply-1`,
      title: 'Apply to at least 5 relevant openings this week',
      description:
        profile.city
          ? `Focus on jobs in ${profile.city} plus one nearby relocation market.`
          : 'Focus on realistic entry-level roles instead of random listings.',
      category: 'networking',
      priority: 'high',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      completed: false,
    });
  }

  return tasks;
}

export function buildReminders(
  roleId?: RoleId,
  locale: Locale = 'en'
): ReminderItem[] {
  void locale;
  const role = roleId ? ROLE_DEFINITIONS[roleId] : null;

  const base: ReminderItem[] = [
    {
      id: 'resume-refresh',
      title: {
        en: 'Refresh your resume headline',
        hi: 'अपने जीवनवृत्त का शीर्षक बेहतर बनाएँ',
      },
      body: role
        ? {
            en: `Make sure your resume clearly says ${role.shortLabel.en} instead of a generic "fresher" label.`,
            hi: `ध्यान रखें कि जीवनवृत्त में केवल "नया उम्मीदवार" लिखने के बजाय ${role.shortLabel.hi} स्पष्ट रूप से लिखा हो।`,
          }
        : {
            en: 'Use a role-specific headline before you start applying.',
            hi: 'आवेदन शुरू करने से पहले भूमिका के अनुसार स्पष्ट शीर्षक लिखें।',
          },
      tone: 'action',
    },
    {
      id: 'applications-log',
      title: {
        en: 'Track every application in one place',
        hi: 'हर आवेदन का लेखा एक ही जगह रखें',
      },
      body: {
        en: 'A simple tracker helps you follow up on time instead of applying randomly.',
        hi: 'एक सरल सूची आपको बिना सोचे-समझे आवेदन करने के बजाय सही समय पर अगला संपर्क करने में मदद करती है।',
      },
      tone: 'info',
    },
    {
      id: 'practice-intro',
      title: {
        en: 'Practice your 60-second introduction',
        hi: '60 सेकंड के परिचय का अभ्यास करें',
      },
      body: {
        en: 'Short, clear introductions improve both recruiter calls and interviews.',
        hi: 'छोटा और स्पष्ट परिचय भर्ती संबंधी बातचीत और साक्षात्कार दोनों में उपयोगी होता है।',
      },
      tone: 'celebration',
    },
  ];

  return base.map((item) => ({
    ...item,
    title: {
      en: item.title.en,
      hi: item.title.hi,
    },
    body: {
      en: item.body.en,
      hi: item.body.hi,
    },
  }));
}

export function generateCoachFallbackReply(
  message: string,
  locale: Locale,
  roleId?: RoleId
) {
  const lower = message.toLowerCase();
  const role = roleId ? ROLE_DEFINITIONS[roleId] : null;

  if (lower.includes('resume')) {
    return locale === 'en'
      ? 'Start with a role-specific headline, one clear summary, and 3 to 5 skills that match the jobs you want. I can also help you turn college work or internships into resume bullets.'
      : 'भूमिका के अनुसार स्पष्ट शीर्षक, एक संक्षिप्त परिचय और नौकरी से जुड़े 3 से 5 कौशल लिखकर शुरुआत करें। मैं महाविद्यालय के कार्य या प्रशिक्षण के अनुभव को प्रभावी बिंदुओं में बदलने में भी सहायता कर सकता हूँ।';
  }

  if (lower.includes('interview')) {
    return locale === 'en'
      ? 'For interviews, do not memorize big speeches. Prepare a short self-introduction, 2 examples of responsibility, and 1 example of solving a problem calmly.'
      : 'साक्षात्कार के लिए लंबे उत्तर याद न करें। अपना छोटा परिचय, जिम्मेदारी निभाने के 2 उदाहरण और शांत रहकर समस्या सुलझाने का 1 उदाहरण तैयार करें।';
  }

  if (role) {
    return locale === 'en'
      ? `${role.shortLabel.en} still looks like a strong direction. Your next best move is to sharpen your resume headline, apply to realistic openings, and practice how you explain your strengths.`
      : `${role.shortLabel.hi} अभी भी आपके लिए एक अच्छी दिशा है। अगला उपयोगी कदम है जीवनवृत्त का शीर्षक स्पष्ट करना, उपयुक्त अवसरों पर आवेदन करना और अपनी खूबियों को समझाने का अभ्यास करना।`;
  }

  return locale === 'en'
    ? 'You do not need to figure everything out at once. We can narrow your role fit, tighten your resume, and decide the next 3 actions for this week.'
    : 'आपको सब कुछ एक साथ तय करने की आवश्यकता नहीं है। हम उपयुक्त भूमिका पहचानेंगे, जीवनवृत्त बेहतर करेंगे और इस सप्ताह के अगले 3 कदम तय करेंगे।';
}
