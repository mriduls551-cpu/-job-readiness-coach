'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { logger } from '@/lib/logger';
import { setStoredUser } from '@/lib/client-session';
import { captureProductEvent, identifyProductUser } from '@/lib/analytics';

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
            Full Name
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
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="email" className="form-label">
            Email Address
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
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            Password
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
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
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
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        {errors.root ? (
          <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.root.message}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <div className="warm-note">
          Your progress, results, and resume will be saved to this account and accessible from any
          device.
        </div>

        <p className="text-center text-sm text-[var(--ink-soft)]">
          Already have an account?{' '}
          <a
            href={`/login${
              searchParams.get('next')
                ? `?next=${encodeURIComponent(searchParams.get('next') || '')}`
                : ''
            }`}
            className="font-medium text-[var(--accent-ink)] hover:text-[var(--brand-ink)]"
          >
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
