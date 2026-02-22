module.exports = ({ managers }) => {
  return ({ res, results, next }) => {
    const auth = results.__auth;
    if (!auth) {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        errors: 'unauthorized',
        errorCode: 'AUTH_UNAUTHORIZED',
      });
    }

    if (auth.role !== 'superadmin') {
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 403,
        errors: 'forbidden',
        errorCode: 'AUTH_FORBIDDEN',
      });
    }

    return next(auth);
  };
};
