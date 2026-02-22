module.exports = class Observability {
  constructor() {
    this.startedAt = Date.now();
    this.counters = {
      requestsTotal: 0,
      responses2xx: 0,
      responses4xx: 0,
      responses5xx: 0,
      authFailures: 0,
      rateLimitHits: 0,
      loginFailures: 0,
    };
    this.latency = {
      totalMs: 0,
      count: 0,
      maxMs: 0,
    };
  }

  inc(counter, by = 1) {
    if (!Object.prototype.hasOwnProperty.call(this.counters, counter)) {
      this.counters[counter] = 0;
    }
    this.counters[counter] += by;
  }

  observeLatency(ms) {
    const value = Number(ms) || 0;
    this.latency.totalMs += value;
    this.latency.count += 1;
    if (value > this.latency.maxMs) this.latency.maxMs = value;
  }

  snapshot() {
    const avgLatencyMs = this.latency.count === 0 ? 0 : Number((this.latency.totalMs / this.latency.count).toFixed(2));
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      counters: { ...this.counters },
      latency: {
        avgLatencyMs,
        maxLatencyMs: this.latency.maxMs,
        samples: this.latency.count,
      },
    };
  }
};
