const { withCursorFilter, encodeCursor } = require('../_common/pagination');

module.exports = class StudentRepository {
  constructor({ model }) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  findById(id) {
    return this.model.findById(id);
  }

  findByIdLean(id) {
    return this.model.findById(id).lean();
  }

  async listPaginated({ filter = {}, pagination }) {
    const scopedFilter = withCursorFilter({ filter, cursor: pagination.cursor });
    let q = this.model.find(scopedFilter).sort({ createdAt: -1, _id: -1 }).limit(pagination.limit);
    if (!pagination.cursor) q = q.skip(pagination.offset);
    const docs = await q.lean();

    let nextCursor = null;
    if (docs.length === pagination.limit) {
      const last = docs[docs.length - 1];
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last._id });
    }

    return { docs, nextCursor };
  }

  countBySchoolId(schoolId) {
    return this.model.countDocuments({ school: schoolId });
  }

  countByClassroomId(classroomId) {
    return this.model.countDocuments({ classroom: classroomId });
  }

  deleteById(id) {
    return this.model.deleteOne({ _id: id });
  }
}
