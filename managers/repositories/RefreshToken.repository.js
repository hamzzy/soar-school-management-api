module.exports = class RefreshTokenRepository {
  constructor({ model }) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  findByTokenId(tokenId) {
    return this.model.findOne({ tokenId });
  }

  findActiveByTokenId(tokenId) {
    return this.model.findOne({ tokenId, status: 'active', revokedAt: null });
  }

  async revokeToken({ tokenId, replacedByTokenId = null, ip = '' }) {
    return this.model.updateOne(
      { tokenId, status: 'active' },
      {
        $set: {
          status: 'revoked',
          revokedAt: new Date(),
          replacedByTokenId,
          revokedByIp: ip,
        },
      }
    );
  }

  async revokeFamily({ familyId, ip = '' }) {
    return this.model.updateMany(
      { familyId, status: 'active' },
      {
        $set: {
          status: 'revoked',
          revokedAt: new Date(),
          revokedByIp: ip,
        },
      }
    );
  }
}
