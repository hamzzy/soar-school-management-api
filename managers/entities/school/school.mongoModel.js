const mongoose = require('mongoose');

const { Schema } = mongoose;

const SchoolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    code: { type: String, trim: true, uppercase: true, maxlength: 40, sparse: true, unique: true },
    address: { type: String, trim: true, maxlength: 250, default: '' },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    contactPhone: { type: String, trim: true, maxlength: 40, default: '' },
    profile: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true, optimisticConcurrency: true }
);

SchoolSchema.index({ code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.School || mongoose.model('School', SchoolSchema);
