const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const accessPolicy = require('../../_common/access.policy');
const logger = require('../../../libs/logger');

module.exports = class Auth {
  constructor({ validators, managers, repositories }) {
    this.validators = validators;
    this.tokenManager = managers.token;
    this.security = managers.security;
    this.audit = managers.audit;
    this.observability = managers.observability;

    this.userRepo = repositories.user;
    this.schoolRepo = repositories.school;
    this.refreshTokenRepo = repositories.refreshToken;

    this.httpExposed = [
      'post=bootstrapSuperadmin',
      'post=login',
      'post=refreshSession',
      'post=logout',
      'post=createSchoolAdmin',
      'get=me',
    ];
  }

  async _validate(schemaName, payload) {
    const schema = this.validators.auth && this.validators.auth[schemaName];
    if (!schema) return null;
    const errors = await schema(payload);
    if (errors) {
      return {
        code: 422,
        errors,
        errorCode: 'VALIDATION_FAILED',
      };
    }
    return null;
  }

  _toPublicUser(userDoc) {
    const schoolId = userDoc.school ? String(userDoc.school) : null;
    return {
      id: String(userDoc._id),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      schoolId,
      status: userDoc.status,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt,
    };
  }

  _requestMeta({ __requestMeta, __device }) {
    return {
      requestId: (__requestMeta && __requestMeta.requestId) || '',
      correlationId: (__requestMeta && __requestMeta.correlationId) || '',
      ip: ((__requestMeta && __requestMeta.ip) || (__device && __device.ip) || '').toString(),
      userAgent: ((__requestMeta && __requestMeta.userAgent) || (__device && __device.agent) || '').toString(),
    };
  }

  async _issueSession({ userDoc, requestMeta, familyId }) {
    const sessionId = nanoid();
    const deviceId = `${requestMeta.ip}:${requestMeta.userAgent}`;

    const accessToken = this.tokenManager.genAccessToken({
      userId: String(userDoc._id),
      userKey: String(userDoc._id),
      role: userDoc.role,
      schoolId: userDoc.school ? String(userDoc.school) : null,
      sessionId,
      deviceId,
    });

    const refreshTokenId = nanoid();
    const refreshFamilyId = familyId || nanoid();

    const refreshToken = this.tokenManager.genRefreshToken({
      userId: String(userDoc._id),
      tokenId: refreshTokenId,
      familyId: refreshFamilyId,
      sessionId,
      deviceId,
    });

    const decodedRefresh = this.tokenManager.verifyRefreshToken({ token: refreshToken });
    const expiresAt = new Date((decodedRefresh.exp || 0) * 1000);

    await this.refreshTokenRepo.create({
      tokenId: refreshTokenId,
      familyId: refreshFamilyId,
      user: userDoc._id,
      expiresAt,
      createdByIp: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    });

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      sessionId,
      refreshTokenId,
      refreshFamilyId,
    };
  }

  async fetchActiveUserById({ userId }) {
    if (!userId) return null;
    const user = await this.userRepo.findById(userId);
    if (!user || user.status !== 'active') return null;
    return user;
  }

  async bootstrapSuperadmin({ name, email, password, __requestMeta, __device }) {
    const validationError = await this._validate('bootstrapSuperadmin', { name, email, password });
    if (validationError) return validationError;

    const superadminExists = await this.userRepo.existsSuperadmin();
    if (superadminExists) {
      return { code: 409, error: 'superadmin is already initialized', errorCode: 'SUPERADMIN_ALREADY_EXISTS' };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user = null;
    try {
      user = await this.userRepo.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'superadmin',
        school: null,
        status: 'active',
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return { code: 409, error: 'email already exists', errorCode: 'USER_EMAIL_EXISTS' };
      }
      return { code: 500, error: 'failed to create superadmin', errorCode: 'SUPERADMIN_CREATE_FAILED' };
    }

    const requestMeta = this._requestMeta({ __requestMeta, __device });
    const session = await this._issueSession({ userDoc: user, requestMeta });

    return {
      code: 201,
      user: this._toPublicUser(user),
      ...session,
    };
  }

  async login({ email, password, __requestMeta, __device, res }) {
    const validationError = await this._validate('login', { email, password });
    if (validationError) return validationError;

    const requestMeta = this._requestMeta({ __requestMeta, __device });

    const loginAllow = this.security.checkLoginAllowed({ email, ip: requestMeta.ip });
    if (!loginAllow.allowed) {
      if (res && res.setHeader) {
        res.setHeader('Retry-After', loginAllow.retryAfterSeconds);
      }
      this.observability.inc('loginFailures');
      logger.warn('auth_login_rate_limited', {
        requestId: requestMeta.requestId,
        correlationId: requestMeta.correlationId,
        email: String(email || '').toLowerCase(),
        ip: requestMeta.ip,
        errorCode: 'AUTH_LOGIN_RATE_LIMITED',
      });
      return {
        code: 429,
        error: 'too many failed login attempts, retry later',
        errorCode: 'AUTH_LOGIN_RATE_LIMITED',
      };
    }

    const user = await this.userRepo.findOneByEmail(email);
    if (!user) {
      this.security.registerLoginResult({ email, ip: requestMeta.ip, success: false });
      this.observability.inc('loginFailures');
      logger.warn('auth_login_failed', {
        requestId: requestMeta.requestId,
        correlationId: requestMeta.correlationId,
        email: String(email || '').toLowerCase(),
        ip: requestMeta.ip,
        reason: 'user_not_found',
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      });
      return { code: 401, error: 'invalid credentials', errorCode: 'AUTH_INVALID_CREDENTIALS' };
    }

    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
      this.security.registerLoginResult({ email, ip: requestMeta.ip, success: false });
      this.observability.inc('loginFailures');
      logger.warn('auth_login_failed', {
        requestId: requestMeta.requestId,
        correlationId: requestMeta.correlationId,
        email: String(email || '').toLowerCase(),
        ip: requestMeta.ip,
        userId: String(user._id),
        role: user.role,
        reason: 'password_mismatch',
        errorCode: 'AUTH_INVALID_CREDENTIALS',
      });
      return { code: 401, error: 'invalid credentials', errorCode: 'AUTH_INVALID_CREDENTIALS' };
    }

    if (user.status !== 'active') {
      logger.warn('auth_login_failed', {
        requestId: requestMeta.requestId,
        correlationId: requestMeta.correlationId,
        email: String(email || '').toLowerCase(),
        ip: requestMeta.ip,
        userId: String(user._id),
        role: user.role,
        reason: 'inactive_user',
        errorCode: 'AUTH_USER_INACTIVE',
      });
      return { code: 403, error: 'user is inactive', errorCode: 'AUTH_USER_INACTIVE' };
    }

    this.security.registerLoginResult({ email, ip: requestMeta.ip, success: true });
    const session = await this._issueSession({ userDoc: user, requestMeta });

    await this.audit.logEvent({
      action: 'auth.login',
      status: 'success',
      actor: {
        userId: String(user._id),
        role: user.role,
        schoolId: user.school ? String(user.school) : null,
      },
      requestMeta,
    });

    logger.info('auth_login_success', {
      requestId: requestMeta.requestId,
      correlationId: requestMeta.correlationId,
      userId: String(user._id),
      role: user.role,
      schoolId: user.school ? String(user.school) : null,
      ip: requestMeta.ip,
    });

    return {
      user: this._toPublicUser(user),
      ...session,
    };
  }

  async refreshSession({ refreshToken, __requestMeta, __device }) {
    const validationError = await this._validate('refreshSession', { refreshToken });
    if (validationError) return validationError;

    const requestMeta = this._requestMeta({ __requestMeta, __device });
    const decoded = this.tokenManager.verifyRefreshToken({ token: refreshToken });

    if (!decoded || decoded.typ !== 'refresh' || !decoded.userId || !decoded.tokenId || !decoded.familyId) {
      return { code: 401, error: 'invalid refresh token', errorCode: 'AUTH_INVALID_REFRESH_TOKEN' };
    }

    const activeToken = await this.refreshTokenRepo.findActiveByTokenId(decoded.tokenId);
    if (!activeToken) {
      const existingToken = await this.refreshTokenRepo.findByTokenId(decoded.tokenId);
      if (existingToken && existingToken.familyId) {
        await this.refreshTokenRepo.revokeFamily({ familyId: existingToken.familyId, ip: requestMeta.ip });
      }
      return { code: 401, error: 'refresh token is revoked', errorCode: 'AUTH_REFRESH_TOKEN_REVOKED' };
    }

    if (new Date(activeToken.expiresAt).getTime() <= Date.now()) {
      await this.refreshTokenRepo.revokeToken({ tokenId: activeToken.tokenId, ip: requestMeta.ip });
      return { code: 401, error: 'refresh token expired', errorCode: 'AUTH_REFRESH_TOKEN_EXPIRED' };
    }

    const user = await this.fetchActiveUserById({ userId: decoded.userId });
    if (!user) {
      await this.refreshTokenRepo.revokeFamily({ familyId: activeToken.familyId, ip: requestMeta.ip });
      return { code: 401, error: 'invalid refresh token', errorCode: 'AUTH_INVALID_REFRESH_TOKEN' };
    }

    const session = await this._issueSession({
      userDoc: user,
      requestMeta,
      familyId: activeToken.familyId,
    });

    await this.refreshTokenRepo.revokeToken({
      tokenId: activeToken.tokenId,
      replacedByTokenId: session.refreshTokenId,
      ip: requestMeta.ip,
    });

    return {
      user: this._toPublicUser(user),
      ...session,
    };
  }

  async logout({ refreshToken, __requestMeta, __device }) {
    const validationError = await this._validate('logout', { refreshToken });
    if (validationError) return validationError;

    const requestMeta = this._requestMeta({ __requestMeta, __device });
    const decoded = this.tokenManager.verifyRefreshToken({ token: refreshToken });

    if (!decoded || !decoded.tokenId) {
      return { success: true };
    }

    await this.refreshTokenRepo.revokeToken({ tokenId: decoded.tokenId, ip: requestMeta.ip });
    return { success: true };
  }

  async createSchoolAdmin({ __auth, __superadmin, __requestMeta, __device, name, email, password, schoolId }) {
    const validationError = await this._validate('createSchoolAdmin', {
      name,
      email,
      password,
      schoolId,
    });
    if (validationError) return validationError;

    const roleCheck = accessPolicy.ensureRole({ auth: __auth, roles: ['superadmin'] });
    if (!roleCheck.ok) return roleCheck.error;

    const school = await this.schoolRepo.findByIdLean(schoolId);
    if (!school) {
      return { code: 404, error: 'school not found', errorCode: 'SCHOOL_NOT_FOUND' };
    }

    const exists = await this.userRepo.existsByEmail(email);
    if (exists) {
      return { code: 409, error: 'email already exists', errorCode: 'USER_EMAIL_EXISTS' };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let user = null;
    try {
      user = await this.userRepo.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'school_admin',
        school: school._id,
        status: 'active',
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return { code: 409, error: 'email already exists', errorCode: 'USER_EMAIL_EXISTS' };
      }
      return { code: 500, error: 'failed to create school admin', errorCode: 'SCHOOL_ADMIN_CREATE_FAILED' };
    }

    await this.audit.logEvent({
      action: 'auth.create_school_admin',
      status: 'success',
      actor: __auth,
      target: { type: 'user', id: String(user._id), schoolId },
      requestMeta: this._requestMeta({ __requestMeta, __device }),
      metadata: { createdRole: 'school_admin' },
    });

    return {
      code: 201,
      user: this._toPublicUser(user),
    };
  }

  async me({ __auth }) {
    const authCheck = accessPolicy.ensureAuthenticated({ auth: __auth });
    if (!authCheck.ok) return authCheck.error;

    const user = await this.userRepo.findById(__auth.userId);
    if (!user) {
      return { code: 404, error: 'user not found', errorCode: 'USER_NOT_FOUND' };
    }

    return {
      user: this._toPublicUser(user),
    };
  }
};
