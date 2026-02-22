const { test } = require('@jest/globals');
const assert = require('node:assert/strict');

const StudentManager = require('../managers/entities/student/Student.manager');

const SCHOOL_ID = '507f1f77bcf86cd799439011';
const OTHER_SCHOOL_ID = '507f1f77bcf86cd799439022';
const CLASSROOM_ID = '507f1f77bcf86cd799439031';
const OTHER_CLASSROOM_ID = '507f1f77bcf86cd799439032';
const STUDENT_ID = '507f1f77bcf86cd799439041';

const makeStudentDoc = (overrides = {}) => ({
  _id: STUDENT_ID,
  school: SCHOOL_ID,
  classroom: CLASSROOM_ID,
  firstName: 'John',
  lastName: 'Doe',
  admissionNumber: 'A-1',
  email: 'john@student.edu',
  dateOfBirth: '2012-01-01',
  profile: {},
  status: 'active',
  enrolledAt: '2026-02-22T00:00:00.000Z',
  createdAt: '2026-02-22T00:00:00.000Z',
  updatedAt: '2026-02-22T00:00:00.000Z',
  __v: 0,
  _saveError: null,
  saveCalled: 0,
  async save() {
    if (this._saveError) throw this._saveError;
    this.saveCalled += 1;
    return this;
  },
  ...overrides,
});

const buildManager = (options = {}) => {
  const calls = {};
  const studentDoc = options.studentDoc || makeStudentDoc();
  const validatorErrors = options.validatorErrors || {};

  const classroomById = options.classroomById || {};

  const manager = new StudentManager({
    validators: {
      student: {
        createStudent: async () => validatorErrors.createStudent || null,
        updateStudent: async () => validatorErrors.updateStudent || null,
        transferStudent: async () => validatorErrors.transferStudent || null,
        deleteStudent: async () => validatorErrors.deleteStudent || null,
      },
    },
    repositories: {
      student: {
        create: async (payload) => {
          calls.createPayload = payload;
          if (options.createError) throw options.createError;
          return makeStudentDoc({ ...payload, _id: '507f1f77bcf86cd799439099' });
        },
        listPaginated: async (args) => {
          calls.listArgs = args;
          return options.listResult || { docs: [studentDoc], nextCursor: null };
        },
        findById: async () => {
          if (Object.prototype.hasOwnProperty.call(options, 'findById')) {
            return options.findById;
          }
          return studentDoc;
        },
        findByIdLean: async () => {
          if (Object.prototype.hasOwnProperty.call(options, 'findByIdLean')) {
            return options.findByIdLean;
          }
          return { ...studentDoc };
        },
        deleteById: async (id) => {
          calls.deletedStudentId = id;
        },
      },
      school: {
        findByIdLean: async (id) => {
          if (options.missingSchoolIds && options.missingSchoolIds.includes(String(id))) return null;
          return { _id: id };
        },
      },
      classroom: {
        findByIdLean: async (id) => {
          if (Object.prototype.hasOwnProperty.call(classroomById, String(id))) {
            return classroomById[String(id)];
          }
          return { _id: id, school: SCHOOL_ID };
        },
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

  return { manager, calls, studentDoc };
};

test('createStudent returns not found when school is missing', async () => {
  const { manager } = buildManager({ missingSchoolIds: [SCHOOL_ID] });

  const result = await manager.createStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    firstName: 'John',
    lastName: 'Doe',
    admissionNumber: 'A-2',
  });

  assert.equal(result.code, 404);
  assert.equal(result.errorCode, 'SCHOOL_NOT_FOUND');
});

test('createStudent rejects classroom-school mismatch', async () => {
  const { manager } = buildManager({
    classroomById: {
      [CLASSROOM_ID]: { _id: CLASSROOM_ID, school: OTHER_SCHOOL_ID },
    },
  });

  const result = await manager.createStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    classroomId: CLASSROOM_ID,
    firstName: 'John',
    lastName: 'Doe',
    admissionNumber: 'A-2',
  });

  assert.equal(result.code, 422);
  assert.equal(result.errorCode, 'CLASSROOM_SCHOOL_MISMATCH');
});

test('createStudent handles duplicate email conflict', async () => {
  const { manager } = buildManager({
    createError: { code: 11000, keyPattern: { email: 1 } },
  });

  const result = await manager.createStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: SCHOOL_ID,
    firstName: 'John',
    lastName: 'Doe',
    admissionNumber: 'A-2',
    email: 'dup@student.edu',
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'STUDENT_EMAIL_EXISTS');
});

