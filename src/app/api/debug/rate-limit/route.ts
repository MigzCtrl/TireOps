import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Step 1: Check env vars
    const envStatus = {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'SET' : 'NOT SET',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'SET' : 'NOT SET',
    };

    // Step 2: Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // Step 3: Test Redis directly if env vars are set
    let redisTest = 'skipped - env vars not set';
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        });
        const data = await response.json();
        redisTest = data.result === 'PONG' ? 'PONG - Redis working!' : JSON.stringify(data);
      } catch (e) {
        redisTest = 'error: ' + (e instanceof Error ? e.message : String(e));
      }
    }

    // Step 4: Test rate limiter
    let rateLimiterTest = 'skipped - env vars not set';
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const { Ratelimit } = await import('@upstash/ratelimit');
        const { Redis } = await import('@upstash/redis');

        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        const limiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(10, '60 s'),
          prefix: 'debug:ratelimit',
        });

        const result = await limiter.limit(clientIp);
        rateLimiterTest = `success=${result.success}, remaining=${result.remaining}/10`;
      } catch (e) {
        rateLimiterTest = 'error: ' + (e instanceof Error ? e.message : String(e));
      }
    }

    return NextResponse.json({
      clientIp,
      envStatus,
      redisTest,
      rateLimiterTest,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
