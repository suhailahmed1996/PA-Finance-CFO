// Drop-in replacement for window.storage that uses browser localStorage.
// Same async API so the rest of the app does not need to change.

const PREFIX = 'cfo-ledger:';

export const Storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      if (value === null) return null;
      return { key, value, shared: false };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    } catch (e) {
      console.error('Storage set failed:', e);
      return null;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true, shared: false };
    } catch {
      return null;
    }
  },
  async list(prefix) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) {
          const trimmed = k.slice(PREFIX.length);
          if (!prefix || trimmed.startsWith(prefix)) {
            keys.push(trimmed);
          }
        }
      }
      return { keys, prefix, shared: false };
    } catch {
      return null;
    }
  }
};

// Make available on window for compatibility with the original code
if (typeof window !== 'undefined') {
  window.storage = Storage;
}
