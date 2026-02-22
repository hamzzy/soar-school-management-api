const test = require('node:test');
const assert = require('node:assert/strict');

const SchoolManager = require('../managers/entities/school/School.manager');

const buildManager = ({ classrooms = 0, students = 0, admins = 0 } = {}) => {
  return new SchoolManager({
    validators: {
      school: {
        deleteSchool: async () => null,
      },
    },
    repositories: {
      school: {
        findByIdLean: async (id) => ({ _id: id, name: 'School A' }),
        deleteById: async () => ({ acknowledged: true }),
      },
      classroom: {
        countBySchoolId: async () => classrooms,
      },
      student: {
        countBySchoolId: async () => students,
      },
      user: {
        countSchoolAdminsBySchoolId: async () => admins,
      },
    },
    managers: {
      audit: { logEvent: async () => {} },
    },
  });
};

test('cannot delete school if linked resources exist', async () => {
  const manager = buildManager({ classrooms: 1 });

  const result = await manager.deleteSchool({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: '507f1f77bcf86cd799439011',
  });

  assert.equal(result.code, 409);
  assert.equal(result.errorCode, 'SCHOOL_HAS_LINKED_RESOURCES');
});

test('can delete school when no linked resources', async () => {
  const manager = buildManager();

  const result = await manager.deleteSchool({
    __auth: { role: 'superadmin', userId: 'u1' },
    schoolId: '507f1f77bcf86cd799439011',
  });

  assert.equal(result.success, true);
});
