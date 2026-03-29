const store = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet(key, data, ttlMs) {
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

export function cacheInvalidate(key) {
  if (key) store.delete(key);
  else store.clear();
}
