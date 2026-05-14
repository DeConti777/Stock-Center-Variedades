type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  __stockCenterRateLimit?: Map<string, RateLimitBucket>;
};

function getStore() {
  if (!globalForRateLimit.__stockCenterRateLimit) {
    globalForRateLimit.__stockCenterRateLimit = new Map();
  }

  return globalForRateLimit.__stockCenterRateLimit;
}

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const store = getStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      ok: true,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
    };
  }

  if (current.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    ok: true,
    remaining: options.limit - current.count,
    resetAt: current.resetAt,
  };
}
