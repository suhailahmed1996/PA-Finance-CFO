// localStorage adapter for browser persistence.
const PREFIX = 'cfo-ledger:';

export const S = {
  async get(key, def) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v === null ? def : JSON.parse(v);
    } catch {
      return def;
    }
  },
  async set(key, val) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(val));
      return true;
    } catch {
      return false;
    }
  }
};
