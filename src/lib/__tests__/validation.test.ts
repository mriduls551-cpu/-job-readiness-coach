import { describe, expect, it } from '@jest/globals';
import {
  applicationSchema,
  loginSchema,
  registerSchema,
  resumeSchema,
  validateInput,
  validateRequest,
} from '@/lib/validation';

describe('registerSchema', () => {
  it('accepts valid input', () => {
    expect(
      registerSchema.safeParse({ email: 'priya@example.com', name: 'Priya Singh', password: 'securepass123' }).success
    ).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(
      registerSchema.safeParse({ email: 'not-an-email', name: 'Priya Singh', password: 'securepass123' }).success
    ).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    expect(
      registerSchema.safeParse({ email: 'priya@example.com', name: 'P', password: 'securepass123' }).success
    ).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    expect(
      registerSchema.safeParse({ email: 'priya@example.com', name: 'Priya', password: 'short' }).success
    ).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(registerSchema.safeParse({}).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'user@test.com', password: 'anypass' }).success).toBe(true);
  });

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'user@test.com', password: '' }).success).toBe(false);
  });

  it('rejects malformed email', () => {
    expect(loginSchema.safeParse({ email: 'notanemail', password: 'pass' }).success).toBe(false);
  });
});

describe('resumeSchema', () => {
  it('accepts a fully populated resume', () => {
    expect(
      resumeSchema.safeParse({
        title: 'Software Engineer',
        summary: 'Experienced developer',
        email: 'dev@example.com',
        phone: '9876543210',
        location: 'Bengaluru',
        skills: ['TypeScript', 'React'],
        experience: [{ company: 'Acme', role: 'Dev', duration: '2yr', description: '...' }],
        education: [{ school: 'BITS', degree: 'B.Tech', field: 'CS', year: '2022' }],
        certifications: ['AWS'],
      }).success
    ).toBe(true);
  });

  it('accepts an empty object (all fields optional)', () => {
    expect(resumeSchema.safeParse({}).success).toBe(true);
  });

  it('accepts empty string for email (blank is allowed)', () => {
    expect(resumeSchema.safeParse({ email: '' }).success).toBe(true);
  });

  it('rejects an invalid email when non-empty', () => {
    expect(resumeSchema.safeParse({ email: 'bad-email' }).success).toBe(false);
  });

  it('accepts skills as array of strings', () => {
    expect(resumeSchema.safeParse({ skills: ['JavaScript', 'Node.js', 'SQL'] }).success).toBe(true);
  });
});

describe('applicationSchema', () => {
  it('accepts valid application', () => {
    expect(
      applicationSchema.safeParse({ company_name: 'TCS', role_title: 'Data Entry Executive', status: 'applied' }).success
    ).toBe(true);
  });

  it('accepts application without optional status', () => {
    expect(
      applicationSchema.safeParse({ company_name: 'Infosys', role_title: 'HR Coordinator' }).success
    ).toBe(true);
  });

  it('rejects empty company_name', () => {
    expect(applicationSchema.safeParse({ company_name: '', role_title: 'Dev' }).success).toBe(false);
  });

  it('rejects invalid status enum value', () => {
    expect(
      applicationSchema.safeParse({ company_name: 'TCS', role_title: 'Dev', status: 'ghosted' }).success
    ).toBe(false);
  });

  it('accepts all valid status values', () => {
    const statuses = ['applied', 'interview', 'offered', 'rejected'] as const;
    statuses.forEach((status) => {
      expect(applicationSchema.safeParse({ company_name: 'TCS', role_title: 'Dev', status }).success).toBe(true);
    });
  });
});

describe('validateInput', () => {
  it('returns success:true and data for valid input', () => {
    const result = validateInput(loginSchema, { email: 'a@b.com', password: 'pass' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ email: 'a@b.com', password: 'pass' });
  });

  it('returns success:false and error message for invalid input', () => {
    const result = validateInput(loginSchema, { email: 'bad', password: '' });
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('error message contains field path', () => {
    const result = validateInput(registerSchema, { email: 'bad', name: 'A', password: 'x' });
    expect(result.error).toMatch(/email|name|password/i);
  });
});

describe('validateRequest', () => {
  it('returns success:true and typed data', () => {
    const result = validateRequest(loginSchema, { email: 'a@b.com', password: 'pass' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('a@b.com');
    }
  });

  it('returns success:false and non-empty errors array', () => {
    const result = validateRequest(loginSchema, { email: 'bad', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
