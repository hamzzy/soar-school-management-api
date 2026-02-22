const test = require('node:test');
const assert = require('node:assert/strict');

const policy = require('../managers/_common/access.policy');

test('school admin scope is hard constrained to assigned school', () => {
  const result = policy.resolveSchoolScope({
    auth: { role: 'school_admin', schoolId: '507f1f77bcf86cd799439011', userId: 'u1' },
    requestedSchoolId: '507f1f77bcf86cd799439022',
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.errorCode, 'SCOPE_SCHOOL_MISMATCH');
});

test('superadmin can scope to requested school', () => {
  const result = policy.resolveSchoolScope({
    auth: { role: 'superadmin', userId: 'u1' },
    requestedSchoolId: '507f1f77bcf86cd799439022',
  });

  assert.equal(result.ok, true);
  assert.equal(result.schoolId, '507f1f77bcf86cd799439022');
});
