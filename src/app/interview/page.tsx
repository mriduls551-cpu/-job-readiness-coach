'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getStoredLocale,
} from '@/lib/client-session';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import {
  ROLE_DEFINITIONS,
  getRoleCluster,
  getLocaleValue,
  type Locale,
  type LocalizedText,
  type RoleId,
} from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';

interface ApplicationItem {
  id: string;
  companyName: string;
  roleTitle: string;
  status: 'applied' | 'interview' | 'offered' | 'rejected';
  applicationDate: string;
  notes: string;
}

interface InterviewPack {
  focus: LocalizedText;
  questions: LocalizedText[];
  stories: LocalizedText[];
  checklist: LocalizedText[];
}

function t(en: string, hi: string): LocalizedText {
  return { en, hi };
}

function getInterviewPack(roleId: RoleId): InterviewPack {
  const roleCluster = getRoleCluster(roleId);
  const peopleFacingRoles: RoleId[] = [
    'customer-support',
    'sales-support',
    'academic-counsellor',
    'hr-coordinator',
  ];
  const operationsRoles: RoleId[] = [
    'data-entry-mis',
    'back-office-operations',
    'operations-analyst',
  ];
  const accuracyRoles: RoleId[] = [
    'accounting-finance-assistant',
    'legal-compliance-operations',
  ];
  const growthRoles: RoleId[] = [
    'digital-marketing-executive',
    'content-writer',
  ];

  if (peopleFacingRoles.includes(roleId) || roleCluster === 'people-facing') {
    return {
      focus: t(
        'Show calm communication, follow-through, and trust-building.',
        'शांत संवाद, काम पूरा करने की निरंतरता और भरोसा बनाने की क्षमता दिखाइए।'
      ),
      questions: [
        t('How do you handle an upset customer or student?', 'यदि कोई ग्राहक या विद्यार्थी परेशान हो, तो आप स्थिति को कैसे संभालेंगे?'),
        t('Tell us about a time you explained something clearly.', 'ऐसा समय बताइए जब आपने कुछ साफ तरीके से समझाया हो।'),
        t('How do you follow up when someone does not respond?', 'यदि कोई उत्तर न दे, तो आप दोबारा संपर्क कैसे करेंगे?'),
      ],
      stories: [
        t('One example of calming someone down.', 'किसी परेशान व्यक्ति को शांत करने का एक उदाहरण।'),
        t('One example of solving a small issue with patience.', 'धैर्य के साथ छोटी समस्या सुलझाने का एक उदाहरण।'),
        t('One example of staying organized while talking to people.', 'लोगों से बातचीत करते समय व्यवस्थित रहने का एक उदाहरण।'),
      ],
      checklist: [
        t('Practice a 60-second introduction out loud.', '60 सेकंड के परिचय को बोलकर अभ्यास करें।'),
        t('Prepare 3 examples that prove communication strength.', 'अच्छे संवाद कौशल को दिखाने वाले 3 उदाहरण तैयार करें।'),
        t('Keep one short reason ready for why this role fits you.', 'यह भूमिका आपके लिए क्यों उपयुक्त है, इसका एक संक्षिप्त कारण तैयार रखें।'),
      ],
    };
  }

  if (operationsRoles.includes(roleId) || roleCluster === 'desk-ops') {
    return {
      focus: t(
        'Show process clarity, ownership, and attention to detail.',
        'प्रक्रिया की स्पष्टता, जिम्मेदारी और विवरण पर ध्यान दिखाइए।'
      ),
      questions: [
        t('How do you keep track of repetitive tasks without missing details?', 'बार-बार होने वाले कार्यों में विवरण छूटे बिना आप उनका लेखा कैसे रखते हैं?'),
        t('Tell us about a time you improved a process or organized work better.', 'ऐसा अनुभव बताइए जब आपने किसी प्रक्रिया को बेहतर या काम को अधिक व्यवस्थित किया हो।'),
        t('What would you do if a report or tracker had wrong information?', 'यदि किसी रिपोर्ट या सूची में गलत जानकारी हो, तो आप क्या करेंगे?'),
      ],
      stories: [
        t('One example of cleaning up a messy process.', 'अव्यवस्थित प्रक्रिया को सुधारने का एक उदाहरण।'),
        t('One example of working with accuracy under deadlines.', 'समय सीमा में भी सटीकता बनाए रखने का एक उदाहरण।'),
        t('One example of following a system consistently.', 'किसी व्यवस्था का लगातार पालन करने का एक उदाहरण।'),
      ],
      checklist: [
        t('Review one tracker, spreadsheet, or reporting example from your background.', 'अपने अनुभव से किसी सूची, गणना-पत्र या रिपोर्ट का एक उदाहरण दोहराएँ।'),
        t('Prepare to explain your work step by step.', 'अपने काम को क्रमवार समझाने की तैयारी करें।'),
        t('Use simple language when describing process ownership.', 'किसी प्रक्रिया की जिम्मेदारी समझाते समय सरल भाषा का उपयोग करें।'),
      ],
    };
  }

  if (accuracyRoles.includes(roleId) || roleCluster === 'analytical') {
    return {
      focus: t(
        'Show accuracy, documentation discipline, and careful review habits.',
        'सटीकता, दस्तावेज़ों में अनुशासन और सावधानी से जाँचने की आदत दिखाइए।'
      ),
      questions: [
        t('How do you make sure your work stays accurate?', 'आप अपने काम की सटीकता कैसे सुनिश्चित करते हैं?'),
        t('Tell us about a time you checked records or caught an error.', 'ऐसा अनुभव बताइए जब आपने अभिलेख जाँचे हों या कोई गलती पकड़ी हो।'),
        t('How do you handle confidential or sensitive information?', 'आप गोपनीय या संवेदनशील जानकारी को कैसे संभालते हैं?'),
      ],
      stories: [
        t('One example of careful checking or reconciliation.', 'सावधानी से जाँच या मिलान करने का एक उदाहरण।'),
        t('One example of working with rules or documentation.', 'नियमों या दस्तावेज़ों के अनुसार काम करने का एक उदाहरण।'),
        t('One example of staying calm with detail-heavy work.', 'बहुत अधिक विवरण वाले काम में शांत रहने का एक उदाहरण।'),
      ],
      checklist: [
        t('Be ready to explain how you double-check your work.', 'अपने काम की दोबारा जाँच कैसे करते हैं, यह समझाने के लिए तैयार रहें।'),
        t('Use examples that show trustworthiness and consistency.', 'विश्वसनीयता और निरंतरता दिखाने वाले उदाहरण दें।'),
        t('Keep answers structured and short.', 'उत्तर क्रमबद्ध और संक्षिप्त रखें।'),
      ],
    };
  }

  if (growthRoles.includes(roleId) || roleCluster === 'creative') {
    return {
      focus: t(
        'Show audience understanding, ideas, and practical execution.',
        'दर्शकों की समझ, अच्छे विचार और व्यावहारिक क्रियान्वयन दिखाइए।'
      ),
      questions: [
        t('How would you create content or campaigns for the right audience?', 'सही दर्शकों के लिए सामग्री या प्रचार अभियान कैसे बनाएँगे?'),
        t('Tell us about something you wrote, promoted, or improved.', 'ऐसी सामग्री बताइए जिसे आपने लिखा, प्रचारित या बेहतर किया हो।'),
        t('How do you know if a piece of content or campaign worked?', 'आप कैसे जानेंगे कि कोई सामग्री या प्रचार अभियान सफल रहा?'),
      ],
      stories: [
        t('One example of writing or communication work you are proud of.', 'लेखन या संवाद से जुड़े ऐसे काम का उदाहरण जिस पर आपको गर्व हो।'),
        t('One example of learning from feedback quickly.', 'सुझाव से जल्दी सीखने का एक उदाहरण।'),
        t('One example of turning an idea into an outcome.', 'किसी विचार को परिणाम में बदलने का एक उदाहरण।'),
      ],
      checklist: [
        t('Keep 2 work samples or project examples ready.', 'काम या परियोजना के 2 उदाहरण तैयार रखें।'),
        t('Talk about audience, message, and result in one flow.', 'दर्शक, संदेश और परिणाम को एक क्रम में समझाएँ।'),
        t('Avoid vague creative answers and stay practical.', 'अस्पष्ट रचनात्मक उत्तरों से बचें और व्यावहारिक रहें।'),
      ],
    };
  }

  return {
    focus: t(
      'Show steady judgment, practical examples, and clear communication.',
      'स्थिर निर्णय क्षमता, व्यावहारिक उदाहरण और स्पष्ट संवाद दिखाइए।'
    ),
    questions: [
      t('Why does this role fit your strengths right now?', 'यह भूमिका अभी आपकी खूबियों के लिए क्यों उपयुक्त है?'),
      t('Tell us about a time you stayed responsible and consistent.', 'ऐसा अनुभव बताइए जब आपने जिम्मेदारी और निरंतरता बनाए रखी हो।'),
      t('How do you learn quickly in a new environment?', 'नए वातावरण में आप जल्दी कैसे सीखते हैं?'),
    ],
    stories: [
      t('One example of taking ownership.', 'जिम्मेदारी लेने का एक उदाहरण।'),
      t('One example of problem-solving calmly.', 'शांत तरीके से समस्या सुलझाने का एक उदाहरण।'),
      t('One example of learning and improving fast.', 'जल्दी सीखने और सुधार करने का एक उदाहरण।'),
    ],
    checklist: [
      t('Prepare short answers, not long speeches.', 'लंबे भाषणों के बजाय संक्षिप्त उत्तर तैयार करें।'),
      t('Stay close to real examples from study, internship, or projects.', 'पढ़ाई, प्रशिक्षण या परियोजनाओं के वास्तविक उदाहरणों का उपयोग करें।'),
      t('Connect your answers back to the selected role.', 'अपने उत्तरों को चुनी हुई भूमिका से जोड़ें।'),
    ],
  };
}

