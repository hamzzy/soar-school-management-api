const mongoose = require('mongoose');

const { Schema } = mongoose;

const StudentSchema = new Schema(
  {
    school: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    classroom: { type: Schema.Types.ObjectId, ref: 'Classroom', default: null, index: true },
    firstName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    lastName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    admissionNumber: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200, sparse: true },
    dateOfBirth: { type: Date, default: null },
    profile: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true, optimisticConcurrency: true }
);

StudentSchema.index({ school: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Student || mongoose.model('Student', StudentSchema);
