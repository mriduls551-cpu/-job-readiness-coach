/**
 * Rate Limiting per endpoint
 * Prevents abuse and DDoS-like behavior
 *
 * Uses Upstash Redis (durable, shared across serverless instances) when
 * UPSTASH_REDIS_REST_URL/TOKEN are configured. Falls back to an in-memory
 * Map for local dev. The in-memory store does NOT hold across serverless
 * instances/cold starts, so Redis is required for real abuse protection
 * (e.g. to cap spend on paid LLM endpoints).
 */

interface RateLimit {
  count: number;
  resetAt: number;
}

interface RedisClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

const rateLimitStore = new Map<string, RateLimit>();

let redisClient: RedisClient | null = null;
let redisInitAttempted = false;

async function getRedis(): Promise<RedisClient | null> {
  if (redisInitAttempted) {
    return redisClient;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const { Redis } = await import('@upstash/redis');
      redisClient = new Redis({ url, token });
    } catch {
      redisClient = null;
    }
  }
  redisInitAttempted = true;
  return redisClient;
}

/**
 * Durable fixed-window check backed by Redis. Returns null if Redis is not
 * configured or errors (caller then falls back to the in-memory limiter).
 */
async function checkRedisWindow(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{ limited: boolean; remaining: number; resetTime: number } | null> {
  const redis = await getRedis();
  if (!redis) {
    return null;
  }

  try {
    const bucket = Math.floor(Date.now() / windowMs);
    const redisKey = `rl:${key}:${bucket}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, Math.ceil(windowMs / 1000));
    }
    const resetTime = (bucket + 1) * windowMs - Date.now();
    return {
      limited: count > maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetTime: Math.max(0, resetTime),
    };
  } catch {
    // Redis outage: fail back to in-memory rather than taking the route down.
    return null;
  }
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: any) => string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
};

function getClientKey(request: any) {
  if (typeof request?.ip === 'string' && request.ip.trim()) {
    return request.ip.trim();
  }

  const realIp =
    typeof request?.headers?.get === 'function'
      ? request.headers.get('x-real-ip')
      : request?.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const forwardedFor =
    typeof request?.headers?.get === 'function'
      ? request.headers.get('x-forwarded-for')
      : request?.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return 'unknown';
}

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return function rateLimiter(
    request: any
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const key = finalConfig.keyGenerator?.(request) || getClientKey(request);
    const now = Date.now();
    const limitData = rateLimitStore.get(key);

    if (Math.random() < 0.01) {
      cleanupExpiredTokens();
    }

    if (!limitData || now > limitData.resetAt) {
      const newLimit: RateLimit = {
        count: 1,
        resetAt: now + finalConfig.windowMs,
      };
      rateLimitStore.set(key, newLimit);
      return {
        allowed: true,
        remaining: finalConfig.maxRequests - 1,
        resetAt: newLimit.resetAt,
      };
    }

    limitData.count++;

    const isAllowed = limitData.count <= finalConfig.maxRequests;
    const remaining = Math.max(0, finalConfig.maxRequests - limitData.count);

    return {
      allowed: isAllowed,
      remaining,
      resetAt: limitData.resetAt,
    };
  };
}

function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

export function getRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const limiter = createRateLimiter(config);

  return {
    async check(input: any) {
      const key =
        typeof input === 'string'
          ? input
          : finalConfig.keyGenerator?.(input) || getClientKey(input);

      const durable = await checkRedisWindow(
        key,
        finalConfig.windowMs,
        finalConfig.maxRequests
      );
      if (durable) {
        return durable;
      }

      // Fallback: in-memory (local dev, or Redis unavailable).
      const result =
        typeof input === 'string' ? limiter({ ip: input, headers: {} }) : limiter(input);
      return {
        limited: !result.allowed,
        remaining: result.remaining,
        resetTime: Math.max(0, result.resetAt - Date.now()),
      };
    },
  };
}

export function userRateLimiter(userId: string, config: Partial<RateLimitConfig> = {}) {
  const finalConfig = {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50,
    ...config,
  };

  return function limiter(): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const limitData = rateLimitStore.get(userId);

    if (!limitData || now > limitData.resetAt) {
      const newLimit: RateLimit = {
        count: 1,
        resetAt: now + finalConfig.windowMs,
      };
      rateLimitStore.set(userId, newLimit);
      return {
        allowed: true,
        remaining: finalConfig.maxRequests - 1,
        resetAt: newLimit.resetAt,
      };
    }

    limitData.count++;
    const isAllowed = limitData.count <= finalConfig.maxRequests;
    const remaining = Math.max(0, finalConfig.maxRequests - limitData.count);

    return {
      allowed: isAllowed,
      remaining,
      resetAt: limitData.resetAt,
    };
  };
}

export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
});

export const assessmentLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
});

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
});
