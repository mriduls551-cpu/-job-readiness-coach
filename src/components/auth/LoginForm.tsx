'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { logger } from '@/lib/logger';
import { setStoredUser } from '@/lib/client-session';
import { captureProductEvent, identifyProductUser } from '@/lib/analytics';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFields = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFields) => {
    try {
      logger.info('Attempting login', { email: data.email });

      const response = await axios.post('/api/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (response.data.success) {
        logger.info('Login successful');
        const user = response.data.data.user;
        setStoredUser(user);
        void identifyProductUser(user);
        void captureProductEvent('login_completed', {
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
          : 'Login failed. Please try again.';

      logger.error('Login failed', { error: message });
      setError('root', { message });
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            autoComplete="current-password"
            placeholder="Your password"
            className="input-field"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          ) : null}
        </div>

        {errors.root ? (
          <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.root.message}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="warm-note">
          Use your account to reopen saved progress, results, and resume edits across devices.
        </div>

        <p className="text-center text-sm text-[var(--ink-soft)]">
          Don&apos;t have an account?{' '}
          <a
            href={`/register${
              searchParams.get('next')
                ? `?next=${encodeURIComponent(searchParams.get('next') || '')}`
                : ''
            }`}
            className="font-medium text-[var(--accent-ink)] hover:text-[var(--brand-ink)]"
          >
            Register here
          </a>
        </p>
      </form>
    </div>
  );
}
