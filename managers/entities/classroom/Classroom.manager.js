const accessPolicy = require('../../_common/access.policy');
const { parsePagination } = require('../../_common/pagination');

module.exports = class Classroom {
  constructor({ validators, repositories, managers }) {
    this.validators = validators;
    this.classroomRepo = repositories.classroom;
    this.schoolRepo = repositories.school;
    this.studentRepo = repositories.student;
    this.audit = managers.audit;

    this.httpExposed = [
      'post=createClassroom',
      'get=listClassrooms',
      'get=getClassroomById',
      'post=updateClassroom',
      'post=deleteClassroom',
    ];
  }

  async _validate(schemaName, payload) {
    const schema = this.validators.classroom && this.validators.classroom[schemaName];
    if (!schema) return null;
    const errors = await schema(payload);
    if (errors) {
      return { code: 422, errors, errorCode: 'VALIDATION_FAILED' };
    }
    return null;
  }

  _mapClassroom(classroomDoc) {
    if (!classroomDoc) return null;
    return {
      id: String(classroomDoc._id),
      schoolId: String(classroomDoc.school),
      name: classroomDoc.name,
      gradeLevel: classroomDoc.gradeLevel || '',
      capacity: classroomDoc.capacity,
      resources: classroomDoc.resources || [],
      homeroomTeacher: classroomDoc.homeroomTeacher || '',
      status: classroomDoc.status,
      createdAt: classroomDoc.createdAt,
      updatedAt: classroomDoc.updatedAt,
      version: classroomDoc.__v,
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

  async createClassroom({ __auth, schoolId, name, gradeLevel, capacity, resources, homeroomTeacher, status }) {
    const validationError = await this._validate('createClassroom', {
      schoolId,
      name,
      gradeLevel,
      capacity,
      resources,
      homeroomTeacher,
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

    try {
      const classroom = await this.classroomRepo.create({
        school: targetSchoolId,
        name,
        gradeLevel: gradeLevel || '',
        capacity,
        resources: resources || [],
        homeroomTeacher: homeroomTeacher || '',
        status: status || 'active',
      });
      return { code: 201, classroom: this._mapClassroom(classroom) };
    } catch (err) {
      if (err && err.code === 11000) {
        return { code: 409, error: 'classroom name already exists in this school', errorCode: 'CLASSROOM_NAME_EXISTS' };
      }
      return { code: 500, error: 'failed to create classroom', errorCode: 'CLASSROOM_CREATE_FAILED' };
    }
  }

  async listClassrooms({ __auth, __query, schoolId }) {
    const requestedSchoolId = schoolId || (__query && __query.schoolId) || null;
    const scoped = accessPolicy.buildScopedFilter({
      auth: __auth,
      requestedSchoolId,
      filter: {},
    });
    if (!scoped.ok) return scoped.error;

    const parsed = parsePagination({ query: __query || {} });
    if (!parsed.ok) return parsed.error;

    const { docs, nextCursor } = await this.classroomRepo.listPaginated({
      filter: scoped.filter,
      pagination: parsed.pagination,
    });

    return {
      classrooms: docs.map((c) => this._mapClassroom(c)),
      pagination: {
        limit: parsed.pagination.limit,
        offset: parsed.pagination.offset,
        nextCursor,
      },
    };
  }

  async getClassroomById({ __auth, __query, classroomId }) {
    const targetClassroomId = classroomId || (__query && __query.classroomId) || null;
    if (!targetClassroomId) {
      return {
        code: 422,
        errors: [{ field: 'classroomId', message: 'classroomId is required' }],
        errorCode: 'VALIDATION_REQUIRED_CLASSROOM_ID',
      };
    }

    const classroom = await this.classroomRepo.findByIdLean(targetClassroomId);
    if (!classroom) {
      return { code: 404, error: 'classroom not found', errorCode: 'CLASSROOM_NOT_FOUND' };
    }

    const scopeCheck = accessPolicy.enforceEntitySchoolScope({ auth: __auth, entitySchoolId: classroom.school });
    if (!scopeCheck.ok) return scopeCheck.error;

    return { classroom: this._mapClassroom(classroom) };
  }

  async updateClassroom({ __auth, classroomId, name, gradeLevel, capacity, resources, homeroomTeacher, status, expectedVersion }) {
    const validationError = await this._validate('updateClassroom', {
      classroomId,
      name,
      gradeLevel,
      capacity,
      resources,
      homeroomTeacher,
      status,
    });
    if (validationError) return validationError;

    const classroom = await this.classroomRepo.findById(classroomId);
    if (!classroom) {
      return { code: 404, error: 'classroom not found', errorCode: 'CLASSROOM_NOT_FOUND' };
    }

    const scopeCheck = accessPolicy.enforceEntitySchoolScope({ auth: __auth, entitySchoolId: classroom.school });
    if (!scopeCheck.ok) return scopeCheck.error;

    if (expectedVersion !== undefined && Number(expectedVersion) !== classroom.__v) {
      return { code: 409, error: 'classroom was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
    }

    if (name !== undefined) classroom.name = name;
    if (gradeLevel !== undefined) classroom.gradeLevel = gradeLevel;
    if (capacity !== undefined) classroom.capacity = capacity;
    if (resources !== undefined) classroom.resources = resources;
    if (homeroomTeacher !== undefined) classroom.homeroomTeacher = homeroomTeacher;
    if (status !== undefined) classroom.status = status;

    try {
      await classroom.save();
      return { classroom: this._mapClassroom(classroom) };
    } catch (err) {
      if (err && err.name === 'VersionError') {
        return { code: 409, error: 'classroom was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
      }
      if (err && err.code === 11000) {
        return { code: 409, error: 'classroom name already exists in this school', errorCode: 'CLASSROOM_NAME_EXISTS' };
      }
      return { code: 500, error: 'failed to update classroom', errorCode: 'CLASSROOM_UPDATE_FAILED' };
    }
  }

  async deleteClassroom({ __auth, __requestMeta, __device, classroomId }) {
    const validationError = await this._validate('deleteClassroom', { classroomId });
    if (validationError) return validationError;

    const classroom = await this.classroomRepo.findByIdLean(classroomId);
    if (!classroom) {
      return { code: 404, error: 'classroom not found', errorCode: 'CLASSROOM_NOT_FOUND' };
    }

    const scopeCheck = accessPolicy.enforceEntitySchoolScope({ auth: __auth, entitySchoolId: classroom.school });
    if (!scopeCheck.ok) return scopeCheck.error;

    const studentsCount = await this.studentRepo.countByClassroomId(classroom._id);
    if (studentsCount > 0) {
      return { code: 409, error: 'cannot delete classroom with enrolled students', errorCode: 'CLASSROOM_HAS_STUDENTS' };
    }

    await this.classroomRepo.deleteById(classroom._id);

    await this.audit.logEvent({
      action: 'classroom.delete',
      status: 'success',
      actor: __auth,
      target: { type: 'classroom', id: String(classroom._id), schoolId: String(classroom.school) },
      requestMeta: this._requestMeta({ __requestMeta, __device }),
    });

    return { success: true };
  }
};
