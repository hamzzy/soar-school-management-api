const http = require('http');
const express = require('express');
const cors = require('cors');
const requestIp = require('request-ip');
const { nanoid } = require('nanoid');
const mongoose = require('mongoose');
const logger = require('../../libs/logger');

let helmet = null;
try {
  helmet = require('helmet');
} catch (err) {
  helmet = null;
}

const app = express();

module.exports = class UserServer {
  constructor({ config, managers }) {
    this.config = config;
    this.userApi = managers.userApi;
    this.responseDispatcher = managers.responseDispatcher;
    this.observability = managers.observability;
    this.rateLimitState = new Map();
    this.rateWindowMs = Number(this.config.dotEnv.RATE_LIMIT_WINDOW_MS || 60000);
    this.rateMax = Number(this.config.dotEnv.RATE_LIMIT_MAX || 120);

    this.allowedOrigins = String(this.config.dotEnv.CORS_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  use(args) {
    app.use(args);
  }

  _requestContextMw(req, res, next) {
    const incomingRequestId = req.headers['x-request-id'];
    const incomingCorrelationId = req.headers['x-correlation-id'];

    req.requestId = incomingRequestId ? String(incomingRequestId) : nanoid();
    req.correlationId = incomingCorrelationId ? String(incomingCorrelationId) : req.requestId;
    req.clientIp = requestIp.getClientIp(req) || req.ip || 'unknown';

    res.setHeader('x-request-id', req.requestId);
    res.setHeader('x-correlation-id', req.correlationId);

    logger.info('http_request_started', {
      requestId: req.requestId,
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.clientIp,
      userAgent: req.headers['user-agent'] || '',
    });

    next();
  }

  _securityMw(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    next();
  }

  _corsMw() {
    const isDevelopment = String(this.config.dotEnv.ENV || '').toLowerCase() === 'development';

    return cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (this.allowedOrigins.length === 0 && isDevelopment) return cb(null, true);
        if (this.allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'token', 'x-request-id', 'x-correlation-id'],
      exposedHeaders: ['x-request-id', 'x-correlation-id', 'Retry-After'],
    });
  }

  _observabilityMw(req, res, next) {
    const startedAt = Date.now();
    this.observability.inc('requestsTotal');

    const originalSend = res.send.bind(res);
    res.send = (body) => {
      res.locals.responseBody = body;
      return originalSend(body);
    };

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      this.observability.observeLatency(durationMs);

      if (res.statusCode >= 500) this.observability.inc('responses5xx');
      else if (res.statusCode >= 400) this.observability.inc('responses4xx');
      else this.observability.inc('responses2xx');

      let response = null;
      if (res.locals.responseBody && typeof res.locals.responseBody === 'object') {
        response = res.locals.responseBody;
      } else if (typeof res.locals.responseBody === 'string') {
        try {
          response = JSON.parse(res.locals.responseBody);
        } catch (err) {
          response = null;
        }
      }

      const payload = {
        requestId: req.requestId,
        correlationId: req.correlationId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        actorId: req.auth ? req.auth.userId : (response && response.actorId) || '',
        actorRole: req.auth ? req.auth.role : (response && response.actorRole) || '',
        schoolId: req.auth ? req.auth.schoolId : (response && response.schoolId) || '',
        ip: req.clientIp,
        ok: response && typeof response.ok === 'boolean' ? response.ok : undefined,
        errorCode: response && response.errorCode ? response.errorCode : '',
        message: response && response.message ? response.message : '',
      };

      if (res.statusCode >= 500) {
        logger.error('http_request_completed', payload);
      } else if (res.statusCode >= 400) {
        logger.warn('http_request_completed', payload);
      } else {
        logger.info('http_request_completed', payload);
      }
    });

    next();
  }

  _rateLimiterMw(req, res, next) {
    const ip = req.clientIp || 'unknown';
    const now = Date.now();
    const existing = this.rateLimitState.get(ip);

    if (!existing || now > existing.resetAt) {
      this.rateLimitState.set(ip, { count: 1, resetAt: now + this.rateWindowMs });
      return next();
    }

    if (existing.count >= this.rateMax) {
      const retryInSeconds = Math.ceil((existing.resetAt - now) / 1000);
      this.observability.inc('rateLimitHits');
      res.setHeader('Retry-After', retryInSeconds);
      return this.responseDispatcher.dispatch(res, {
        ok: false,
        code: 429,
        errors: 'rate limit exceeded',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      });
    }

    existing.count += 1;
    this.rateLimitState.set(ip, existing);
    next();
  }

  _healthLiveMw(req, res) {
    return res.status(200).json({
      ok: true,
      service: this.config.dotEnv.SERVICE_NAME,
      env: this.config.dotEnv.ENV,
      ts: new Date().toISOString(),
    });
  }

  _healthReadyMw(req, res) {
    const mongoReady = mongoose.connection.readyState === 1;
    if (!mongoReady) {
      return res.status(503).json({
        ok: false,
        ready: false,
        checks: {
          mongo: mongoReady,
        },
      });
    }

    return res.status(200).json({
      ok: true,
      ready: true,
      checks: {
        mongo: mongoReady,
      },
    });
  }

  _metricsMw(req, res) {
    return res.status(200).json({
      ok: true,
      metrics: this.observability.snapshot(),
    });
  }

  run() {
    app.disable('x-powered-by');

    app.use(this._requestContextMw.bind(this));
    app.use(this._observabilityMw.bind(this));
    app.use(this._corsMw());

    if (helmet) {
      app.use(
        helmet({
          contentSecurityPolicy: {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: [],
            },
          },
          hsts: {
            maxAge: 15552000,
            includeSubDomains: true,
            preload: true,
          },
        })
      );
    }

    app.use(this._securityMw.bind(this));
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.use('/static', express.static('public'));
    app.use(this._rateLimiterMw.bind(this));

    app.get('/health/live', this._healthLiveMw.bind(this));
    app.get('/health/ready', this._healthReadyMw.bind(this));
    app.get('/metrics', this._metricsMw.bind(this));

    app.all('/api/v1/:moduleName/:fnName', this.userApi.mw);
    app.all('/api/:moduleName/:fnName', this.userApi.mw);

    app.use((err, req, res, next) => {
      if (err && String(err.message || '').includes('Not allowed by CORS')) {
        return this.responseDispatcher.dispatch(res, {
          ok: false,
          code: 403,
          message: 'origin not allowed',
          errorCode: 'CORS_NOT_ALLOWED',
        });
      }
      logger.error('unhandled_http_error', {
        requestId: req.requestId || '',
        correlationId: req.correlationId || '',
        method: req.method || '',
        path: req.originalUrl || req.url || '',
        ip: req.clientIp || '',
        message: err && err.message ? err.message : 'unknown_error',
        stack: err && err.stack ? err.stack : '',
      });
      this.responseDispatcher.dispatch(res, {
        ok: false,
        code: 500,
        message: 'internal server error',
        errorCode: 'HTTP_UNHANDLED_EXCEPTION',
      });
    });

    const server = http.createServer(app);
    server.listen(this.config.dotEnv.USER_PORT, () => {
      logger.info('server_started', {
        service: String(this.config.dotEnv.SERVICE_NAME || '').toUpperCase(),
        port: this.config.dotEnv.USER_PORT,
      });
    });
  }
};
