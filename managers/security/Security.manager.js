module.exports = class Security {
  constructor({ config }) {
    this.config = config;
    this.loginWindowMs = Number(config.dotEnv.LOGIN_ATTEMPT_WINDOW_MS || 15 * 60 * 1000);
    this.loginMaxAttempts = Number(config.dotEnv.LOGIN_ATTEMPT_MAX || 5);
    this.lockMs = Number(config.dotEnv.LOGIN_LOCK_MS || 15 * 60 * 1000);
    this.store = new Map();
  }

  _key({ email, ip }) {
    return `${String(ip || 'na').toLowerCase()}::${String(email || 'na').toLowerCase()}`;
  }

  _pruneRecord(record, now) {
    if (!record) {
      return {
        attempts: [],
        lockedUntil: 0,
      };
    }

    record.attempts = record.attempts.filter((ts) => now - ts <= this.loginWindowMs);
    return record;
  }

  checkLoginAllowed({ email, ip }) {
    const now = Date.now();
    const key = this._key({ email, ip });
    const record = this._pruneRecord(this.store.get(key), now);

    if (record.lockedUntil && now < record.lockedUntil) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      this.store.set(key, record);
      return { allowed: false, retryAfterSeconds };
    }

    this.store.set(key, record);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  registerLoginResult({ email, ip, success }) {
    const now = Date.now();
    const key = this._key({ email, ip });
    const record = this._pruneRecord(this.store.get(key), now);

    if (success) {
      record.attempts = [];
      record.lockedUntil = 0;
      this.store.set(key, record);
      return;
    }

    record.attempts.push(now);
    if (record.attempts.length >= this.loginMaxAttempts) {
      record.lockedUntil = now + this.lockMs;
      record.attempts = [];
    }
    this.store.set(key, record);
  }
};
