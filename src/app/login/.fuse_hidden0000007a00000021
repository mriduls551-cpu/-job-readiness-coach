import { Suspense } from 'react';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Sign In - Job Readiness Coach',
  description: 'Sign in to your Job Readiness Coach account',
};

export default function LoginPage() {
  return (
    <AuthScaffold
      eyebrow="Save your progress"
      title="Welcome back to your one calm job-readiness system."
      subtitle="Sign in to reopen your fit check, resume draft, weekly plan, and application momentum without starting over."
    >
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow-copy">Save your progress</p>
          <h1 className="mt-3 text-4xl text-[var(--brand-ink)]">Sign in</h1>
          <p className="mt-2 text-[var(--ink-soft)]">Welcome back to Job Readiness Coach</p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthScaffold>
  );
}
