const { test } = require('@jest/globals');
const assert = require('node:assert/strict');

const { createOpenApiSpec } = require('../docs/openapi.spec');

test('openapi spec contains bearer and legacy token auth schemes', () => {
  const spec = createOpenApiSpec({ serviceName: 'axion', version: '0.1.0', serverUrl: 'https://api.example.com' });

  assert.equal(spec.openapi, '3.0.3');
  assert.equal(spec.components.securitySchemes.BearerAuth.scheme, 'bearer');
  assert.equal(spec.components.securitySchemes.LegacyTokenHeader.name, 'token');
  assert.equal(spec.servers[0].url, 'https://api.example.com');
});

test('openapi spec exposes core auth and entity endpoints', () => {
  const spec = createOpenApiSpec();

  assert.ok(spec.paths['/api/v1/auth/login']);
  assert.ok(spec.paths['/api/v1/auth/createSchoolAdmin']);
  assert.ok(spec.paths['/api/v1/school/createSchool']);
  assert.ok(spec.paths['/api/v1/classroom/listClassrooms']);
  assert.ok(spec.paths['/api/v1/student/transferStudent']);
  assert.ok(spec.paths['/openapi.json'] === undefined);
});

test('openapi spec includes detailed request and response docs', () => {
  const spec = createOpenApiSpec();

  assert.equal(
    spec.paths['/api/v1/school/createSchool'].post.requestBody.required,
    true
  );
  assert.ok(
    spec.paths['/api/v1/school/createSchool'].post.responses['201']
  );
  assert.ok(
    spec.paths['/api/v1/student/transferStudent'].post.requestBody.content['application/json'].schema
      .$ref === '#/components/schemas/TransferStudentRequest'
  );
  assert.ok(spec.components.schemas.School);
  assert.ok(spec.components.schemas.Classroom);
  assert.ok(spec.components.schemas.Student);
});
