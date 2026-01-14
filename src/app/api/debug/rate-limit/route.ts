import { NextRequest, NextResponse } from 'next/server';
import { getBookingRateLimiter, checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Check if env vars are set
  const envStatus = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'SET' : 'NOT SET',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'SET (length: ' + process.env.UPSTASH_REDIS_REST_TOKEN.length + ')' : 'NOT SET',
  };

  // Try to get rate limiter
  let limiterStatus = 'unknown';
  let rateLimitResult = null;

  try {
    const limiter = getBookingRateLimiter();
    limiterStatus = limiter ? 'initialized' : 'null (env vars missing?)';

    if (limiter) {
      // Actually test the rate limiter
      const result = await limiter.limit(clientIp);
      rateLimitResult = {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    }
  } catch (error) {
    limiterStatus = 'error: ' + (error instanceof Error ? error.message : String(error));
  }

  // Check rate limit through the helper
  const rateLimitResponse = await checkRateLimit(getBookingRateLimiter(), clientIp);

  return NextResponse.json({
    clientIp,
    envStatus,
    limiterStatus,
    rateLimitResult,
    wouldBlock: rateLimitResponse !== null,
  });
}
