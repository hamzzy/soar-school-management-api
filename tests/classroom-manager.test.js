const test = require('node:test');
const assert = require('node:assert/strict');

const ClassroomManager = require('../managers/entities/classroom/Classroom.manager');

const buildManager = ({ schoolExists = true } = {}) => {
  let createdPayload = null;

  const manager = new ClassroomManager({
    validators: {
      classroom: {
        createClassroom: async () => null,
      },
    },
    repositories: {
      classroom: {
        create: async (payload) => {
          createdPayload = payload;
          return {
            ...payload,
            _id: 'classroom-1',
            __v: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        },
      },
      school: {
        findByIdLean: async (id) => {
          if (!schoolExists) return null;
          return { _id: id };
        },
      },
      student: {
        countByClassroomId: async () => 0,
      },
    },
    managers: {
      audit: { logEvent: async () => {} },
    },
  });

  return { manager, getCreatedPayload: () => createdPayload };
};

test('school admin cannot create classroom outside assigned school', async () => {
  const { manager } = buildManager();

  const result = await manager.createClassroom({
    __auth: { role: 'school_admin', schoolId: '507f1f77bcf86cd799439011', userId: 'u1' },
    schoolId: '507f1f77bcf86cd799439022',
    name: 'A1',
    capacity: 20,
  });

  assert.equal(result.code, 403);
  assert.equal(result.errorCode, 'SCOPE_SCHOOL_MISMATCH');
});

test('superadmin must provide schoolId for classroom creation', async () => {
  const { manager } = buildManager();

  const result = await manager.createClassroom({
    __auth: { role: 'superadmin', userId: 'u1' },
    name: 'A1',
    capacity: 20,
  });

  assert.equal(result.code, 422);
});

test('school admin can create classroom in assigned school', async () => {
  const { manager, getCreatedPayload } = buildManager();

  const schoolId = '507f1f77bcf86cd799439011';
  const result = await manager.createClassroom({
    __auth: { role: 'school_admin', schoolId, userId: 'u1' },
    name: 'A1',
    capacity: 20,
    resources: ['projector'],
  });

  assert.equal(result.code, 201);
  assert.equal(result.classroom.schoolId, schoolId);
  assert.equal(getCreatedPayload().school, schoolId);
});
