// In-memory rate limiter (sliding-window token bucket).
//
// Mitigates cost exhaustion / DDoS on LLM-backed routes (audit item: "Cost
// Exhaustion & DDoS Risk"). Keyed by userId when authenticated, falling back
// to the caller's IP. State lives in-process — consistent with the in-process
// background worker and fine for a single-instance deployment. For multi-node
// production, swap the Map for Upstash Redis.
//
//   const { success, retryAfter } = await rateLimit({ key: userId, limit: 20, windowMs: 60_000 });
//   if (!success) return new Response("Slow down", { status: 429, headers: { "Retry-After": String(retryAfter) } });

interface Bucket {
  /** Timestamps (ms) of requests within the current window. */
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow unbounded across many keys.
const MAX_BUCKETS = 10_000;

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  /** Seconds to wait before the next request would succeed. */
  retryAfter: number;
  /** Remaining requests in the current window. */
  remaining: number;
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowMs } = opts;
  const now = Date.now();
  const windowStart = now - windowMs;

  const bucket = buckets.get(key) ?? { hits: [] };

  // Drop hits outside the sliding window.
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  if (bucket.hits.length >= limit) {
    // Oldest hit in the window determines when capacity is restored.
    const oldest = bucket.hits[0];
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    buckets.set(key, bucket);
    return {
      success: false,
      retryAfter: Math.ceil(retryAfterMs / 1000) || 1,
      remaining: 0,
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Bound memory: if we've grown too large, evict the oldest entries.
  if (buckets.size > MAX_BUCKETS && buckets.size % 500 === 0) {
    pruneStale(windowStart);
  }

  return {
    success: true,
    retryAfter: 0,
    remaining: Math.max(0, limit - bucket.hits.length),
  };
}

function pruneStale(windowStart: number) {
  for (const [k, b] of buckets) {
    b.hits = b.hits.filter((t) => t > windowStart);
    if (b.hits.length === 0) buckets.delete(k);
  }
}

/**
 * Convenience: derive a rate-limit key from a Next.js request.
 * Prefers an authenticated user id; falls back to the originating IP.
 */
export function rateLimitKeyFromRequest(req: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

/** Tunable route limits. */
export const RATE_LIMITS = {
  agentChat: { limit: 20, windowMs: 60_000 }, // 20 msgs / min
  agentMemory: { limit: 60, windowMs: 60_000 }, // 60 writes / min
  userMutation: { limit: 10, windowMs: 60_000 }, // delete/export / min
} as const;
