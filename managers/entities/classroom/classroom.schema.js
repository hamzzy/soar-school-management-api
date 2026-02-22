module.exports = {
  createClassroom: [
    { model: 'schoolId' },
    { model: 'classroomName', required: true },
    { model: 'gradeLevel' },
    { model: 'capacity', required: true },
    { model: 'resourcesList' },
    { model: 'homeroomTeacher' },
    { model: 'statusFlag' },
  ],
  updateClassroom: [
    { model: 'classroomId', required: true },
    { model: 'classroomName' },
    { model: 'gradeLevel' },
    { model: 'capacity' },
    { model: 'resourcesList' },
    { model: 'homeroomTeacher' },
    { model: 'statusFlag' },
    { model: 'expectedVersion' },
  ],
  deleteClassroom: [
    { model: 'classroomId', required: true },
  ],
};
