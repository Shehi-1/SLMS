const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  regNo: {
    type: String,
    trim: true,
    uppercase: true,
    required: function () { return this.role === 2; },
    unique: true,
    sparse: true
  },
  level: { type: String, trim: true, enum: ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level'] },
  staffNo: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  role: { type: Number, enum: [1, 2], required: true },
  mustChangePassword: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.index({ username: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
