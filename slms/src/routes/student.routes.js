const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const express = require('express');
const multer = require('multer');
const Attendance = require('../models/attendance.model');
const Report = require('../models/report.model');
const { requireAuth, requireRole, requireCsrf } = require('../middleware/auth.middleware');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', '..', 'uploads', 'reports');
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);
const maximumUploadSize = 5 * 1024 * 1024;
const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maximumUploadSize },
  fileFilter: (request, file, callback) => callback(null, allowedMimeTypes.has(file.mimetype))
});

function studentOnly(request, response, next) {
  return requireAuth(request, response, () => requireRole(2)(request, response, next));
}

function startOfWeek(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date;
}

function adminOnly(request, response, next) {
  return requireAuth(request, response, () => requireRole(1)(request, response, next));
}

router.get('/student/attendance', studentOnly, async (request, response, next) => {
  return response.redirect(`/student/dashboard?view=attendance${request.query.error ? `&error=${encodeURIComponent(request.query.error)}` : ''}`);
});

router.post('/student/attendance/clock-in', studentOnly, requireCsrf, async (request, response, next) => {
  try {
    const openEntry = await Attendance.findOne({ student: request.session.user.id, clockOut: null });
    if (openEntry) return response.redirect('/student/dashboard?view=attendance&error=already-clocked-in');
    await Attendance.create({ student: request.session.user.id, clockIn: new Date() });
    return response.redirect('/student/dashboard?view=attendance');
  } catch (error) {
    return next(error);
  }
});

router.post('/student/attendance/clock-out/:id', studentOnly, requireCsrf, async (request, response, next) => {
  try {
    const entry = await Attendance.findOne({ _id: request.params.id, student: request.session.user.id, clockOut: null });
    if (!entry) return response.redirect('/student/dashboard?view=attendance&error=attendance-not-found');
    const clockOut = new Date();
    entry.clockOut = clockOut;
    entry.durationMinutes = Math.max(0, Math.round((clockOut.getTime() - entry.clockIn.getTime()) / 60000));
    await entry.save();
    return response.redirect('/student/dashboard?view=attendance');
  } catch (error) {
    return next(error);
  }
});

router.get('/student/reports', studentOnly, async (request, response, next) => {
  return response.redirect(`/student/dashboard?view=reports${request.query.error ? `&error=${encodeURIComponent(request.query.error)}` : ''}`);
});

router.post('/student/reports', studentOnly, reportUpload.single('attachment'), requireCsrf, async (request, response, next) => {
  try {
    const fields = request.body || {};
    let attachment = null;
    if (request.file) {
      const storedName = `${crypto.randomUUID()}${path.extname(request.file.originalname).toLowerCase()}`;
      await fs.mkdir(uploadDirectory, { recursive: true });
      await fs.writeFile(path.join(uploadDirectory, storedName), request.file.buffer);
      attachment = { originalName: request.file.originalname, storedName, mimeType: request.file.mimetype, size: request.file.size };
    }

    const weekStarting = startOfWeek(String(fields.weekStarting || ''));
    const title = String(fields.title || '').trim();
    const summary = String(fields.summary || '').trim();
    if (!weekStarting || !title || !summary || summary.length > 5000) {
      const reports = await Report.find({ student: request.session.user.id }).sort({ weekStarting: -1 }).lean();
      return response.redirect(`/student/dashboard?view=reports&error=invalid-report&weekStarting=${encodeURIComponent(fields.weekStarting || '')}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`);
    }

    await Report.findOneAndUpdate(
      { student: request.session.user.id, weekStarting },
      { student: request.session.user.id, weekStarting, title, summary, ...(attachment ? { attachment } : {}) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return response.redirect('/student/dashboard?view=reports');
  } catch (error) {
    if (error.message === 'Upload too large') return response.redirect('/student/dashboard?view=reports&error=invalid-file');
    return next(error);
  }
});

router.get('/admin/attendance', adminOnly, async (request, response, next) => {
  return response.redirect('/admin/dashboard?view=admin-attendance');
});

router.get('/admin/reports', adminOnly, async (request, response, next) => {
  return response.redirect('/admin/dashboard?view=admin-reports');
});

router.get('/admin/reports/:id', adminOnly, async (request, response, next) => {
  return response.redirect(`/admin/dashboard?view=report-detail&id=${encodeURIComponent(request.params.id)}`);
});

router.post('/admin/reports/:id/review', adminOnly, requireCsrf, async (request, response, next) => {
  try {
    await Report.findByIdAndUpdate(request.params.id, { status: 'reviewed' });
    return response.redirect('/admin/dashboard?view=admin-reports');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
