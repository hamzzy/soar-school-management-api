const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 200 },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['superadmin', 'school_admin'] },
    school: { type: Schema.Types.ObjectId, ref: 'School', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true, optimisticConcurrency: true }
);

UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
