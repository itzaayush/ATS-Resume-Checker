/**
 * Fixed-window rate limiter backed by process memory.
 *
 * This is deliberately simple and single-instance. The production deployment described in
 * the PRD moves this to Redis; the interface stays identical so only the store changes.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    sweep(now);
    return { allowed: true, remaining: limit - 1, resetAt: bucket.resetAt, limit };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    limit,
  };
}

function sweep(now: number) {
  if (buckets.size < 512) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Best-effort client identity. Never used for anything but throttling. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const agent = request.headers.get("user-agent") ?? "unknown";
  let hash = 0;
  for (let i = 0; i < agent.length; i += 1) hash = (hash * 31 + agent.charCodeAt(i)) | 0;
  return `${ip}:${hash}`;
}
