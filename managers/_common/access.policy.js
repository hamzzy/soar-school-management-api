const FORBIDDEN = { code: 403, error: 'forbidden', errorCode: 'AUTH_FORBIDDEN' };
const UNAUTHORIZED = { code: 401, error: 'unauthorized', errorCode: 'AUTH_UNAUTHORIZED' };

const ensureAuthenticated = ({ auth }) => {
  if (!auth || !auth.userId) return { ok: false, error: UNAUTHORIZED };
  return { ok: true };
};

const ensureRole = ({ auth, roles }) => {
  const authCheck = ensureAuthenticated({ auth });
  if (!authCheck.ok) return authCheck;
  if (!roles.includes(auth.role)) return { ok: false, error: FORBIDDEN };
  return { ok: true };
};

const resolveSchoolScope = ({ auth, requestedSchoolId, requireExplicitSchoolForSuperadmin = false }) => {
  const roleCheck = ensureRole({ auth, roles: ['superadmin', 'school_admin'] });
  if (!roleCheck.ok) return roleCheck;

  if (auth.role === 'school_admin') {
    if (!auth.schoolId) {
      return {
        ok: false,
        error: {
          code: 403,
          error: 'school administrator is not assigned to a school',
          errorCode: 'SCOPE_SCHOOL_NOT_ASSIGNED',
        },
      };
    }
    if (requestedSchoolId && String(requestedSchoolId) !== String(auth.schoolId)) {
      return {
        ok: false,
        error: {
          code: 403,
          error: 'school administrator can only access assigned school',
          errorCode: 'SCOPE_SCHOOL_MISMATCH',
        },
      };
    }
    return { ok: true, schoolId: String(auth.schoolId), appliedBy: 'school_admin_scope' };
  }

  if (requireExplicitSchoolForSuperadmin && !requestedSchoolId) {
    return {
      ok: false,
      error: {
        code: 422,
        error: 'schoolId is required',
        errorCode: 'VALIDATION_REQUIRED_SCHOOL_ID',
        errors: [{ field: 'schoolId', message: 'schoolId is required' }],
      },
    };
  }

  return { ok: true, schoolId: requestedSchoolId || null, appliedBy: 'superadmin_scope' };
};

const enforceEntitySchoolScope = ({ auth, entitySchoolId }) => {
  const roleCheck = ensureRole({ auth, roles: ['superadmin', 'school_admin'] });
  if (!roleCheck.ok) return roleCheck;
  if (auth.role === 'school_admin' && String(entitySchoolId) !== String(auth.schoolId)) {
    return { ok: false, error: FORBIDDEN };
  }
  return { ok: true };
};

const buildScopedFilter = ({ auth, requestedSchoolId, filter = {} }) => {
  const scope = resolveSchoolScope({ auth, requestedSchoolId });
  if (!scope.ok) return scope;
  const scopedFilter = { ...filter };
  if (scope.schoolId) scopedFilter.school = scope.schoolId;
  return { ok: true, filter: scopedFilter, schoolId: scope.schoolId };
};

module.exports = {
  ensureAuthenticated,
  ensureRole,
  resolveSchoolScope,
  enforceEntitySchoolScope,
  buildScopedFilter,
  FORBIDDEN,
  UNAUTHORIZED,
};

