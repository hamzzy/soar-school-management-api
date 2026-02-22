const { test } = require('@jest/globals');
const assert = require('node:assert/strict');

const StudentManager = require('../managers/entities/student/Student.manager');

const buildManager = () => {
  const studentDoc = {
    _id: '507f1f77bcf86cd799439031',
    school: '507f1f77bcf86cd799439011',
    classroom: '507f1f77bcf86cd799439021',
    firstName: 'John',
    lastName: 'Doe',
    admissionNumber: 'A-1',
    __v: 0,
    saveCalled: 0,
    save: async function () {
      this.saveCalled += 1;
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const manager = new StudentManager({
    validators: {
      student: {
        transferStudent: async () => null,
      },
    },
    repositories: {
      student: {
        findById: async () => studentDoc,
        findByIdLean: async () => ({ ...studentDoc }),
      },
      school: {
        findByIdLean: async (id) => ({ _id: id }),
      },
      classroom: {
        findByIdLean: async () => ({ _id: '507f1f77bcf86cd799439099', school: '507f1f77bcf86cd799439022' }),
      },
    },
    managers: {
      audit: { logEvent: async () => {} },
    },
  });

  return {
    manager,
    getStudentDoc: () => studentDoc,
  };
};

test('school admin cannot transfer student to another school', async () => {
  const { manager } = buildManager();

  const result = await manager.transferStudent({
    __auth: { role: 'school_admin', schoolId: '507f1f77bcf86cd799439011', userId: 'u1' },
    studentId: '507f1f77bcf86cd799439031',
    targetSchoolId: '507f1f77bcf86cd799439022',
  });

  assert.equal(result.code, 403);
  assert.equal(result.errorCode, 'SCOPE_SCHOOL_MISMATCH');
});

test('superadmin can transfer student across schools', async () => {
  const { manager, getStudentDoc } = buildManager();

  const result = await manager.transferStudent({
    __auth: { role: 'superadmin', userId: 'u1' },
    studentId: '507f1f77bcf86cd799439031',
    targetSchoolId: '507f1f77bcf86cd799439022',
    targetClassroomId: '507f1f77bcf86cd799439099',
  });

  assert.equal(result.student.schoolId, '507f1f77bcf86cd799439022');
  assert.equal(result.student.classroomId, '507f1f77bcf86cd799439099');
  assert.equal(getStudentDoc().saveCalled, 1);
});
