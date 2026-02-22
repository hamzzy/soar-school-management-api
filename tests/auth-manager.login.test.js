const { test } = require('@jest/globals');
const assert = require('node:assert/strict');
const AuthManager = require('../managers/entities/auth/Auth.manager');

const buildManager = async ({ role = 'school_admin', status = 'active' } = {}) => {
  const password = 'VerySecurePass#1';
  const passwordHash = `hashed:${password}`;

  const userDoc = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Admin User',
    email: 'admin@school.edu',
    role,
    school: '507f1f77bcf86cd799439012',
    status,
    passwordHash,
    createdAt: '2026-02-22T00:00:00.000Z',
    updatedAt: '2026-02-22T00:00:00.000Z',
  };

  let createdRefreshToken = null;

  const manager = new AuthManager({
    validators: {
      auth: {
        login: async () => null,
      },
    },
    managers: {
      token: {
        genAccessToken: () => 'access-token',
        genRefreshToken: () => 'refresh-token',
        verifyRefreshToken: () => ({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      },
      security: {
        checkLoginAllowed: () => ({ allowed: true }),
        registerLoginResult: () => {},
      },
      audit: {
        logEvent: async () => {},
      },
      observability: {
        inc: () => {},
      },
    },
    repositories: {
      user: {
        findOneByEmail: async (email) => {
          if (email.toLowerCase() === userDoc.email) return userDoc;
          return null;
        },
      },
      school: {},
      refreshToken: {
        create: async (payload) => {
          createdRefreshToken = payload;
        },
      },
    },
  });

  return { manager, password, userDoc, getCreatedRefreshToken: () => createdRefreshToken };
};

test('school_admin can login and receive session tokens', async () => {
  const { manager, password, userDoc, getCreatedRefreshToken } = await buildManager({
    role: 'school_admin',
  });

  const result = await manager.login({
    email: userDoc.email,
    password,
    __requestMeta: { requestId: 'r1', correlationId: 'c1', ip: '1.2.3.4', userAgent: 'jest' },
  });

  assert.equal(result.code, undefined);
  assert.equal(result.user.role, 'school_admin');
  assert.equal(result.user.schoolId, String(userDoc.school));
  assert.equal(result.accessToken, 'access-token');
  assert.equal(result.refreshToken, 'refresh-token');
  assert.equal(getCreatedRefreshToken().user, userDoc._id);
});

test('login rejects inactive school_admin', async () => {
  const { manager, password, userDoc } = await buildManager({
    role: 'school_admin',
    status: 'inactive',
  });

  const result = await manager.login({
    email: userDoc.email,
    password,
    __requestMeta: { requestId: 'r1', correlationId: 'c1', ip: '1.2.3.4', userAgent: 'jest' },
  });

  assert.equal(result.code, 403);
  assert.equal(result.errorCode, 'AUTH_USER_INACTIVE');
});
