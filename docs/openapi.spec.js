const authSecurity = [{ BearerAuth: [] }, { LegacyTokenHeader: [] }];

const jsonContent = (schemaRef) => ({
  'application/json': {
    schema: schemaRef,
  },
});

const secured = (operation) => ({
  ...operation,
  security: authSecurity,
});

const response = (description, schemaRef) => ({
  description,
  content: jsonContent(schemaRef),
});

const createOpenApiSpec = ({ serviceName = 'axion', version = '0.1.0', serverUrl = '' } = {}) => {
  const servers = [];
  if (serverUrl) servers.push({ url: serverUrl });

  return {
    openapi: '3.0.3',
    info: {
      title: `${serviceName} School Management API`,
      version,
      description:
        'REST API for schools, classrooms, students, and role-based users (superadmin + school_admin).',
    },
    servers,
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Schools' },
      { name: 'Classrooms' },
      { name: 'Students' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Preferred auth header: Authorization: Bearer <token>',
        },
        LegacyTokenHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'token',
          description: 'Legacy token header kept for backward compatibility.',
        },
      },
      schemas: {
        ErrorItem: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' },
          },
        },
        EnvelopeSuccess: {
          type: 'object',
          required: ['ok', 'data', 'errors', 'message', 'errorCode', 'requestId', 'correlationId'],
          properties: {
            ok: { type: 'boolean', example: true },
            data: { type: 'object', additionalProperties: true },
            errors: { type: 'array', items: { $ref: '#/components/schemas/ErrorItem' }, example: [] },
            message: { type: 'string', example: '' },
            errorCode: { type: 'string', example: '' },
            requestId: { type: 'string', example: 'req_123' },
            correlationId: { type: 'string', example: 'cor_123' },
          },
        },
        EnvelopeError: {
          type: 'object',
          required: ['ok', 'data', 'errors', 'message', 'errorCode', 'requestId', 'correlationId'],
          properties: {
            ok: { type: 'boolean', example: false },
            data: { type: 'object', additionalProperties: true, example: {} },
            errors: { type: 'array', items: { $ref: '#/components/schemas/ErrorItem' } },
            message: { type: 'string', example: 'validation failed' },
            errorCode: { type: 'string', example: 'VALIDATION_FAILED' },
            requestId: { type: 'string', example: 'req_123' },
            correlationId: { type: 'string', example: 'cor_123' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['superadmin', 'school_admin'] },
            schoolId: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
            nextCursor: { type: 'string', nullable: true },
          },
        },
        School: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            code: { type: 'string', nullable: true },
            address: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            contactPhone: { type: 'string' },
            profile: { type: 'object', additionalProperties: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            version: { type: 'integer' },
          },
        },
        Classroom: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            schoolId: { type: 'string' },
            name: { type: 'string' },
            gradeLevel: { type: 'string' },
            capacity: { type: 'integer', minimum: 1 },
            resources: { type: 'array', items: { type: 'string' } },
            homeroomTeacher: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            version: { type: 'integer' },
          },
        },
        Student: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            schoolId: { type: 'string' },
            classroomId: { type: 'string', nullable: true },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            admissionNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },
            dateOfBirth: { type: 'string', format: 'date', nullable: true },
            profile: { type: 'object', additionalProperties: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            enrolledAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            version: { type: 'integer' },
          },
        },
        BootstrapRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        RefreshRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        CreateSchoolAdminRequest: {
          type: 'object',
          required: ['name', 'email', 'password', 'schoolId'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            schoolId: { type: 'string' },
          },
        },
        CreateSchoolRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            code: { type: 'string' },
            address: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            contactPhone: { type: 'string' },
            profile: { type: 'object', additionalProperties: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
          },
        },
        UpdateSchoolRequest: {
          type: 'object',
          required: ['schoolId'],
          properties: {
            schoolId: { type: 'string' },
            name: { type: 'string' },
            code: { type: 'string' },
            address: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            contactPhone: { type: 'string' },
            profile: { type: 'object', additionalProperties: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            expectedVersion: { type: 'integer' },
          },
        },
        UpdateSchoolProfileRequest: {
          type: 'object',
          required: ['schoolId'],
          properties: {
            schoolId: { type: 'string' },
            profile: { type: 'object', additionalProperties: true },
            expectedVersion: { type: 'integer' },
          },
        },
        DeleteSchoolRequest: {
          type: 'object',
          required: ['schoolId'],
          properties: {
            schoolId: { type: 'string' },
          },
        },
        CreateClassroomRequest: {
          type: 'object',
          required: ['schoolId', 'name', 'capacity'],
          properties: {
            schoolId: { type: 'string' },
            name: { type: 'string' },
            gradeLevel: { type: 'string' },
            capacity: { type: 'integer', minimum: 1 },
            resources: { type: 'array', items: { type: 'string' } },
            homeroomTeacher: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive'] },
          },
        },
        UpdateClassroomRequest: {
          type: 'object',
          required: ['classroomId'],
          properties: {
            classroomId: { type: 'string' },
            name: { type: 'string' },
            gradeLevel: { type: 'string' },
            capacity: { type: 'integer', minimum: 1 },
            resources: { type: 'array', items: { type: 'string' } },
            homeroomTeacher: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive'] },
            expectedVersion: { type: 'integer' },
          },
        },
        DeleteClassroomRequest: {
          type: 'object',
          required: ['classroomId'],
          properties: {
            classroomId: { type: 'string' },
          },
        },
        CreateStudentRequest: {
          type: 'object',
          required: ['schoolId', 'firstName', 'lastName', 'admissionNumber'],
          properties: {
            schoolId: { type: 'string' },
            classroomId: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            admissionNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },
            dateOfBirth: { type: 'string', format: 'date' },
            profile: { type: 'object', additionalProperties: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
          },
        },
        UpdateStudentRequest: {
          type: 'object',
          required: ['studentId'],
          properties: {
            studentId: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            admissionNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },
            dateOfBirth: { type: 'string', format: 'date' },
            profile: { type: 'object', additionalProperties: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            expectedVersion: { type: 'integer' },
          },
        },
        TransferStudentRequest: {
          type: 'object',
          required: ['studentId', 'targetSchoolId'],
          properties: {
            studentId: { type: 'string' },
            targetSchoolId: { type: 'string' },
            targetClassroomId: { type: 'string' },
            expectedVersion: { type: 'integer' },
          },
        },
        DeleteStudentRequest: {
          type: 'object',
          required: ['studentId'],
          properties: {
            studentId: { type: 'string' },
          },
        },
      },
    },
    security: authSecurity,
    paths: {
      '/health/live': {
        get: {
          tags: ['Health'],
          summary: 'Liveness probe',
          security: [],
          responses: {
            200: response('Service is live', { $ref: '#/components/schemas/EnvelopeSuccess' }),
          },
        },
      },
      '/health/ready': {
        get: {
          tags: ['Health'],
          summary: 'Readiness probe',
          security: [],
          responses: {
            200: response('Service is ready', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            503: response('Service is not ready', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        },
      },
      '/metrics': {
        get: {
          tags: ['Health'],
          summary: 'Metrics snapshot',
          security: [],
          responses: {
            200: response('Metrics payload', { $ref: '#/components/schemas/EnvelopeSuccess' }),
          },
        },
      },
      '/api/v1/auth/bootstrapSuperadmin': {
        post: {
          tags: ['Auth'],
          summary: 'Bootstrap first superadmin',
          security: [],
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/BootstrapRequest' }) },
          responses: {
            201: response('Superadmin created', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            409: response('Already initialized', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login as superadmin or school_admin',
          security: [],
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/LoginRequest' }) },
          responses: {
            200: response('Authenticated', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            401: response('Invalid credentials', { $ref: '#/components/schemas/EnvelopeError' }),
            403: response('Inactive user', { $ref: '#/components/schemas/EnvelopeError' }),
            429: response('Login throttled', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        },
      },
      '/api/v1/auth/refreshSession': {
        post: {
          tags: ['Auth'],
          summary: 'Rotate refresh token and issue new access token',
          security: [],
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/RefreshRequest' }) },
          responses: {
            200: response('Session refreshed', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            401: response('Invalid or revoked refresh token', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        },
      },
      '/api/v1/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and revoke refresh token',
          security: [],
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/RefreshRequest' }) },
          responses: {
            200: response('Session revoked', { $ref: '#/components/schemas/EnvelopeSuccess' }),
          },
        },
      },
      '/api/v1/auth/me': {
        get: secured({
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          responses: {
            200: response('Current user', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            401: response('Unauthorized', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('User not found', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/auth/createSchoolAdmin': {
        post: secured({
          tags: ['Auth'],
          summary: 'Create school administrator (superadmin only)',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/CreateSchoolAdminRequest' }) },
          responses: {
            201: response('School admin created', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('School not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Email already exists', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/school/createSchool': {
        post: secured({
          tags: ['Schools'],
          summary: 'Create school (superadmin only)',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/CreateSchoolRequest' }) },
          responses: {
            201: response('School created', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('School code already exists', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/school/listSchools': {
        get: secured({
          tags: ['Schools'],
          summary: 'List schools (superadmin only)',
          parameters: [
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0 } },
            { in: 'query', name: 'cursor', schema: { type: 'string' } },
          ],
          responses: {
            200: response('Schools list', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Invalid pagination', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/school/getSchoolById': {
        get: secured({
          tags: ['Schools'],
          summary: 'Get school by id (superadmin only)',
          parameters: [{ in: 'query', name: 'schoolId', required: true, schema: { type: 'string' } }],
          responses: {
            200: response('School details', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            404: response('School not found', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Missing schoolId', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/school/updateSchool': {
        post: secured({
          tags: ['Schools'],
          summary: 'Update school (superadmin only)',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/UpdateSchoolRequest' }) },
          responses: {
            200: response('School updated', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            404: response('School not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Conflict / stale version / duplicate code', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/school/deleteSchool': {
        post: secured({
          tags: ['Schools'],
          summary: 'Delete school (superadmin only)',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/DeleteSchoolRequest' }) },
          responses: {
            200: response('School deleted', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            404: response('School not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('School has linked resources', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/school/getSchoolProfile': {
        get: secured({
          tags: ['Schools'],
          summary: 'Get school profile (superadmin only)',
          parameters: [{ in: 'query', name: 'schoolId', required: true, schema: { type: 'string' } }],
          responses: {
            200: response('School profile', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            404: response('School not found', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Missing schoolId', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/school/updateSchoolProfile': {
        post: secured({
          tags: ['Schools'],
          summary: 'Update school profile (superadmin only)',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/UpdateSchoolProfileRequest' }) },
          responses: {
            200: response('Profile updated', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            404: response('School not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Conflict / stale version', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/classroom/createClassroom': {
        post: secured({
          tags: ['Classrooms'],
          summary: 'Create classroom',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/CreateClassroomRequest' }) },
          responses: {
            201: response('Classroom created', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('School not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Classroom name conflict', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/classroom/listClassrooms': {
        get: secured({
          tags: ['Classrooms'],
          summary: 'List classrooms',
          parameters: [
            { in: 'query', name: 'schoolId', schema: { type: 'string' } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0 } },
            { in: 'query', name: 'cursor', schema: { type: 'string' } },
          ],
          responses: {
            200: response('Classrooms list', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Invalid pagination', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/classroom/getClassroomById': {
        get: secured({
          tags: ['Classrooms'],
          summary: 'Get classroom by id',
          parameters: [{ in: 'query', name: 'classroomId', required: true, schema: { type: 'string' } }],
          responses: {
            200: response('Classroom details', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('Classroom not found', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Missing classroomId', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/classroom/updateClassroom': {
        post: secured({
          tags: ['Classrooms'],
          summary: 'Update classroom',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/UpdateClassroomRequest' }) },
          responses: {
            200: response('Classroom updated', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('Classroom not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Conflict / stale version / duplicate name', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/classroom/deleteClassroom': {
        post: secured({
          tags: ['Classrooms'],
          summary: 'Delete classroom',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/DeleteClassroomRequest' }) },
          responses: {
            200: response('Classroom deleted', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('Classroom not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Classroom has students', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/student/createStudent': {
        post: secured({
          tags: ['Students'],
          summary: 'Create student',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/CreateStudentRequest' }) },
          responses: {
            201: response('Student created', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('School or classroom not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Email/admission conflict', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/student/listStudents': {
        get: secured({
          tags: ['Students'],
          summary: 'List students',
          parameters: [
            { in: 'query', name: 'schoolId', schema: { type: 'string' } },
            { in: 'query', name: 'classroomId', schema: { type: 'string' } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0 } },
            { in: 'query', name: 'cursor', schema: { type: 'string' } },
          ],
          responses: {
            200: response('Students list', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('Classroom not found', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Invalid pagination', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/student/getStudentById': {
        get: secured({
          tags: ['Students'],
          summary: 'Get student by id',
          parameters: [{ in: 'query', name: 'studentId', required: true, schema: { type: 'string' } }],
          responses: {
            200: response('Student details', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('Student not found', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Missing studentId', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/student/updateStudent': {
        post: secured({
          tags: ['Students'],
          summary: 'Update student',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/UpdateStudentRequest' }) },
          responses: {
            200: response('Student updated', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('Student not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Conflict / stale version / duplicate identity', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/student/deleteStudent': {
        post: secured({
          tags: ['Students'],
          summary: 'Delete student',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/DeleteStudentRequest' }) },
          responses: {
            200: response('Student deleted', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('Student not found', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
      '/api/v1/student/transferStudent': {
        post: secured({
          tags: ['Students'],
          summary: 'Transfer student to another school/classroom',
          requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/TransferStudentRequest' }) },
          responses: {
            200: response('Student transferred', { $ref: '#/components/schemas/EnvelopeSuccess' }),
            403: response('Forbidden / scope mismatch', { $ref: '#/components/schemas/EnvelopeError' }),
            404: response('Student / school / classroom not found', { $ref: '#/components/schemas/EnvelopeError' }),
            409: response('Conflict / stale version', { $ref: '#/components/schemas/EnvelopeError' }),
            422: response('Validation failed', { $ref: '#/components/schemas/EnvelopeError' }),
          },
        }),
      },
    },
  };
};

module.exports = {
  createOpenApiSpec,
};
