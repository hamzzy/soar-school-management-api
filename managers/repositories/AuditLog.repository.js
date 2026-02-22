module.exports = class AuditLogRepository {
  constructor({ model }) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  list({ filter = {}, limit = 100 }) {
    return this.model.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }
}
