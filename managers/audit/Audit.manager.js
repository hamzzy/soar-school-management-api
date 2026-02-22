const logger = require('../../libs/logger');

module.exports = class Audit {
  constructor({ repositories }) {
    this.auditRepo = repositories.auditLog;
  }

  async logEvent({
    action,
    status = 'success',
    errorCode = '',
    actor = {},
    target = {},
    requestMeta = {},
    metadata = {},
  }) {
    const payload = {
      action,
      status,
      errorCode,
      requestId: requestMeta.requestId || '',
      correlationId: requestMeta.correlationId || '',
      actorId: actor.userId || '',
      actorRole: actor.role || '',
      schoolId: actor.schoolId || target.schoolId || '',
      targetType: target.type || '',
      targetId: target.id || '',
      ip: requestMeta.ip || '',
      userAgent: requestMeta.userAgent || '',
      metadata,
    };

    try {
      await this.auditRepo.create(payload);
    } catch (err) {
      logger.error('audit_log_failed', {
        action,
        requestId: payload.requestId,
        reason: err && err.message ? err.message : 'unknown_error',
      });
    }
  }
};
