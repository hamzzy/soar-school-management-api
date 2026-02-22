const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const _decodeCursor = (cursor) => {
  try {
    const raw = Buffer.from(String(cursor), 'base64').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.createdAt || !parsed.id) return null;
    const asDate = new Date(parsed.createdAt);
    if (Number.isNaN(asDate.getTime())) return null;
    if (!OBJECT_ID_REGEX.test(parsed.id)) return null;
    return { createdAt: asDate, id: parsed.id };
  } catch (err) {
    return null;
  }
};

const encodeCursor = ({ createdAt, id }) => {
  return Buffer.from(
    JSON.stringify({
      createdAt: new Date(createdAt).toISOString(),
      id: String(id),
    }),
    'utf8'
  ).toString('base64');
};

const parsePagination = ({ query = {}, defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) => {
  const hasLimit = query.limit !== undefined;
  const hasOffset = query.offset !== undefined;
  const hasCursor = query.cursor !== undefined && query.cursor !== '';

  let limit = defaultLimit;
  if (hasLimit) {
    limit = Number(query.limit);
  }

  let offset = 0;
  if (hasOffset) {
    offset = Number(query.offset);
  }

  if (!Number.isInteger(limit) || limit < 1) {
    return {
      ok: false,
      error: {
        code: 422,
        errorCode: 'VALIDATION_INVALID_LIMIT',
        errors: [{ field: 'limit', message: 'limit must be a positive integer' }],
      },
    };
  }

  if (limit > maxLimit) limit = maxLimit;

  if (!Number.isInteger(offset) || offset < 0) {
    return {
      ok: false,
      error: {
        code: 422,
        errorCode: 'VALIDATION_INVALID_OFFSET',
        errors: [{ field: 'offset', message: 'offset must be a non-negative integer' }],
      },
    };
  }

  let cursor = null;
  if (hasCursor) {
    cursor = _decodeCursor(query.cursor);
    if (!cursor) {
      return {
        ok: false,
        error: {
          code: 422,
          errorCode: 'VALIDATION_INVALID_CURSOR',
          errors: [{ field: 'cursor', message: 'cursor is invalid' }],
        },
      };
    }
  }

  return {
    ok: true,
    pagination: { limit, offset, cursor },
  };
};

const withCursorFilter = ({ filter = {}, cursor }) => {
  if (!cursor) return filter;
  return {
    ...filter,
      $or: [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
    ],
  };
};

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  encodeCursor,
  withCursorFilter,
};
