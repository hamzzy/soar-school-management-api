const accessPolicy = require('../../_common/access.policy');
const { parsePagination } = require('../../_common/pagination');

module.exports = class School {
  constructor({ validators, repositories, managers }) {
    this.validators = validators;
    this.schoolRepo = repositories.school;
    this.classroomRepo = repositories.classroom;
    this.studentRepo = repositories.student;
    this.userRepo = repositories.user;
    this.audit = managers.audit;

    this.httpExposed = [
      'post=createSchool',
      'get=listSchools',
      'get=getSchoolById',
      'post=updateSchool',
      'post=deleteSchool',
      'get=getSchoolProfile',
      'post=updateSchoolProfile',
    ];
  }

  async _validate(schemaName, payload) {
    const schema = this.validators.school && this.validators.school[schemaName];
    if (!schema) return null;
    const errors = await schema(payload);
    if (errors) {
      return { code: 422, errors, errorCode: 'VALIDATION_FAILED' };
    }
    return null;
  }

  _mapSchool(schoolDoc) {
    if (!schoolDoc) return null;
    return {
      id: String(schoolDoc._id),
      name: schoolDoc.name,
      code: schoolDoc.code || null,
      address: schoolDoc.address || '',
      contactEmail: schoolDoc.contactEmail || '',
      contactPhone: schoolDoc.contactPhone || '',
      profile: schoolDoc.profile || {},
      status: schoolDoc.status,
      createdAt: schoolDoc.createdAt,
      updatedAt: schoolDoc.updatedAt,
      version: schoolDoc.__v,
    };
  }

  _extractSchoolId({ schoolId, __query }) {
    return schoolId || (__query && __query.schoolId) || null;
  }

  _requestMeta({ __requestMeta, __device }) {
    return {
      requestId: (__requestMeta && __requestMeta.requestId) || '',
      correlationId: (__requestMeta && __requestMeta.correlationId) || '',
      ip: ((__requestMeta && __requestMeta.ip) || (__device && __device.ip) || '').toString(),
      userAgent: ((__requestMeta && __requestMeta.userAgent) || (__device && __device.agent) || '').toString(),
    };
  }

  async createSchool({ __auth, __requestMeta, __device, name, code, address, contactEmail, contactPhone, profile, status }) {
    const roleCheck = accessPolicy.ensureRole({ auth: __auth, roles: ['superadmin'] });
    if (!roleCheck.ok) return roleCheck.error;

    const validationError = await this._validate('createSchool', {
      name,
      code,
      address,
      contactEmail,
      contactPhone,
      profile,
      status,
    });
    if (validationError) return validationError;

    try {
      const school = await this.schoolRepo.create({
        name,
        code: code ? code.toUpperCase() : undefined,
        address: address || '',
        contactEmail: (contactEmail || '').toLowerCase(),
        contactPhone: contactPhone || '',
        profile: profile || {},
        status: status || 'active',
      });

      return { code: 201, school: this._mapSchool(school) };
    } catch (err) {
      if (err && err.code === 11000) {
        return { code: 409, error: 'school code already exists', errorCode: 'SCHOOL_CODE_EXISTS' };
      }
      return { code: 500, error: 'failed to create school', errorCode: 'SCHOOL_CREATE_FAILED' };
    }
  }

  async listSchools({ __auth, __query }) {
    const roleCheck = accessPolicy.ensureRole({ auth: __auth, roles: ['superadmin'] });
    if (!roleCheck.ok) return roleCheck.error;

    const parsed = parsePagination({ query: __query || {} });
    if (!parsed.ok) return parsed.error;

    const { docs, nextCursor } = await this.schoolRepo.listPaginated({
      filter: {},
      pagination: parsed.pagination,
    });

    return {
      schools: docs.map((s) => this._mapSchool(s)),
      pagination: {
        limit: parsed.pagination.limit,
        offset: parsed.pagination.offset,
        nextCursor,
      },
    };
  }

  async getSchoolById({ __auth, __query, schoolId }) {
    const roleCheck = accessPolicy.ensureRole({ auth: __auth, roles: ['superadmin'] });
    if (!roleCheck.ok) return roleCheck.error;

    const targetSchoolId = this._extractSchoolId({ schoolId, __query });
    if (!targetSchoolId) {
      return {
        code: 422,
        errors: [{ field: 'schoolId', message: 'schoolId is required' }],
        errorCode: 'VALIDATION_REQUIRED_SCHOOL_ID',
      };
    }

    const school = await this.schoolRepo.findByIdLean(targetSchoolId);
    if (!school) {
      return { code: 404, error: 'school not found', errorCode: 'SCHOOL_NOT_FOUND' };
    }

    return { school: this._mapSchool(school) };
  }

  async updateSchool({ __auth, schoolId, name, code, address, contactEmail, contactPhone, profile, status, expectedVersion }) {
    const roleCheck = accessPolicy.ensureRole({ auth: __auth, roles: ['superadmin'] });
    if (!roleCheck.ok) return roleCheck.error;

    const validationError = await this._validate('updateSchool', {
      schoolId,
      name,
      code,
      address,
      contactEmail,
      contactPhone,
      profile,
      status,
    });
    if (validationError) return validationError;

    const school = await this.schoolRepo.findById(schoolId);
    if (!school) {
      return { code: 404, error: 'school not found', errorCode: 'SCHOOL_NOT_FOUND' };
    }

    if (expectedVersion !== undefined && Number(expectedVersion) !== school.__v) {
      return { code: 409, error: 'school was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
    }

    if (name !== undefined) school.name = name;
    if (code !== undefined) school.code = code ? String(code).toUpperCase() : undefined;
    if (address !== undefined) school.address = address;
    if (contactEmail !== undefined) school.contactEmail = String(contactEmail || '').toLowerCase();
    if (contactPhone !== undefined) school.contactPhone = contactPhone;
    if (profile !== undefined) school.profile = profile;
    if (status !== undefined) school.status = status;

    try {
      await school.save();
      return { school: this._mapSchool(school) };
    } catch (err) {
      if (err && err.name === 'VersionError') {
        return { code: 409, error: 'school was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
      }
      if (err && err.code === 11000) {
        return { code: 409, error: 'school code already exists', errorCode: 'SCHOOL_CODE_EXISTS' };
      }
      return { code: 500, error: 'failed to update school', errorCode: 'SCHOOL_UPDATE_FAILED' };
    }
  }

  async deleteSchool({ __auth, __requestMeta, __device, schoolId }) {
    const roleCheck = accessPolicy.ensureRole({ auth: __auth, roles: ['superadmin'] });
    if (!roleCheck.ok) return roleCheck.error;

    const validationError = await this._validate('deleteSchool', { schoolId });
    if (validationError) return validationError;

    const school = await this.schoolRepo.findByIdLean(schoolId);
    if (!school) {
      return { code: 404, error: 'school not found', errorCode: 'SCHOOL_NOT_FOUND' };
    }

    const [classroomsCount, studentsCount, adminsCount] = await Promise.all([
      this.classroomRepo.countBySchoolId(schoolId),
      this.studentRepo.countBySchoolId(schoolId),
      this.userRepo.countSchoolAdminsBySchoolId(schoolId),
    ]);

    if (classroomsCount > 0 || studentsCount > 0 || adminsCount > 0) {
      return {
        code: 409,
        error: 'cannot delete school with linked classrooms, students, or school admins',
        errorCode: 'SCHOOL_HAS_LINKED_RESOURCES',
      };
    }

    await this.schoolRepo.deleteById(schoolId);

    await this.audit.logEvent({
      action: 'school.delete',
      status: 'success',
      actor: __auth,
      target: { type: 'school', id: schoolId, schoolId },
      requestMeta: this._requestMeta({ __requestMeta, __device }),
    });

    return { success: true };
  }

  async getSchoolProfile({ __auth, __query, schoolId }) {
    const roleCheck = accessPolicy.ensureRole({ auth: __auth, roles: ['superadmin'] });
    if (!roleCheck.ok) return roleCheck.error;

    const targetSchoolId = this._extractSchoolId({ schoolId, __query });
    if (!targetSchoolId) {
      return {
        code: 422,
        errors: [{ field: 'schoolId', message: 'schoolId is required' }],
        errorCode: 'VALIDATION_REQUIRED_SCHOOL_ID',
      };
    }

    const school = await this.schoolRepo.findByIdLean(targetSchoolId);
    if (!school) {
      return { code: 404, error: 'school not found', errorCode: 'SCHOOL_NOT_FOUND' };
    }

    return { schoolId: String(school._id), profile: school.profile || {} };
  }

  async updateSchoolProfile({ __auth, schoolId, profile, expectedVersion }) {
    const roleCheck = accessPolicy.ensureRole({ auth: __auth, roles: ['superadmin'] });
    if (!roleCheck.ok) return roleCheck.error;

    const validationError = await this._validate('updateSchoolProfile', { schoolId, profile });
    if (validationError) return validationError;

    const school = await this.schoolRepo.findById(schoolId);
    if (!school) {
      return { code: 404, error: 'school not found', errorCode: 'SCHOOL_NOT_FOUND' };
    }

    if (expectedVersion !== undefined && Number(expectedVersion) !== school.__v) {
      return { code: 409, error: 'school was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
    }

    school.profile = profile || {};

    try {
      await school.save();
    } catch (err) {
      if (err && err.name === 'VersionError') {
        return { code: 409, error: 'school was updated by another request', errorCode: 'CONFLICT_STALE_VERSION' };
      }
      return { code: 500, error: 'failed to update school profile', errorCode: 'SCHOOL_PROFILE_UPDATE_FAILED' };
    }

    return { schoolId: String(school._id), profile: school.profile || {} };
  }
};
