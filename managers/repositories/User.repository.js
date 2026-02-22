module.exports = class UserRepository {
  constructor({ model }) {
    this.model = model;
  }

  existsSuperadmin() {
    return this.model.exists({ role: 'superadmin' });
  }

  findById(id) {
    return this.model.findById(id);
  }

  findOneByEmail(email) {
    return this.model.findOne({ email: String(email).toLowerCase() });
  }

  existsByEmail(email) {
    return this.model.exists({ email: String(email).toLowerCase() });
  }

  create(payload) {
    return this.model.create(payload);
  }

  countSchoolAdminsBySchoolId(schoolId) {
    return this.model.countDocuments({ school: schoolId, role: 'school_admin' });
  }
}
