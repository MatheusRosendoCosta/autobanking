const WINDOW_MS   = 15 * 60 * 1000   // 15 minutes
const MAX_ATTEMPTS = 10

interface Record { count: number; firstAttempt: number }

const store = new Map<string, Record>()

// Cleanup entries older than the window every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, rec] of store) {
    if (now - rec.firstAttempt > WINDOW_MS) store.delete(key)
  }
}, 10 * 60 * 1000)

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now()
  const rec = store.get(key)

  if (!rec || now - rec.firstAttempt > WINDOW_MS) {
    return { allowed: true, retryAfterSecs: 0 }
  }

  if (rec.count >= MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((WINDOW_MS - (now - rec.firstAttempt)) / 1000)
    return { allowed: false, retryAfterSecs }
  }

  return { allowed: true, retryAfterSecs: 0 }
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const rec = store.get(key)

  if (!rec || now - rec.firstAttempt > WINDOW_MS) {
    store.set(key, { count: 1, firstAttempt: now })
  } else {
    rec.count++
  }
}

export function clearAttempts(key: string): void {
  store.delete(key)
}
