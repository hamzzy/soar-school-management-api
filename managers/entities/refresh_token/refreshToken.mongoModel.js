const mongoose = require('mongoose');

const { Schema } = mongoose;

const RefreshTokenSchema = new Schema(
  {
    tokenId: { type: String, required: true, unique: true, index: true },
    familyId: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
    replacedByTokenId: { type: String, default: null },
    createdByIp: { type: String, default: '' },
    revokedByIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active', index: true },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ user: 1, status: 1 });
RefreshTokenSchema.index({ familyId: 1, status: 1 });

module.exports = mongoose.models.RefreshToken || mongoose.model('RefreshToken', RefreshTokenSchema);
