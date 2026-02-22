const accessPolicy = require('../../_common/access.policy');
const { parsePagination } = require('../../_common/pagination');

module.exports = class Student {
  constructor({ validators, repositories, managers }) {
    this.validators = validators;
    this.studentRepo = repositories.student;
    this.schoolRepo = repositories.school;
    this.classroomRepo = repositories.classroom;
    this.audit = managers.audit;

    this.httpExposed = [
      'post=createStudent',
      'get=listStudents',
      'get=getStudentById',
      'post=updateStudent',
      'post=deleteStudent',
      'post=transferStudent',
    ];
  }

  async _validate(schemaName, payload) {
    const schema = this.validators.student && this.validators.student[schemaName];
    if (!schema) return null;
    const errors = await schema(payload);
    if (errors) {
      return { code: 422, errors, errorCode: 'VALIDATION_FAILED' };
    }
    return null;
  }

  _mapStudent(studentDoc) {
    if (!studentDoc) return null;
    return {
      id: String(studentDoc._id),
      schoolId: String(studentDoc.school),
      classroomId: studentDoc.classroom ? String(studentDoc.classroom) : null,
      firstName: studentDoc.firstName,
      lastName: studentDoc.lastName,
      admissionNumber: studentDoc.admissionNumber,
      email: studentDoc.email || '',
      dateOfBirth: studentDoc.dateOfBirth,
      profile: studentDoc.profile || {},
      status: studentDoc.status,
      enrolledAt: studentDoc.enrolledAt,
      createdAt: studentDoc.createdAt,
      updatedAt: studentDoc.updatedAt,
      version: studentDoc.__v,
    };
  }

  _requestMeta({ __requestMeta, __device }) {
    return {
      requestId: (__requestMeta && __requestMeta.requestId) || '',
      correlationId: (__requestMeta && __requestMeta.correlationId) || '',
      ip: ((__requestMeta && __requestMeta.ip) || (__device && __device.ip) || '').toString(),
      userAgent: ((__requestMeta && __requestMeta.userAgent) || (__device && __device.agent) || '').toString(),
    };
  }

  async _ensureClassroomInSchool({ classroomId, schoolId }) {
    if (!classroomId) return { ok: true };
    const classroom = await this.classroomRepo.findByIdLean(classroomId);
    if (!classroom) {
      return { ok: false, error: { code: 404, error: 'classroom not found', errorCode: 'CLASSROOM_NOT_FOUND' } };
    }
    if (String(classroom.school) !== String(schoolId)) {
      return {
        ok: false,
        error: { code: 422, error: 'classroom does not belong to school', errorCode: 'CLASSROOM_SCHOOL_MISMATCH' },
      };
    }
    return { ok: true };
  }

  async createStudent({ __auth, schoolId, classroomId, firstName, lastName, admissionNumber, email, dateOfBirth, profile, status }) {
    const validationError = await this._validate('createStudent', {
      schoolId,
      classroomId,
      firstName,
      lastName,
      admissionNumber,
      email,
      dateOfBirth,
      profile,
      status,
    });
    if (validationError) return validationError;

    const scope = accessPolicy.resolveSchoolScope({
      auth: __auth,
      requestedSchoolId: schoolId,
      requireExplicitSchoolForSuperadmin: true,
    });
    if (!scope.ok) return scope.error;

    const targetSchoolId = scope.schoolId;

    const school = await this.schoolRepo.findByIdLean(targetSchoolId);
    if (!school) {
      return { code: 404, error: 'school not found', errorCode: 'SCHOOL_NOT_FOUND' };
    }

    const classroomCheck = await this._ensureClassroomInSchool({ classroomId, schoolId: targetSchoolId });
    if (!classroomCheck.ok) return classroomCheck.error;

    try {
      const student = await this.studentRepo.create({
        school: targetSchoolId,
        classroom: classroomId || null,
        firstName,
        lastName,
        admissionNumber,
        email: email ? String(email).toLowerCase() : undefined,
        dateOfBirth: dateOfBirth || null,
        profile: profile || {},
        status: status || 'active',
      });

      return { code: 201, student: this._mapStudent(student) };
    } catch (err) {
      if (err && err.code === 11000) {
        if (err.keyPattern && err.keyPattern.email) {
          return { code: 409, error: 'student email already exists', errorCode: 'STUDENT_EMAIL_EXISTS' };
        }
        return { code: 409, error: 'admission number already exists in school', errorCode: 'STUDENT_ADMISSION_EXISTS' };
      }
      return { code: 500, error: 'failed to create student', errorCode: 'STUDENT_CREATE_FAILED' };
    }
  }

  async listStudents({ __auth, __query, schoolId, classroomId }) {
    const requestedSchoolId = schoolId || (__query && __query.schoolId) || null;
    const requestedClassroomId = classroomId || (__query && __query.classroomId) || null;

    const scoped = accessPolicy.buildScopedFilter({
      auth: __auth,
      requestedSchoolId,
      filter: {},
    });
    if (!scoped.ok) return scoped.error;

    if (requestedClassroomId) {
      const classroom = await this.classroomRepo.findByIdLean(requestedClassroomId);
      if (!classroom) {
        return { code: 404, error: 'classroom not found', errorCode: 'CLASSROOM_NOT_FOUND' };
      }
      const scopeCheck = accessPolicy.enforceEntitySchoolScope({ auth: __auth, entitySchoolId: classroom.school });
      if (!scopeCheck.ok) return scopeCheck.error;
      scoped.filter.classroom = requestedClassroomId;
    }

    const parsed = parsePagination({ query: __query || {} });
    if (!parsed.ok) return parsed.error;

    const { docs, nextCursor } = await this.studentRepo.listPaginated({
      filter: scoped.filter,
      pagination: parsed.pagination,
    });

    return {
      students: docs.map((s) => this._mapStudent(s)),
      pagination: {
        limit: parsed.pagination.limit,
        offset: parsed.pagination.offset,
        nextCursor,
      },
    };
  }

  async getStudentById({ __auth, __query, studentId }) {
    const targetStudentId = studentId || (__query && __query.studentId) || null;
    if (!targetStudentId) {
      return {
        code: 422,
        errors: [{ field: 'studentId', message: 'studentId is required' }],
        errorCode: 'VALIDATION_REQUIRED_STUDENT_ID',
      };
    }

    const student = await this.studentRepo.findByIdLean(targetStudentId);
    if (!student) {
      return { code: 404, error: 'student not found', errorCode: 'STUDENT_NOT_FOUND' };
    }

    const scopeCheck = accessPolicy.enforceEntitySchoolScope({ auth: __auth, entitySchoolId: student.school });
    if (!scopeCheck.ok) return scopeCheck.error;

    return { student: this._mapStudent(student) };
  }

  async updateStudent({ __auth, studentId, firstName, lastName, admissionNumber, email, dateOfBirth, profile, status, expectedVersion }) {
    const validationError = await this._validate('updateStudent', {
      studentId,
      firstName,
      lastName,
      admissionNumber,
      email,
      dateOfBirth,
      profile,
      status,
    });
    if (validationError) return validationError;

    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      return { code: 404, error: 'student not found', errorCode: 'STUDENT_NOT_FOUND' };
    }

    const scopeCheck = accessPolicy.enforceEntitySchoolScope({ auth: __auth, entitySchoolId: student.school });
    if (!scopeCheck.ok) return scopeCheck.error;

    if (expectedVersion !== undefined && Number(expectedVersion) !== student.__v) {
      return { code: 409, error: 'student was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
    }

    if (firstName !== undefined) student.firstName = firstName;
    if (lastName !== undefined) student.lastName = lastName;
    if (admissionNumber !== undefined) student.admissionNumber = admissionNumber;
    if (email !== undefined) student.email = email ? String(email).toLowerCase() : undefined;
    if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth || null;
    if (profile !== undefined) student.profile = profile;
    if (status !== undefined) student.status = status;

    try {
      await student.save();
      return { student: this._mapStudent(student) };
    } catch (err) {
      if (err && err.name === 'VersionError') {
        return { code: 409, error: 'student was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
      }
      if (err && err.code === 11000) {
        if (err.keyPattern && err.keyPattern.email) {
          return { code: 409, error: 'student email already exists', errorCode: 'STUDENT_EMAIL_EXISTS' };
        }
        return { code: 409, error: 'admission number already exists in school', errorCode: 'STUDENT_ADMISSION_EXISTS' };
      }
      return { code: 500, error: 'failed to update student', errorCode: 'STUDENT_UPDATE_FAILED' };
    }
  }

  async transferStudent({ __auth, __requestMeta, __device, studentId, targetSchoolId, targetClassroomId, expectedVersion }) {
    const validationError = await this._validate('transferStudent', {
      studentId,
      targetSchoolId,
      targetClassroomId,
    });
    if (validationError) return validationError;

    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      return { code: 404, error: 'student not found', errorCode: 'STUDENT_NOT_FOUND' };
    }

    const scopeCheck = accessPolicy.enforceEntitySchoolScope({ auth: __auth, entitySchoolId: student.school });
    if (!scopeCheck.ok) return scopeCheck.error;

    if (__auth.role === 'school_admin' && targetSchoolId && String(targetSchoolId) !== String(__auth.schoolId)) {
      return {
        code: 403,
        error: 'school administrator can only transfer inside assigned school',
        errorCode: 'SCOPE_SCHOOL_MISMATCH',
      };
    }

    const resolvedTargetSchoolId = targetSchoolId || String(student.school);

    const school = await this.schoolRepo.findByIdLean(resolvedTargetSchoolId);
    if (!school) {
      return { code: 404, error: 'target school not found', errorCode: 'SCHOOL_NOT_FOUND' };
    }

    const classroomCheck = await this._ensureClassroomInSchool({
      classroomId: targetClassroomId,
      schoolId: resolvedTargetSchoolId,
    });
    if (!classroomCheck.ok) return classroomCheck.error;

    if (expectedVersion !== undefined && Number(expectedVersion) !== student.__v) {
      return { code: 409, error: 'student was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
    }

    student.school = resolvedTargetSchoolId;
    student.classroom = targetClassroomId || null;

    try {
      await student.save();
    } catch (err) {
      if (err && err.name === 'VersionError') {
        return { code: 409, error: 'student was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
      }
      if (err && err.code === 11000) {
        return { code: 409, error: 'admission number already exists in target school', errorCode: 'STUDENT_ADMISSION_EXISTS' };
      }
      return { code: 500, error: 'failed to transfer student', errorCode: 'STUDENT_TRANSFER_FAILED' };
    }

    await this.audit.logEvent({
      action: 'student.transfer',
      status: 'success',
      actor: __auth,
      target: { type: 'student', id: String(student._id), schoolId: String(student.school) },
      requestMeta: this._requestMeta({ __requestMeta, __device }),
      metadata: {
        targetSchoolId: resolvedTargetSchoolId,
        targetClassroomId: targetClassroomId || null,
      },
    });

    return { student: this._mapStudent(student) };
  }

  async deleteStudent({ __auth, studentId }) {
    const validationError = await this._validate('deleteStudent', { studentId });
    if (validationError) return validationError;

    const student = await this.studentRepo.findByIdLean(studentId);
    if (!student) {
      return { code: 404, error: 'student not found', errorCode: 'STUDENT_NOT_FOUND' };
    }

    const scopeCheck = accessPolicy.enforceEntitySchoolScope({ auth: __auth, entitySchoolId: student.school });
    if (!scopeCheck.ok) return scopeCheck.error;

    await this.studentRepo.deleteById(student._id);
    return { success: true };
  }
};
