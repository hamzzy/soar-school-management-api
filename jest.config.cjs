module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  moduleNameMapper: {
    '^bcrypt$': '<rootDir>/tests/__mocks__/bcrypt.js',
  },
  collectCoverageFrom: [
    'docs/**/*.js',
    'managers/_common/access.policy.js',
    'managers/_common/pagination.js',
    'managers/entities/auth/Auth.manager.js',
    'managers/entities/school/School.manager.js',
    'managers/entities/classroom/Classroom.manager.js',
    'managers/entities/student/Student.manager.js',
    'mws/__auth.mw.js',
  ],
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 40,
    },
  },
};
