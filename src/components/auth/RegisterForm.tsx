'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { logger } from '@/lib/logger';
import { setStoredUser } from '@/lib/client-session';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      logger.info('Attempting registration', { email: formData.email });

      const registerResponse = await axios.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (registerResponse.data.success) {
        logger.info('Registration successful - auto-logging in');

        const loginResponse = await axios.post('/api/auth/login', {
          email: formData.email,
          password: formData.password,
        });

        if (loginResponse.data.success) {
          setStoredUser(loginResponse.data.data.user);
          const nextPath = searchParams.get('next');
          const destination =
            nextPath && nextPath.startsWith('/') ? nextPath : '/career-fit-check';
          router.push(destination);
        } else {
          router.push('/login?registered=true');
        }
      }
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Registration failed. Please try again.';

      setError(message);
      logger.error('Registration failed', { error: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="form-label">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            name="name"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            placeholder="Your full name"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            placeholder="name@email.com"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="input-field"
          />
          <p className="field-note">Minimum 8 characters</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="Type the same password again"
            className="input-field"
          />
        </div>

        {error && (
          <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <div className="warm-note">
          After creating your account, we will take you straight to the career fit
          check. Your progress will stay linked to this account.
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
            Sign in here
          </a>
        </p>
      </form>
    </div>
  );
}
