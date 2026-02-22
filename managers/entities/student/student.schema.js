module.exports = {
  createStudent: [
    { model: 'schoolId' },
    { model: 'classroomId' },
    { model: 'firstName', required: true },
    { model: 'lastName', required: true },
    { model: 'admissionNumber', required: true },
    { model: 'userEmail' },
    { model: 'dateOfBirth' },
    { model: 'profileObj' },
    { model: 'statusFlag' },
  ],
  updateStudent: [
    { model: 'studentId', required: true },
    { model: 'firstName' },
    { model: 'lastName' },
    { model: 'admissionNumber' },
    { model: 'userEmail' },
    { model: 'dateOfBirth' },
    { model: 'profileObj' },
    { model: 'statusFlag' },
    { model: 'expectedVersion' },
  ],
  deleteStudent: [
    { model: 'studentId', required: true },
  ],
  transferStudent: [
    { model: 'studentId', required: true },
    { model: 'targetSchoolId' },
    { model: 'targetClassroomId' },
    { model: 'expectedVersion' },
  ],
};
