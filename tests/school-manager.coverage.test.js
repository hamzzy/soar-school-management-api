const test = require('node:test');
const assert = require('node:assert/strict');

const SchoolManager = require('../managers/entities/school/School.manager');

const SCHOOL_ID = '507f1f77bcf86cd799439011';

const makeSchoolDoc = (overrides = {}) => ({
  _id: SCHOOL_ID,
  name: 'School A',
  code: 'SCA',
  address: '',
  contactEmail: 'admin@school.com',
  contactPhone: '',
  profile: {},
  status: 'active',
  createdAt: '2026-02-22T00:00:00.000Z',
  updatedAt: '2026-02-22T00:00:00.000Z',
  __v: 0,
  _saveError: null,
  async save() {
    if (this._saveError) throw this._saveError;
    return this;
  },
  ...overrides,
});

const buildManager = (options = {}) => {
  const calls = {};
  const schoolDoc = options.schoolDoc || makeSchoolDoc();
  const validatorErrors = options.validatorErrors || {};

  const manager = new SchoolManager({
    validators: {
      school: {
        createSchool: async () => validatorErrors.createSchool || null,
        updateSchool: async () => validatorErrors.updateSchool || null,
        deleteSchool: async () => validatorErrors.deleteSchool || null,
        updateSchoolProfile: async () => validatorErrors.updateSchoolProfile || null,
      },
    },
    repositories: {
      school: {
        create: async (payload) => {
          calls.createPayload = payload;
          if (options.createError) throw options.createError;
          return makeSchoolDoc({ ...payload, _id: '507f1f77bcf86cd799439012' });
        },
        listPaginated: async (args) => {
          calls.listArgs = args;
          return options.listResult || { docs: [schoolDoc], nextCursor: null };
        },
        findByIdLean: async (id) => {
          calls.findByIdLean = id;
          if (Object.prototype.hasOwnProperty.call(options, 'findByIdLean')) {
            return options.findByIdLean;
          }
          return makeSchoolDoc({ _id: id });
        },
        findById: async (id) => {
          calls.findById = id;
          if (Object.prototype.hasOwnProperty.call(options, 'findById')) {
            return options.findById;
          }
          return schoolDoc;
        },
        deleteById: async (id) => {
          calls.deletedSchoolId = id;
        },
      },
      classroom: {
        countBySchoolId: async () => options.classroomsCount || 0,
      },
      student: {
        countBySchoolId: async () => options.studentsCount || 0,
      },
      user: {
        countSchoolAdminsBySchoolId: async () => options.adminsCount || 0,
      },
    },
    managers: {
      audit: {
        logEvent: async (event) => {
          calls.auditEvent = event;
        },
      },
    },
  });

  return { manager, calls, schoolDoc };
};

test('createSchool normalizes payload and returns created school', async () => {
  const { manager, calls } = buildManager();

  const result = await manager.createSchool({
    __auth: { role: 'superadmin', userId: 'u1' },
    name: 'Alpha',
    code: 'ab1',
    contactEmail: 'ADMIN@ALPHA.EDU',
  });

  assert.equal(result.code, 201);
  assert.equal(result.school.code, 'AB1');
  assert.equal(calls.createPayload.code, 'AB1');
  assert.equal(calls.createPayload.contactEmail, 'admin@alpha.edu');
});

test('createSchool handles duplicate code conflict', async () => {
  const { manager } = buildManager({ createError: { code: 11000 } });

  const result = await manager.createSchool({
    __auth: { role: 'superadmin', userId: 'u1' },
    name: 'Alpha',
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'SCHOOL_CODE_EXISTS');
});

test('listSchools denies non-superadmin role', async () => {
  const { manager } = buildManager();

  const result = await manager.listSchools({
    __auth: { role: 'school_admin', schoolId: SCHOOL_ID, userId: 'u1' },
    __query: {},
  });

  assert.equal(result.code, 403);
  assert.equal(result.errorCode, 'AUTH_FORBIDDEN');
});

test('getSchoolById requires schoolId', async () => {
  const { manager } = buildManager();

  const result = await manager.getSchoolById({
    __auth: { role: 'superadmin', userId: 'u1' },
  });

  assert.equal(result.code, 422);
  assert.equal(result.errorCode, 'VALIDATION_REQUIRED_SCHOOL_ID');
});

test('getSchoolById returns not found', async () => {
  const { manager } = buildManager({ findByIdLean: null });

  const result = await manager.getSchoolById({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
  });

  assert.equal(result.code, 404);
  assert.equal(result.errorCode, 'SCHOOL_NOT_FOUND');
});

test('updateSchool detects stale version before save', async () => {
  const doc = makeSchoolDoc({ __v: 3 });
  const { manager } = buildManager({ findById: doc });

  const result = await manager.updateSchool({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    expectedVersion: 2,
    name: 'Beta',
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'CONFLICT_STALE_VERSION');
});

test('updateSchool handles duplicate code conflict on save', async () => {
  const doc = makeSchoolDoc({ _saveError: { code: 11000 } });
  const { manager } = buildManager({ findById: doc });

  const result = await manager.updateSchool({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    code: 'dup',
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'SCHOOL_CODE_EXISTS');
});

test('deleteSchool returns not found when school missing', async () => {
  const { manager } = buildManager({ findByIdLean: null });

  const result = await manager.deleteSchool({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
  });

  assert.equal(result.code, 404);
  assert.equal(result.errorCode, 'SCHOOL_NOT_FOUND');
});

test('getSchoolProfile requires schoolId', async () => {
  const { manager } = buildManager();

  const result = await manager.getSchoolProfile({
    __auth: { role: 'superadmin', userId: 'u1' },
    __query: {},
  });

  assert.equal(result.code, 422);
  assert.equal(result.errorCode, 'VALIDATION_REQUIRED_SCHOOL_ID');
});

test('updateSchoolProfile handles VersionError conflict', async () => {
  const doc = makeSchoolDoc({ _saveError: { name: 'VersionError' } });
  const { manager } = buildManager({ findById: doc });

  const result = await manager.updateSchoolProfile({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    profile: { principal: 'Jane' },
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'CONFLICT_STALE_VERSION');
});

test('updateSchoolProfile handles generic persistence error', async () => {
  const doc = makeSchoolDoc({ _saveError: new Error('boom') });
  const { manager } = buildManager({ findById: doc });

  const result = await manager.updateSchoolProfile({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    profile: { principal: 'Jane' },
  });

  assert.equal(result.code, 500);
  assert.equal(result.errorCode, 'SCHOOL_PROFILE_UPDATE_FAILED');
});
