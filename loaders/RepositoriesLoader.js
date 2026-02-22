const UserRepository = require('../managers/repositories/User.repository');
const SchoolRepository = require('../managers/repositories/School.repository');
const ClassroomRepository = require('../managers/repositories/Classroom.repository');
const StudentRepository = require('../managers/repositories/Student.repository');
const RefreshTokenRepository = require('../managers/repositories/RefreshToken.repository');
const AuditLogRepository = require('../managers/repositories/AuditLog.repository');

module.exports = class RepositoriesLoader {
  constructor({ mongomodels }) {
    this.mongomodels = mongomodels;
  }

  load() {
    return {
      user: new UserRepository({ model: this.mongomodels.user }),
      school: new SchoolRepository({ model: this.mongomodels.school }),
      classroom: new ClassroomRepository({ model: this.mongomodels.classroom }),
      student: new StudentRepository({ model: this.mongomodels.student }),
      refreshToken: new RefreshTokenRepository({ model: this.mongomodels.refreshToken }),
      auditLog: new AuditLogRepository({ model: this.mongomodels.auditLog }),
    };
  }
};
