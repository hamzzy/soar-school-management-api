const { test } = require('@jest/globals');
const assert = require('node:assert/strict');

const buildRes = () => {
  let payload = null;
  return {
    get payload() {
      return payload;
    },
    status(code) {
      return {
        send(data) {
          payload = { code, data };
        },
      };
    },
    getHeader() {
      return '';
    },
  };
};

test('auth middleware accepts bearer token', async () => {
  const mwFactory = require('../mws/__auth.mw');
  const mw = mwFactory({
    managers: {
      observability: { inc: () => {} },
      token: { verifyAccessToken: () => ({ userId: 'u1' }) },
      auth: {
        fetchActiveUserById: async () => ({ _id: 'u1', role: 'superadmin', school: null, email: 'a@b.c', name: 'A' }),
      },
      responseDispatcher: {
        dispatch: (res, payload) => {
          res.status(payload.code || 400).send(payload);
        },
      },
    },
  });

  const req = { headers: { authorization: 'Bearer abc' } };
  const res = buildRes();

  let authCtx = null;
  await mw({ req, res, next: (ctx) => { authCtx = ctx; } });

  assert.equal(authCtx.userId, 'u1');
  assert.equal(res.payload, null);
});

test('auth middleware rejects missing token', async () => {
  const mwFactory = require('../mws/__auth.mw');
  const mw = mwFactory({
    managers: {
      observability: { inc: () => {} },
      token: { verifyAccessToken: () => null },
      auth: { fetchActiveUserById: async () => null },
      responseDispatcher: {
        dispatch: (res, payload) => {
          res.status(payload.code || 400).send(payload);
        },
      },
    },
  });

  const req = { headers: {} };
  const res = buildRes();

  await mw({ req, res, next: () => {} });

  assert.equal(res.payload.code, 401);
  assert.equal(res.payload.data.errorCode, 'AUTH_MISSING_TOKEN');
});
