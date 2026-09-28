const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weekStarting: { type: Date, required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  summary: { type: String, required: true, trim: true, maxlength: 5000 },
  attachment: {
    originalName: { type: String, trim: true },
    storedName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number }
  },
  status: { type: String, enum: ['submitted', 'reviewed'], default: 'submitted' }
}, { timestamps: true });

reportSchema.index({ student: 1, weekStarting: -1 });

module.exports = mongoose.model('Report', reportSchema);
