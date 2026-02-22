module.exports = {
  bootstrapSuperadmin: [
    { model: 'personName', required: true },
    { model: 'userEmail', required: true },
    { model: 'password', required: true },
  ],
  login: [
    { model: 'userEmail', required: true },
    { model: 'password', required: true },
  ],
  createSchoolAdmin: [
    { model: 'personName', required: true },
    { model: 'userEmail', required: true },
    { model: 'password', required: true },
    { model: 'schoolId', required: true },
  ],
  refreshSession: [
    { model: 'refreshToken', required: true },
  ],
  logout: [
    { model: 'refreshToken', required: true },
  ],
};
