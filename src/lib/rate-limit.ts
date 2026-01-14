import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Lazy initialization - only create Redis client when env vars are available
let redis: Redis | null = null;
let bookingLimiter: Ratelimit | null = null;
let webhookLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  // Check if Upstash is configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not configured');
    return null;
  }

  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  return redis;
}

/**
 * Rate limiter for public booking endpoints
 * Allows 10 requests per minute per IP
 */
export function getBookingRateLimiter(): Ratelimit | null {
  if (bookingLimiter) return bookingLimiter;

  const redisClient = getRedis();
  if (!redisClient) return null;

  bookingLimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'ratelimit:booking',
    analytics: true,
  });

  return bookingLimiter;
}

/**
 * Rate limiter for webhook endpoints
 * Allows 100 requests per minute (Stripe may send bursts)
 */
export function getWebhookRateLimiter(): Ratelimit | null {
  if (webhookLimiter) return webhookLimiter;

  const redisClient = getRedis();
  if (!redisClient) return null;

  webhookLimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(100, '60 s'),
    prefix: 'ratelimit:webhook',
    analytics: true,
  });

  return webhookLimiter;
}

/**
 * Check rate limit and return error response if exceeded
 * Returns null if rate limit is not exceeded or not configured
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  // If rate limiting is not configured, allow the request
  if (!limiter) {
    return null;
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    return null;
  } catch (error) {
    // If rate limiting fails, log and allow the request
    console.error('Rate limit check failed:', error);
    return null;
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - in production behind a proxy this shouldn't happen
  return 'unknown';
}
