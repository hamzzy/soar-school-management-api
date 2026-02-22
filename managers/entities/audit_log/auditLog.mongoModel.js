const mongoose = require('mongoose');

const { Schema } = mongoose;

const AuditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    requestId: { type: String, default: '', index: true },
    correlationId: { type: String, default: '', index: true },
    actorId: { type: String, default: '', index: true },
    actorRole: { type: String, default: '', index: true },
    schoolId: { type: String, default: '', index: true },
    targetType: { type: String, default: '', index: true },
    targetId: { type: String, default: '', index: true },
    status: { type: String, enum: ['success', 'failed'], required: true, index: true },
    errorCode: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