export default function InterviewPage() {
  const { user, loading } = useCurrentUser({ requireAuth: true });
  const {
    assessment,
    selectedRoleId,
    loading: assessmentLoading,
  } = useAssessmentState();
  const [locale, setLocale] = useState<Locale>('en');
  const [applications, setApplications] = useState<ApplicationItem[]>([]);

  useEffect(() => {
    setLocale(getStoredLocale());

    if (!user) {
      return;
    }

    const loadApplications = async () => {
      const response = await fetch('/api/applications');
      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: { applications: ApplicationItem[] };
      };
      setApplications(payload.data?.applications || []);
    };

    void loadApplications();
  }, [user]);

  const selectedRole = selectedRoleId ? ROLE_DEFINITIONS[selectedRoleId] : null;
  const pack = selectedRole ? getInterviewPack(selectedRole.id) : null;
  const interviewApplications = applications.filter((item) => item.status === 'interview');
  const topMatch = assessment?.topRoles?.find((item) => item.roleId === selectedRoleId) || assessment?.topRoles?.[0] || null;

  const introPrompt = useMemo(() => {
    if (!selectedRole) {
      return locale === 'en'
        ? 'I am a graduate looking for an entry-level role where I can learn fast, stay reliable, and contribute consistently.'
        : 'मैं स्नातक हूँ और ऐसी शुरुआती भूमिका खोज रहा/रही हूँ जहाँ मैं जल्दी सीख सकूँ, भरोसेमंद रहूँ और लगातार अच्छा योगदान दे सकूँ।';
    }

    return locale === 'en'
      ? `I am preparing for ${selectedRole.shortLabel.en} roles. My strengths are ${selectedRole.strengths
          .slice(0, 2)
          .map((item) => item.en.toLowerCase())
          .join(' and ')}, and I work best when expectations are clear and I can keep work moving.`
      : `मैं ${selectedRole.shortLabel.hi} roles के लिए तैयारी कर रहा/रही हूँ। मेरी strengths ${selectedRole.strengths
          .slice(0, 2)
          .map((item) => item.hi)
          .join(' और ')} हैं, और मैं तब सबसे अच्छा काम करता/करती हूँ जब expectations clear हों और मैं काम को आगे बढ़ा सकूँ।`;
  }, [locale, selectedRole]);

  if (loading || assessmentLoading) {
    return (
      <FullPageLoader
        eyebrow="Interview prep"
        title="Loading your prep workspace…"
        message="We’re checking your selected role, assessment context, and applications."
      />
    );
  }

  if (!user) {
    return (
      <FullPageLoader
        eyebrow="Interview prep"
        title="Redirecting to sign in…"
        message="Your prep workspace is saved inside your account."
      />
    );
  }

  if (!selectedRole || !pack) {
    return (
      <main className="section-shell">
        <div className="container-main max-w-3xl">
          <section className="workspace-hero">
            <p className="eyebrow-copy">
              {locale === 'en' ? 'Interview prep' : 'साक्षात्कार की तैयारी'}
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-strong)]">
              {locale === 'en'
                ? 'Choose a role first so your interview prep stays specific.'
                : 'पहले एक भूमिका चुनें, ताकि साक्षात्कार की तैयारी उसी के अनुसार हो।'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
              {locale === 'en'
                ? 'This prep workspace works best after your fit check and role selection.'
                : 'यह तैयारी योग्यता जाँच पूरी करने और भूमिका चुनने के बाद सबसे अधिक उपयोगी होती है।'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/results">
                {locale === 'en' ? 'Choose a role from results' : 'परिणामों में से एक भूमिका चुनें'}
              </Link>
              <Link className="btn-outline" href="/career-fit-check">
                {locale === 'en' ? 'Go to fit check' : 'योग्यता जाँच पर जाएँ'}
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="section-shell">
      <div className="container-main space-y-6">
        <section className="workspace-hero">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Interview prep' : 'साक्षात्कार की तैयारी'}
              </p>
              <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-strong)] sm:text-5xl">
                {locale === 'en'
                  ? `Prepare for ${selectedRole.shortLabel.en} interviews with one clear story.`
                  : `${selectedRole.shortLabel.hi} interviews के लिए एक clear story तैयार करें।`}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                {pack.focus[locale]}
              </p>
            </div>

            <div className="story-card max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Selected role' : 'चुनी हुई भूमिका'}
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--accent-ink)]">
                {getLocaleValue(selectedRole.shortLabel, locale)}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {topMatch ? getLocaleValue(topMatch.strengthLabel, locale) : '--'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Interview-stage applications' : 'साक्षात्कार तक पहुँचे आवेदन'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
                {interviewApplications.length}
              </p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Stories to prepare' : 'तैयार करने योग्य उदाहरण'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
                {pack.stories.length}
              </p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Role strengths' : 'भूमिका से जुड़ी खूबियाँ'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
                {selectedRole.strengths.length}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="space-y-5">
            <div className="route-shell bg-white/90">
              <p className="eyebrow-copy">
                {locale === 'en' ? '60-second introduction' : '60 सेकंड का परिचय'}
              </p>
              <p className="step-panel mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                {introPrompt}
              </p>
            </div>

            <div className="route-shell space-y-4 bg-white/90">
              <h2 className="text-3xl text-[var(--ink-strong)]">
                {locale === 'en' ? 'Questions to practice' : 'अभ्यास के प्रश्न'}
              </h2>
              {pack.questions.map((question) => (
                <div
                  className="step-panel"
                  key={question.en}
                >
                  <p className="font-semibold text-[var(--ink-strong)]">{question[locale]}</p>
                </div>
              ))}
            </div>

            <div className="route-shell space-y-4 bg-white/90">
              <h2 className="text-3xl text-[var(--ink-strong)]">
                {locale === 'en' ? 'Stories to prepare' : 'तैयार करने योग्य उदाहरण'}
              </h2>
              {pack.stories.map((story, index) => (
                <div className="flex gap-3" key={story.en}>
                  <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-ink)] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">{story[locale]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="route-shell bg-white/90">
              <p className="eyebrow-copy">
                {locale === 'en' ? 'What to emphasize' : 'किन बातों पर ज़ोर दें'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedRole.strengths.map((strength) => (
                  <span className="accent-chip" key={strength.en}>
                    {getLocaleValue(strength, locale)}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                {getLocaleValue(selectedRole.summary, locale)}
              </p>
            </div>

            <div className="route-shell bg-white/90">
              <h2 className="text-3xl text-[var(--ink-strong)]">
                {locale === 'en' ? 'Before the interview' : 'साक्षात्कार से पहले'}
              </h2>
              <div className="mt-4 space-y-3">
                {pack.checklist.map((item, index) => (
                  <div
                    className="step-panel flex gap-3"
                    key={item.en}
                  >
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-saffron)] text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">{item[locale]}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="route-shell bg-white/90">
              <h2 className="text-3xl text-[var(--ink-strong)]">
                {locale === 'en' ? 'Interview pipeline' : 'साक्षात्कार की स्थिति'}
              </h2>
              {interviewApplications.length ? (
                <div className="mt-4 space-y-3">
                  {interviewApplications.map((application) => (
                    <div
                      className="step-panel"
                      key={application.id}
                    >
                      <p className="font-semibold text-[var(--ink-strong)]">{application.companyName}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{application.roleTitle}</p>
                      {application.notes ? (
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-muted)]">
                          {application.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                  {locale === 'en'
                    ? 'No applications are marked as interview-stage yet. Use this page to prepare before that first recruiter call or interview round.'
                    : 'अभी कोई आवेदन साक्षात्कार चरण में दर्ज नहीं है। पहली भर्ती संबंधी बातचीत या साक्षात्कार से पहले तैयारी के लिए इस पृष्ठ का उपयोग करें।'}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link className="btn-primary" href="/applications">
                {locale === 'en' ? 'Open applications tracker' : 'आवेदन सूची खोलें'}
              </Link>
              <Link className="btn-outline" href="/resume">
                {locale === 'en' ? 'Refine resume' : 'जीवनवृत्त बेहतर बनाएँ'}
              </Link>
              <Link className="btn-secondary" href="/plan">
                {locale === 'en' ? 'Continue weekly plan' : 'साप्ताहिक योजना पर जाएँ'}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
