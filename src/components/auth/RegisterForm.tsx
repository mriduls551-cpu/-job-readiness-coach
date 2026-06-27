'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { logger } from '@/lib/logger';
import { setStoredUser } from '@/lib/client-session';
import { captureProductEvent, identifyProductUser } from '@/lib/analytics';
import { useAppStore } from '@/lib/store';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFields = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppStore((state) => state.locale);
  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFields) => {
    try {
      logger.info('Attempting registration', { email: data.email });

      const registerResponse = await axios.post('/api/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (!registerResponse.data.success) {
        setError('root', { message: 'Registration failed. Please try again.' });
        return;
      }

      logger.info('Registration successful, logging in…');

      const loginResponse = await axios.post('/api/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (loginResponse.data.success) {
        const user = loginResponse.data.data.user;
        setStoredUser(user);
        void identifyProductUser(user);
        void captureProductEvent('registration_completed', {
          next_path: searchParams.get('next') || '/',
        });
        const nextPath = searchParams.get('next');
        const safeNextPath = nextPath && nextPath.startsWith('/') ? nextPath : '/';
        router.push(safeNextPath);
      }
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Registration failed. Please try again.';

      logger.error('Registration failed', { error: message });
      setError('root', { message });
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="name" className="form-label">
            {copy('Full Name', 'पूरा नाम')}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            className="input-field"
            {...register('name')}
          />
          {errors.name ? (
            <p className="mt-1 text-sm text-rose-600">{copy('Name must be at least 2 characters', 'नाम कम से कम 2 अक्षर का होना चाहिए')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="email" className="form-label">
            {copy('Email Address', 'ईमेल पता')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@email.com"
            className="input-field"
            {...register('email')}
          />
          {errors.email ? (
            <p className="mt-1 text-sm text-rose-600">{copy('Enter a valid email address', 'एक मान्य ईमेल पता दर्ज करें')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            {copy('Password', 'पासवर्ड')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="input-field"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-sm text-rose-600">{copy('Password must be at least 8 characters', 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="form-label">
            {copy('Confirm Password', 'पासवर्ड की पुष्टि करें')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            className="input-field"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="mt-1 text-sm text-rose-600">{copy('Please confirm your password', 'कृपया अपने पासवर्ड की पुष्टि करें')}</p>
          ) : null}
        </div>

        {errors.root ? (
          <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errors.root.message}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? copy('Creating account…', 'खाता बनाया जा रहा है…') : copy('Create account', 'खाता बनाएँ')}
        </button>

        <div className="warm-note">
          {copy('Your progress, results, and resume will be saved to this account and accessible from any device.', 'आपकी प्रगति, परिणाम और जीवनवृत्त इस खाते में सुरक्षित रहेंगे और किसी भी डिवाइस से उपलब्ध होंगे।')}
        </div>

        <p className="text-center text-sm text-[var(--ink-soft)]">
          {copy('Already have an account?', 'पहले से खाता है?')}{' '}
          <a
            href={`/login${
              searchParams.get('next')
                ? `?next=${encodeURIComponent(searchParams.get('next') || '')}`
                : ''
            }`}
            className="font-medium text-[var(--accent-ink)] hover:text-[var(--brand-ink)]"
          >
            {copy('Sign in', 'साइन इन करें')}
          </a>
        </p>
      </form>
    </div>
  );
}
