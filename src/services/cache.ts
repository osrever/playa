interface CacheEnvelope<T> {
  savedAt: number;
  value: T;
}

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const envelope = JSON.parse(raw) as CacheEnvelope<T>;
      if (Date.now() - envelope.savedAt < ttlMs) return envelope.value;
    }
  } catch {
    // Cache is optional; broken storage should not break recommendations.
  }

  const value = await loader();

  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Ignore quota/private-mode failures.
  }

  return value;
}
