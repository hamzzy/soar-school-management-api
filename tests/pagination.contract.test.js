const test = require('node:test');
const assert = require('node:assert/strict');

const { parsePagination, encodeCursor } = require('../managers/_common/pagination');

test('pagination defaults and cap', () => {
  const parsed = parsePagination({ query: { limit: '9999' } });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.pagination.limit, 100);
  assert.equal(parsed.pagination.offset, 0);
});

test('pagination rejects malformed cursor', () => {
  const parsed = parsePagination({ query: { cursor: 'broken' } });
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.errorCode, 'VALIDATION_INVALID_CURSOR');
});

test('pagination accepts valid cursor', () => {
  const cursor = encodeCursor({
    createdAt: new Date('2026-02-22T00:00:00.000Z'),
    id: '507f1f77bcf86cd799439011',
  });
  const parsed = parsePagination({ query: { cursor, limit: '10' } });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.pagination.limit, 10);
});
