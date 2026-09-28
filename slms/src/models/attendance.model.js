const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clockIn: { type: Date, required: true },
  clockOut: { type: Date, default: null },
  durationMinutes: { type: Number, default: null }
}, { timestamps: true });

attendanceSchema.index({ student: 1, clockOut: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
