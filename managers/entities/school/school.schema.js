module.exports = {
  createSchool: [
    { model: 'schoolName', required: true },
    { model: 'schoolCode' },
    { model: 'addressText' },
    { model: 'contactEmail' },
    { model: 'phoneText' },
    { model: 'profileObj' },
    { model: 'statusFlag' },
  ],
  updateSchool: [
    { model: 'schoolId', required: true },
    { model: 'schoolName' },
    { model: 'schoolCode' },
    { model: 'addressText' },
    { model: 'contactEmail' },
    { model: 'phoneText' },
    { model: 'profileObj' },
    { model: 'statusFlag' },
    { model: 'expectedVersion' },
  ],
  deleteSchool: [
    { model: 'schoolId', required: true },
  ],
  updateSchoolProfile: [
    { model: 'schoolId', required: true },
    { model: 'profileObj', required: true },
    { model: 'expectedVersion' },
  ],
};
