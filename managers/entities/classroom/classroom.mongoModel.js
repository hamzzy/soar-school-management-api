const mongoose = require('mongoose');

const { Schema } = mongoose;

const ClassroomSchema = new Schema(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    gradeLevel: { type: String, trim: true, maxlength: 60, default: '' },
    capacity: { type: Number, required: true, min: 1, max: 1000 },
    resources: { type: [String], default: [] },
    homeroomTeacher: { type: String, trim: true, maxlength: 120, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true, optimisticConcurrency: true }
);

ClassroomSchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Classroom || mongoose.model('Classroom', ClassroomSchema);
