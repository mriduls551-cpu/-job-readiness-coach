import { describe, expect, it } from '@jest/globals';
import {
  createRateLimiter,
  getRateLimiter,
  userRateLimiter,
} from '@/lib/rate-limiter';

// Each test uses a unique key/IP because the limiter store is module-level and shared.

describe('createRateLimiter', () => {
  it('allows the first request and reports remaining = max - 1', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });
    const r = limiter({ ip: 'ip-first' });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it('allows exactly maxRequests then blocks the next', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });
    const ip = 'ip-block';
    expect(limiter({ ip }).allowed).toBe(true); // 1
    expect(limiter({ ip }).allowed).toBe(true); // 2
    expect(limiter({ ip }).allowed).toBe(true); // 3
    const blocked = limiter({ ip }); // 4
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('keeps separate counts for different IPs', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });
    expect(limiter({ ip: 'ip-A' }).allowed).toBe(true);
    expect(limiter({ ip: 'ip-A' }).allowed).toBe(false);
    // Different key is unaffected by ip-A's exhaustion.
    expect(limiter({ ip: 'ip-B' }).allowed).toBe(true);
  });

  it('derives the key from x-forwarded-for when ip is absent', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });
    const headers = new Map([['x-forwarded-for', '9.9.9.9, 10.0.0.1']]);
    const req = { headers: { get: (k: string) => headers.get(k) ?? null } };
    expect(limiter(req).allowed).toBe(true);
    expect(limiter(req).allowed).toBe(false); // same forwarded IP -> same key
  });
});

describe('userRateLimiter', () => {
  it('blocks a user after their max is reached', () => {
    const limiter = userRateLimiter('user-xyz', { windowMs: 60_000, maxRequests: 2 });
    expect(limiter().allowed).toBe(true);
    expect(limiter().allowed).toBe(true);
    expect(limiter().allowed).toBe(false);
  });
});

describe('getRateLimiter().check (in-memory fallback, no Redis configured)', () => {
  it('reports limited=false until the cap, then limited=true', async () => {
    const rl = getRateLimiter({ windowMs: 60_000, maxRequests: 2 });
    const key = 'check-key';
    expect((await rl.check(key)).limited).toBe(false);
    expect((await rl.check(key)).limited).toBe(false);
    expect((await rl.check(key)).limited).toBe(true);
  });
});