test('listStudents returns classroom not found', async () => {
  const { manager } = buildManager({
    classroomById: { [CLASSROOM_ID]: null },
  });

  const result = await manager.listStudents({
    __auth: { role: 'superadmin', userId: 'u1' },
    __query: { classroomId: CLASSROOM_ID },
  });

  assert.equal(result.code, 404);
  assert.equal(result.errorCode, 'CLASSROOM_NOT_FOUND');
});

test('listStudents enforces scope on classroom school', async () => {
  const { manager } = buildManager({
    classroomById: { [CLASSROOM_ID]: { _id: CLASSROOM_ID, school: OTHER_SCHOOL_ID } },
  });

  const result = await manager.listStudents({
    __auth: { role: 'school_admin', schoolId: SCHOOL_ID, userId: 'u1' },
    __query: { classroomId: CLASSROOM_ID },
  });

  assert.equal(result.code, 403);
  assert.equal(result.errorCode, 'AUTH_FORBIDDEN');
});

test('getStudentById requires studentId', async () => {
  const { manager } = buildManager();

  const result = await manager.getStudentById({
    __auth: { role: 'superadmin', userId: 'u1' },
  });

  assert.equal(result.code, 422);
  assert.equal(result.errorCode, 'VALIDATION_REQUIRED_STUDENT_ID');
});

test('updateStudent returns stale version conflict', async () => {
  const studentDoc = makeStudentDoc({ __v: 4 });
  const { manager } = buildManager({ findById: studentDoc });

  const result = await manager.updateStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    studentId: STUDENT_ID,
    expectedVersion: 3,
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'CONFLICT_STALE_VERSION');
});

test('updateStudent handles duplicate email conflict', async () => {
  const studentDoc = makeStudentDoc({ _saveError: { code: 11000, keyPattern: { email: 1 } } });
  const { manager } = buildManager({ findById: studentDoc });

  const result = await manager.updateStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    studentId: STUDENT_ID,
    email: 'dup@student.edu',
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'STUDENT_EMAIL_EXISTS');
});

test('transferStudent returns target school not found', async () => {
  const { manager } = buildManager({ missingSchoolIds: [OTHER_SCHOOL_ID] });

  const result = await manager.transferStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    studentId: STUDENT_ID,
    targetSchoolId: OTHER_SCHOOL_ID,
  });

  assert.equal(result.code, 404);
  assert.equal(result.errorCode, 'SCHOOL_NOT_FOUND');
});

test('transferStudent rejects target classroom mismatch', async () => {
  const { manager } = buildManager({
    classroomById: {
      [OTHER_CLASSROOM_ID]: { _id: OTHER_CLASSROOM_ID, school: OTHER_SCHOOL_ID },
    },
  });

  const result = await manager.transferStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    studentId: STUDENT_ID,
    targetSchoolId: SCHOOL_ID,
    targetClassroomId: OTHER_CLASSROOM_ID,
  });

  assert.equal(result.code, 422);
  assert.equal(result.errorCode, 'CLASSROOM_SCHOOL_MISMATCH');
});

test('transferStudent handles duplicate admission conflict', async () => {
  const studentDoc = makeStudentDoc({ _saveError: { code: 11000 } });
  const { manager } = buildManager({ findById: studentDoc });

  const result = await manager.transferStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    studentId: STUDENT_ID,
    targetSchoolId: SCHOOL_ID,
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'STUDENT_ADMISSION_EXISTS');
});

test('deleteStudent enforces school scope', async () => {
  const { manager } = buildManager({
    findByIdLean: makeStudentDoc({ school: OTHER_SCHOOL_ID }),
  });

  const result = await manager.deleteStudent({
    __auth: { role: 'school_admin', schoolId: SCHOOL_ID, userId: 'u1' },
    studentId: STUDENT_ID,
  });

  assert.equal(result.code, 403);
  assert.equal(result.errorCode, 'AUTH_FORBIDDEN');
});

test('deleteStudent deletes entity on success', async () => {
  const { manager, calls } = buildManager();

  const result = await manager.deleteStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    studentId: STUDENT_ID,
  });

  assert.equal(result.success, true);
  assert.equal(calls.deletedStudentId, STUDENT_ID);
});
