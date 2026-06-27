'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getStoredLocale,
  getStoredResumeDraft,
  persistSelectedRole,
  setStoredResumeDraft,
} from '@/lib/client-session';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import {
  ROLE_DEFINITIONS,
  buildStarterResume,
  getLocaleValue,
  type Locale,
  type ResumeDraft,
} from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';
import { captureProductEvent } from '@/lib/analytics';
import {
  formatIndianPhoneInput,
  isValidIndianPhoneNumberOrEmpty,
} from '@/lib/phone';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function emptyResume(): ResumeDraft {
  return {
    title: '',
    summary: '',
    email: '',
    phone: '',
    location: '',
    skills: [],
    experience: [
      {
        company: '',
        role: '',
        duration: '',
        description: '',
      },
    ],
    education: [
      {
        school: '',
        degree: '',
        field: '',
        year: '',
      },
    ],
    certifications: [],
  };
}

export default function ResumePage() {
  const { user, loading } = useCurrentUser({ requireAuth: true });
  const {
    assessment,
    selectedRoleId,
    loading: assessmentLoading,
  } = useAssessmentState();
  const [locale, setLocale] = useState<Locale>('en');
  const [resume, setResume] = useState<ResumeDraft | null>(null);
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: 'experience' | 'education'; index: number } | null>(null);

  useEffect(() => {
    const nextLocale = getStoredLocale();

    setLocale(nextLocale);

    if (!user) {
      return;
    }

    const initialize = async () => {
      const existingResponse = await fetch('/api/resumes');

        if (existingResponse.ok) {
          const existingPayload = (await existingResponse.json()) as {
            data?: { resume: ResumeDraft | null };
          };
          if (existingPayload.data?.resume) {
            setResume(existingPayload.data.resume);
            setStoredResumeDraft(existingPayload.data.resume);
            setSaveState('saved');
            setStatusMessage(
              nextLocale === 'en'
                ? 'Saved to your workspace.'
                : 'आपके कार्यस्थल में सुरक्षित हो गया।'
            );
            setIsLoaded(true);
            return;
          }
        }

      if (assessment && selectedRoleId) {
          const initResponse = await fetch('/api/resumes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roleId: selectedRoleId,
              profile: {
                ...assessment.profile,
                locale: nextLocale,
              },
              user: {
                name: user.name,
                email: user.email,
              },
            }),
          });

          if (initResponse.ok) {
            const initPayload = (await initResponse.json()) as {
              data?: { resume: ResumeDraft };
            };
            if (initPayload.data?.resume) {
              setResume(initPayload.data.resume);
              setStoredResumeDraft(initPayload.data.resume);
              setSaveState('saved');
              setStatusMessage(
                nextLocale === 'en'
                  ? 'Role-aware starter draft is ready.'
                  : 'चुनी हुई भूमिका के अनुसार प्रारंभिक जीवनवृत्त तैयार है।'
              );
              setIsLoaded(true);
              return;
            }
          }
      }

      const localDraft = getStoredResumeDraft();
      if (localDraft) {
        setResume(localDraft);
        setIsLoaded(true);
        return;
      }

      if (assessment && selectedRoleId) {
        const starter = buildStarterResume(selectedRoleId, assessment.profile, {
          name: user.name || assessment.profile.fullName,
          email: user.email,
        });
        setResume(starter);
        setStoredResumeDraft(starter);
        setIsLoaded(true);
        return;
      }

      setResume(emptyResume());
      setIsLoaded(true);
    };

    void initialize();
  }, [assessment, selectedRoleId, user]);

  useEffect(() => {
    if (!resume || !isLoaded) return;

    setStoredResumeDraft(resume);

    if (!user) return;

    setSaveState('saving');
    setStatusMessage(
      locale === 'en' ? 'Saving changes...' : 'बदलाव सेव किए जा रहे हैं...'
    );

    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const response = await fetch('/api/resumes', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resume),
        });

        if (!response.ok) {
          setSaveState('error');
          setStatusMessage(
            locale === 'en'
              ? 'Could not save right now, but your local draft is safe.'
              : 'अभी खाते में सुरक्षित नहीं हो सका, लेकिन इस उपकरण पर आपका प्रारूप सुरक्षित है।'
          );
          toast.error(
            locale === 'en'
              ? 'Could not save right now, but your local draft is safe.'
              : 'अभी खाते में सुरक्षित नहीं हो सका, लेकिन इस उपकरण पर आपका प्रारूप सुरक्षित है।'
          );
          return;
        }

        setSaveState('saved');
        void captureProductEvent('resume_saved', {
          has_phone: Boolean(resume.phone),
          section_count: resume.experience.length + resume.education.length,
        });
        setStatusMessage(
          locale === 'en'
            ? 'Saved to your workspace.'
            : 'आपके कार्यस्थल में सुरक्षित हो गया।'
        );
        toast.success(
          locale === 'en' ? 'Resume saved.' : 'जीवनवृत्त सुरक्षित हो गया।'
        );
      });
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoaded, locale, resume, user]);

  const selectedRole = selectedRoleId ? ROLE_DEFINITIONS[selectedRoleId] : null;
  const topMatches = assessment?.topRoles || [];
  const directionLabel =
    selectedRoleId && topMatches.find((item) => item.roleId === selectedRoleId)?.strengthLabel;

  const experienceCount = resume?.experience.filter(
    (item) => item.company || item.role || item.description
  ).length;
  const educationCount = resume?.education.filter(
    (item) => item.school || item.degree || item.field
  ).length;

  const headerTitle = useMemo(() => {
    if (selectedRole) {
      return getLocaleValue(selectedRole.shortLabel, locale);
    }

    return locale === 'en' ? 'Starter resume draft' : 'जीवनवृत्त का प्रारंभिक रूप';
  }, [locale, selectedRole]);

  if (loading || assessmentLoading || !isLoaded || !resume) {
    return (
      <FullPageLoader
        eyebrow="Resume workspace"
        title="Loading your resume draft…"
        message="We’re restoring your latest draft and selected role context."
      />
    );
  }

  if (!user) {
    return (
      <FullPageLoader
        eyebrow="Resume workspace"
        title="Redirecting to sign in…"
        message="Your resume draft is saved in your account workspace."
      />
    );
  }

  const updateResume = <K extends keyof ResumeDraft>(field: K, value: ResumeDraft[K]) => {
    setResume((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateExperience = (
    index: number,
    field: keyof ResumeDraft['experience'][number],
    value: string
  ) => {
    setResume((current) => {
      if (!current) return current;
      const next = current.experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      );
      return { ...current, experience: next };
    });
  };

  const updateEducation = (
    index: number,
    field: keyof ResumeDraft['education'][number],
    value: string
  ) => {
    setResume((current) => {
      if (!current) return current;
      const next = current.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      );
      return { ...current, education: next };
    });
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    updateResume('skills', [...resume.skills, newSkill.trim()]);
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    updateResume(
      'skills',
      resume.skills.filter((item) => item !== skill)
    );
  };

  const addCertification = () => {
    if (!newCertification.trim()) return;
    updateResume('certifications', [...resume.certifications, newCertification.trim()]);
    setNewCertification('');
  };

  const removeCertification = (itemToRemove: string) => {
    updateResume(
      'certifications',
      resume.certifications.filter((item) => item !== itemToRemove)
    );
  };

  const addExperience = () => {
    updateResume('experience', [
      ...resume.experience,
      { company: '', role: '', duration: '', description: '' },
    ]);
  };

  const confirmRemoveExperience = (index: number) => {
    updateResume(
      'experience',
      resume.experience.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const addEducation = () => {
    updateResume('education', [
      ...resume.education,
      { school: '', degree: '', field: '', year: '' },
    ]);
  };

  const confirmRemoveEducation = (index: number) => {
    updateResume(
      'education',
      resume.education.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const downloadResume = async () => {
    const response = await fetch('/api/resume/download', {
      headers: {},
    });

    if (!response.ok) {
      setSaveState('error');
      setStatusMessage(
        locale === 'en'
          ? 'Could not create the PDF right now.'
          : 'अभी पीडीएफ़ तैयार नहीं हो सका।'
      );
      toast.error(
        locale === 'en' ? 'Could not create the PDF right now.' : 'अभी पीडीएफ़ तैयार नहीं हो सका।'
      );
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'job-readiness-resume.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    void captureProductEvent('resume_pdf_downloaded', {
      selected_role: selectedRoleId || null,
    });
  };

  return (
    <>
    <main className="section-shell">
      <div className="container-main space-y-6">
        <section className="workspace-hero">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Resume co-writer' : 'रिज्यूमे को-राइटर'}
              </p>
              <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-strong)] sm:text-5xl">
                {locale === 'en'
                  ? 'Build a role-aware resume from your fit-check.'
                  : 'योग्यता जाँच के आधार पर भूमिका-केंद्रित जीवनवृत्त बनाएँ।'}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                {selectedRole
                  ? locale === 'en'
                    ? `${headerTitle} is selected right now, so the draft is tuned for that path instead of a generic fresher resume.`
                    : `${headerTitle} अभी selected है, इसलिए draft generic fresher resume की जगह उसी path के लिए tuned है।`
                  : locale === 'en'
                    ? 'This draft becomes much stronger after you complete the fit-check and pick a role.'
                    : 'योग्यता जाँच पूरी करके भूमिका चुनने के बाद यह प्रारूप और अधिक उपयोगी हो जाता है।'}
              </p>
            </div>

            <div className="story-card max-w-md">
              <div className="flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    saveState === 'error'
                      ? 'bg-rose-500'
                      : saveState === 'saved'
                        ? 'bg-emerald-500'
                        : 'bg-amber-400'
                  }`}
                />
                <p className="text-sm font-medium text-[var(--ink-soft)]">
                  {statusMessage ||
                    (locale === 'en'
                      ? 'Ready to save to your workspace.'
                      : 'कार्यस्थल में सुरक्षित करने के लिए तैयार।')}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    step === 'edit' ? 'bg-[var(--accent-ink)] text-white' : 'bg-[var(--wash-forest)] text-[var(--ink-soft)]'
                  }`}
                  onClick={() => setStep('edit')}
                  type="button"
                >
                  {locale === 'en' ? 'Edit' : 'एडिट'}
                </button>
                <button
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    step === 'preview'
                      ? 'bg-[var(--accent-ink)] text-white'
                      : 'bg-[var(--wash-forest)] text-[var(--ink-soft)]'
                  }`}
                  onClick={() => setStep('preview')}
                  type="button"
                >
                  {locale === 'en' ? 'Preview' : 'प्रीव्यू'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="route-shell">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Current direction' : 'वर्तमान दिशा'}
              </p>
              <h2 className="mt-2 text-2xl text-[var(--ink-strong)]">{headerTitle}</h2>
              {selectedRole ? (
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  {getLocaleValue(selectedRole.summary, locale)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {topMatches.map((match) => (
                  <button
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      selectedRoleId === match.roleId
                        ? 'border-[var(--accent-ink)] bg-[var(--wash-forest)] text-[var(--accent-ink)]'
                        : 'border-[var(--border-soft)] bg-white text-[var(--ink-soft)]'
                    }`}
                    key={match.roleId}
                    onClick={() => {
                      void persistSelectedRole(match.roleId);
                    }}
                    type="button"
                  >
                    {getLocaleValue(match.role.shortLabel, locale)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="metric-tile p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  {locale === 'en' ? 'Assessment direction' : 'आकलन की दिशा'}
                </p>
                <p className="mt-3 text-xl font-semibold text-[var(--accent-ink)]">
                  {directionLabel ? getLocaleValue(directionLabel, locale) : '--'}
                </p>
              </div>
              <div className="metric-tile p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  {locale === 'en' ? 'Experience sections' : 'अनुभव के भाग'}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
                  {experienceCount || 0}
                </p>
              </div>
              <div className="metric-tile p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  {locale === 'en' ? 'Education sections' : 'शिक्षा के भाग'}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
                  {educationCount || 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.98fr,1.02fr]">
          <div className={`${step === 'preview' ? 'hidden xl:block' : ''} space-y-5`}>
            <div className="route-shell space-y-5 bg-white/90">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-3xl text-[var(--ink-strong)]">
                  {locale === 'en' ? 'Edit your resume' : 'अपना जीवनवृत्त संपादित करें'}
                </h2>
                <button className="btn-outline" onClick={downloadResume} type="button">
                  {locale === 'en'
                    ? 'Download PDF'
                    : 'पीडीएफ़ डाउनलोड करें'}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    {locale === 'en' ? 'Resume title' : 'जीवनवृत्त का शीर्षक'}
                  </span>
                  <input
                    className="input-field"
                    onChange={(event) => updateResume('title', event.target.value)}
                    value={resume.title}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    {locale === 'en' ? 'Location' : 'स्थान'}
                  </span>
                  <input
                    className="input-field"
                    onChange={(event) => updateResume('location', event.target.value)}
                    value={resume.location}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    {locale === 'en' ? 'Email' : 'ईमेल'}
                  </span>
                  <input
                    className="input-field"
                    onChange={(event) => updateResume('email', event.target.value)}
                    value={resume.email}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink-soft)]">
                    {locale === 'en' ? 'Phone' : 'फोन'}
                  </span>
                  <input
                    className={`input-field ${
                      isValidIndianPhoneNumberOrEmpty(resume.phone) ? '' : 'border-rose-400'
                    }`}
                    onChange={(event) =>
                      updateResume('phone', formatIndianPhoneInput(event.target.value))
                    }
                    value={resume.phone}
                  />
                  {!isValidIndianPhoneNumberOrEmpty(resume.phone) ? (
                    <span className="text-xs text-rose-600">
                      {locale === 'en'
                        ? 'Enter a valid Indian phone number.'
                        : 'एक वैध भारतीय फ़ोन नंबर दर्ज करें।'}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--ink-soft)]">
                  {locale === 'en' ? 'Professional summary' : 'व्यावसायिक परिचय'}
                </span>
                <textarea
                  className="input-field min-h-[130px]"
                  onChange={(event) => updateResume('summary', event.target.value)}
                  value={resume.summary}
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                    {locale === 'en' ? 'Skills' : 'कौशल'}
                  </h3>
                  <div className="flex gap-2">
                    <input
                      className="input-field"
                      onChange={(event) => setNewSkill(event.target.value)}
                      value={newSkill}
                    />
                    <button className="btn-outline" onClick={addSkill} type="button">
                      {locale === 'en' ? 'Add' : 'जोड़ें'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resume.skills.map((skill) => (
                    <button
                      className="accent-chip"
                      key={skill}
                      onClick={() => removeSkill(skill)}
                      type="button"
                    >
                      {skill} ×
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                    {locale === 'en' ? 'Experience' : 'अनुभव'}
                  </h3>
                  <button className="btn-outline" onClick={addExperience} type="button">
                    {locale === 'en' ? 'Add block' : 'ब्लॉक जोड़ें'}
                  </button>
                </div>
                {resume.experience.map((item, index) => (
                  <div className="step-panel" key={`experience-${index}`}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input-field"
                        onChange={(event) =>
                          updateExperience(index, 'role', event.target.value)
                        }
                        placeholder={locale === 'en' ? 'Role' : 'भूमिका'}
                        value={item.role}
                      />
                      <input
                        className="input-field"
                        onChange={(event) =>
                          updateExperience(index, 'company', event.target.value)
                        }
                        placeholder={locale === 'en' ? 'Company / project' : 'कंपनी / परियोजना'}
                        value={item.company}
                      />
                      <input
                        className="input-field"
                        onChange={(event) =>
                          updateExperience(index, 'duration', event.target.value)
                        }
                        placeholder={locale === 'en' ? 'Duration' : 'समय अवधि'}
                        value={item.duration}
                      />
                      <button
                        className="btn-outline"
                        disabled={resume.experience.length === 1}
                        onClick={() => setPendingDelete({ type: 'experience', index })}
                        type="button"
                      >
                        {locale === 'en' ? 'Remove block' : 'ब्लॉक हटाएं'}
                      </button>
                    </div>
                    <textarea
                      className="input-field mt-3 min-h-[100px]"
                      onChange={(event) =>
                        updateExperience(index, 'description', event.target.value)
                      }
                      placeholder={
                        locale === 'en'
                          ? 'Describe impact, responsibility, or outcomes.'
                          : 'अपने योगदान, जिम्मेदारी और परिणामों का वर्णन करें।'
                      }
                      value={item.description}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                    {locale === 'en' ? 'Education' : 'शिक्षा'}
                  </h3>
                  <button className="btn-outline" onClick={addEducation} type="button">
                    {locale === 'en' ? 'Add block' : 'ब्लॉक जोड़ें'}
                  </button>
                </div>
                {resume.education.map((item, index) => (
                  <div className="step-panel" key={`education-${index}`}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input-field"
                        onChange={(event) =>
                          updateEducation(index, 'school', event.target.value)
                        }
                        placeholder={locale === 'en' ? 'College / school' : 'कॉलेज / स्कूल'}
                        value={item.school}
                      />
                      <input
                        className="input-field"
                        onChange={(event) =>
                          updateEducation(index, 'degree', event.target.value)
                        }
                        placeholder={locale === 'en' ? 'Degree' : 'डिग्री'}
                        value={item.degree}
                      />
                      <input
                        className="input-field"
                        onChange={(event) =>
                          updateEducation(index, 'field', event.target.value)
                        }
                        placeholder={locale === 'en' ? 'Field' : 'विषय'}
                        value={item.field}
                      />
                      <div className="flex gap-3">
                        <input
                          className="input-field"
                          onChange={(event) =>
                            updateEducation(index, 'year', event.target.value)
                          }
                          placeholder={locale === 'en' ? 'Year' : 'वर्ष'}
                          value={item.year}
                        />
                        <button
                          className="btn-outline"
                          disabled={resume.education.length === 1}
                          onClick={() => setPendingDelete({ type: 'education', index })}
                          type="button"
                        >
                          {locale === 'en' ? 'Remove' : 'हटाएं'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                    {locale === 'en' ? 'Certifications' : 'प्रमाणपत्र'}
                  </h3>
                  <div className="flex gap-2">
                    <input
                      className="input-field"
                      onChange={(event) => setNewCertification(event.target.value)}
                      value={newCertification}
                    />
                    <button
                      className="btn-outline"
                      onClick={addCertification}
                      type="button"
                    >
                      {locale === 'en' ? 'Add' : 'जोड़ें'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resume.certifications.map((item) => (
                    <button
                      className="accent-chip"
                      key={item}
                      onClick={() => removeCertification(item)}
                      type="button"
                    >
                      {item} ×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className={`${step === 'edit' ? 'hidden xl:block' : ''} space-y-5`}>
            <div className="card bg-white">
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Live preview' : 'तुरंत दिखाई देने वाला रूप'}
              </p>
              <h2 className="mt-4 text-3xl leading-tight text-[var(--ink-strong)]">
                {resume.title || (locale === 'en' ? 'Your name - selected role' : 'आपका नाम - चुनी हुई भूमिका')}
              </h2>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {[resume.location, resume.phone].filter(Boolean).join(' • ')}
              </p>
              <p className="text-sm text-[var(--ink-soft)]">{resume.email}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                    {locale === 'en' ? 'Summary' : 'परिचय'}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{resume.summary}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                    {locale === 'en' ? 'Skills' : 'कौशल'}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resume.skills.map((item) => (
                      <span className="accent-chip" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                    {locale === 'en' ? 'Experience' : 'अनुभव'}
                  </h3>
                  <div className="mt-3 space-y-4">
                    {resume.experience.map((item, index) => (
                      <div key={`preview-exp-${index}`}>
                        <p className="font-semibold text-[var(--ink-strong)]">
                          {[item.role, item.company].filter(Boolean).join(' • ')}
                        </p>
                        <p className="text-sm text-[var(--ink-muted)]">{item.duration}</p>
                        <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                    {locale === 'en' ? 'Education' : 'शिक्षा'}
                  </h3>
                  <div className="mt-3 space-y-4">
                    {resume.education.map((item, index) => (
                      <div key={`preview-edu-${index}`}>
                        <p className="font-semibold text-[var(--ink-strong)]">
                          {[item.degree, item.school].filter(Boolean).join(' • ')}
                        </p>
                        <p className="text-sm text-[var(--ink-muted)]">
                          {[item.field, item.year].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {resume.certifications.length ? (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                      {locale === 'en' ? 'Certifications' : 'प्रमाणपत्र'}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resume.certifications.map((item) => (
                        <span className="accent-chip" key={item}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {selectedRole ? (
              <div className="rounded-[1.6rem] border border-[var(--accent-ink)]/14 bg-[rgba(255,255,255,0.78)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-ink)]">
                  {locale === 'en' ? 'Role-specific cues' : 'भूमिका के अनुसार सुझाव'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedRole.strengths.map((item) => (
                    <span className="accent-chip" key={`${selectedRole.id}-${item.en}`}>
                      {getLocaleValue(item, locale)}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {selectedRole.starterTasks.map((task, index) => (
                    <div className="flex gap-3" key={`${selectedRole.id}-cue-${index + 1}`}>
                      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-ink)] text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-7 text-[var(--ink-soft)]">
                        {getLocaleValue(task, locale)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={isPending} onClick={downloadResume} type="button">
                {locale === 'en'
                  ? 'Download PDF'
                  : 'पीडीएफ़ डाउनलोड करें'}
              </button>
              <Link className="btn-outline" href="/results">
                {locale === 'en' ? 'Back to matches' : 'भूमिकाओं पर वापस जाएँ'}
              </Link>
              <Link className="btn-secondary" href="/plan">
                {locale === 'en'
                  ? 'Continue to weekly plan'
                  : 'साप्ताहिक योजना पर जाएँ'}
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>

    <Dialog.Root open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--ink-strong)]/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
          <Dialog.Title className="text-xl font-semibold text-[var(--ink-strong)]">
            {locale === 'en' ? 'Remove this block?' : 'इस ब्लॉक को हटाएँ?'}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
            {locale === 'en'
              ? 'This removes it from your resume draft immediately. This cannot be undone.'
              : 'यह आपके जीवनवृत्त प्रारूप से तुरंत हटा दिया जाएगा। इसे वापस नहीं किया जा सकता।'}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close className="btn-outline" type="button">
              {locale === 'en' ? 'Cancel' : 'रद्द करें'}
            </Dialog.Close>
            <button
              className="btn-primary bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (pendingDelete?.type === 'experience') confirmRemoveExperience(pendingDelete.index);
                if (pendingDelete?.type === 'education') confirmRemoveEducation(pendingDelete.index);
                setPendingDelete(null);
              }}
              type="button"
            >
              {locale === 'en' ? 'Remove' : 'हटाएँ'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}
