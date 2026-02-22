module.exports = ({ managers }) => {
  return ({ req, res, next }) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = req.headers.token;

    if (!token && authHeader && String(authHeader).startsWith('Bearer ')) {
      token = String(authHeader).slice(7).trim();
    }

    if (!token) {
      managers.observability.inc('authFailures');
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        errors: 'unauthorized',
        errorCode: 'AUTH_MISSING_TOKEN',
      });
    }

    let decoded = null;
    try {
      decoded = managers.token.verifyAccessToken({ token });
    } catch (err) {
      decoded = null;
    }

    if (!decoded || !decoded.userId) {
      managers.observability.inc('authFailures');
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        errors: 'unauthorized',
        errorCode: 'AUTH_INVALID_TOKEN',
      });
    }

    if (!managers.auth || !managers.auth.fetchActiveUserById) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 500,
        errors: 'auth manager unavailable',
        errorCode: 'AUTH_MANAGER_UNAVAILABLE',
      });
    }

    return managers.auth.fetchActiveUserById({ userId: decoded.userId }).then((user) => {
      if (!user) {
        managers.observability.inc('authFailures');
        return managers.responseDispatcher.dispatch(res, {
          ok: false,
          code: 401,
          errors: 'unauthorized',
          errorCode: 'AUTH_USER_NOT_FOUND',
        });
      }

      const authContext = {
        userId: String(user._id),
        role: user.role,
        schoolId: user.school ? String(user.school) : null,
        email: user.email,
        name: user.name,
      };

      req.auth = authContext;
      return next(authContext);
    }).catch(() => {
      managers.observability.inc('authFailures');
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        errors: 'unauthorized',
        errorCode: 'AUTH_LOOKUP_FAILED',
      });
    });
  };
};
