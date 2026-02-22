const { test } = require('@jest/globals');
const assert = require('node:assert/strict');

const ClassroomManager = require('../managers/entities/classroom/Classroom.manager');

const SCHOOL_ID = '507f1f77bcf86cd799439011';
const OTHER_SCHOOL_ID = '507f1f77bcf86cd799439022';
const CLASSROOM_ID = '507f1f77bcf86cd799439031';

const makeClassroomDoc = (overrides = {}) => ({
  _id: CLASSROOM_ID,
  school: SCHOOL_ID,
  name: 'Grade 1 - A',
  gradeLevel: 'Grade 1',
  capacity: 25,
  resources: [],
  homeroomTeacher: '',
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
  const classroomDoc = options.classroomDoc || makeClassroomDoc();
  const validatorErrors = options.validatorErrors || {};

  const manager = new ClassroomManager({
    validators: {
      classroom: {
        createClassroom: async () => validatorErrors.createClassroom || null,
        updateClassroom: async () => validatorErrors.updateClassroom || null,
        deleteClassroom: async () => validatorErrors.deleteClassroom || null,
      },
    },
    repositories: {
      classroom: {
        create: async (payload) => {
          calls.createPayload = payload;
          if (options.createError) throw options.createError;
          return makeClassroomDoc({ ...payload });
        },
        listPaginated: async (args) => {
          calls.listArgs = args;
          return options.listResult || { docs: [classroomDoc], nextCursor: null };
        },
        findByIdLean: async (id) => {
          calls.findByIdLean = id;
          if (Object.prototype.hasOwnProperty.call(options, 'findByIdLean')) {
            return options.findByIdLean;
          }
          return makeClassroomDoc({ _id: id });
        },
        findById: async (id) => {
          calls.findById = id;
          if (Object.prototype.hasOwnProperty.call(options, 'findById')) {
            return options.findById;
          }
          return classroomDoc;
        },
        deleteById: async (id) => {
          calls.deletedClassroomId = id;
        },
      },
      school: {
        findByIdLean: async (id) => {
          if (options.schoolMissing) return null;
          return { _id: id };
        },
      },
      student: {
        countByClassroomId: async () => options.studentsCount || 0,
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

  return { manager, calls, classroomDoc };
};

test('createClassroom returns school not found', async () => {
  const { manager } = buildManager({ schoolMissing: true });

  const result = await manager.createClassroom({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    name: 'A1',
    capacity: 20,
  });

  assert.equal(result.code, 404);
  assert.equal(result.errorCode, 'SCHOOL_NOT_FOUND');
});

test('createClassroom handles duplicate conflict', async () => {
  const { manager } = buildManager({ createError: { code: 11000 } });

  const result = await manager.createClassroom({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    name: 'A1',
    capacity: 20,
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'CLASSROOM_NAME_EXISTS');
});

test('listClassrooms applies school-admin scoped filter', async () => {
  const { manager, calls } = buildManager();

  const result = await manager.listClassrooms({
    __auth: { role: 'school_admin', schoolId: SCHOOL_ID, userId: 'u1' },
    __query: { limit: '10' },
  });

  assert.equal(result.classrooms.length, 1);
  assert.equal(calls.listArgs.filter.school, SCHOOL_ID);
  assert.equal(calls.listArgs.pagination.limit, 10);
});

test('getClassroomById requires classroomId', async () => {
  const { manager } = buildManager();

  const result = await manager.getClassroomById({
    __auth: { role: 'superadmin', userId: 'u1' },
  });

  assert.equal(result.code, 422);
  assert.equal(result.errorCode, 'VALIDATION_REQUIRED_CLASSROOM_ID');
});

test('getClassroomById enforces school scope for school admin', async () => {
  const { manager } = buildManager({ findByIdLean: makeClassroomDoc({ school: OTHER_SCHOOL_ID }) });

  const result = await manager.getClassroomById({
    __auth: { role: 'school_admin', schoolId: SCHOOL_ID, userId: 'u1' },
    classroomId: CLASSROOM_ID,
  });

  assert.equal(result.code, 403);
  assert.equal(result.errorCode, 'AUTH_FORBIDDEN');
});

test('updateClassroom returns stale version conflict', async () => {
  const doc = makeClassroomDoc({ __v: 5 });
  const { manager } = buildManager({ findById: doc });

  const result = await manager.updateClassroom({
    __auth: { role: 'superadmin', userId: 'u1' },
    classroomId: CLASSROOM_ID,
    expectedVersion: 4,
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'CONFLICT_STALE_VERSION');
});

test('updateClassroom handles duplicate conflict', async () => {
  const doc = makeClassroomDoc({ _saveError: { code: 11000 } });
  const { manager } = buildManager({ findById: doc });

  const result = await manager.updateClassroom({
    __auth: { role: 'superadmin', userId: 'u1' },
    classroomId: CLASSROOM_ID,
    name: 'A2',
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'CLASSROOM_NAME_EXISTS');
});

test('deleteClassroom blocks deletion with enrolled students', async () => {
  const { manager } = buildManager({ studentsCount: 2 });

  const result = await manager.deleteClassroom({
    __auth: { role: 'superadmin', userId: 'u1' },
    classroomId: CLASSROOM_ID,
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'CLASSROOM_HAS_STUDENTS');
});

test('deleteClassroom logs audit metadata on success', async () => {
  const { manager, calls } = buildManager();

  const result = await manager.deleteClassroom({
    __auth: { role: 'superadmin', userId: 'u1' },
    classroomId: CLASSROOM_ID,
    __requestMeta: { requestId: 'r1', correlationId: 'c1' },
    __device: { ip: '1.1.1.1', agent: 'ua' },
  });

  assert.equal(result.success, true);
  assert.equal(calls.deletedClassroomId, CLASSROOM_ID);
  assert.equal(calls.auditEvent.requestMeta.requestId, 'r1');
  assert.equal(calls.auditEvent.requestMeta.userAgent, 'ua');
});
