const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user.model');
const Attendance = require('../models/attendance.model');
const Report = require('../models/report.model');
const { requireAuth, requireCsrf } = require('../middleware/auth.middleware');

const router = express.Router();
const loginPages = {
  admin: { role: 1, loginPath: '/administrator-login', dashboard: '/admin/dashboard', title: 'Administrator Login', registration: 'Create administrator account' },
  student: { role: 2, loginPath: '/student-login', dashboard: '/student/dashboard', title: 'Student Login', registration: 'Create student account' }
};

async function verifyPassword(user, password) {
  if (!user) return false;

  if (typeof user.passwordHash === 'string' && user.passwordHash.startsWith('$2')) {
    return bcrypt.compare(password, user.passwordHash);
  }

  const legacyHash = user.passwordHash || user.password;
  if (typeof legacyHash !== 'string' || !/^[a-f0-9]{32}$/i.test(legacyHash)) return false;

  const matches = crypto.createHash('md5').update(password).digest('hex') === legacyHash.toLowerCase();
  if (matches) {
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save({ validateBeforeSave: false });
  }
  return matches;
}

function renderLogin(response, area, error = null, values = {}) {
  return response.render('login', {
    error,
    area,
    title: loginPages[area].title,
    registration: loginPages[area].registration,
    values
  });
}

router.get('/', (request, response) => {
  return response.redirect(loginPages.student.loginPath);
});

router.get('/admin', (request, response) => {
  return response.redirect(loginPages.admin.loginPath);
});

router.get('/student', (request, response) => {
  return response.redirect(loginPages.student.loginPath);
});

Object.entries(loginPages).forEach(([area, loginPage]) => {
  const renderLoginPage = (request, response) => {
    if (request.session.user && request.session.user.area === area) {
      return response.redirect(loginPages[request.session.user.area].dashboard);
    }

    const error = request.query.error === 'expired' ? 'Your form expired. Please try again.' : null;
    return response.render('login', { error, area, title: loginPage.title, registration: loginPage.registration, loginAction: loginPage.loginPath, values: {} });
  };

  router.get(loginPage.loginPath, renderLoginPage);
  router.get(`/${area}/login`, renderLoginPage);

  const handleLogin = async (request, response, next) => {
  try {
    const loginIdentifier = String(request.body[`${area}_login_username`] || request.body.username || '').trim();
    const username = loginIdentifier.toLowerCase();
    const password = String(request.body[`${area}_login_password`] || request.body.password || '');

    if (!loginIdentifier || !password) {
      return response.status(400).render('login', {
        error: 'Username and password are required.',
        area,
        title: loginPage.title,
        registration: loginPage.registration,
        values: { username }
      });
    }

    const userQuery = loginPage.role === 2
      ? { role: loginPage.role, $or: [{ username }, { regNo: loginIdentifier.toUpperCase() }] }
      : { username, role: loginPage.role };
    const user = await User.findOne(userQuery);
    const passwordMatches = await verifyPassword(user, password);

    if (!passwordMatches) {
      return response.status(401).render('login', {
        error: 'Invalid username or password for this area.',
        area,
        title: loginPage.title,
        registration: loginPage.registration,
        values: { username }
      });
    }

    request.session.regenerate((error) => {
      if (error) return next(error);

      request.session.user = {
        id: user.id,
        fullname: user.fullname,
        role: user.role,
        area,
        mustChangePassword: user.mustChangePassword,
        username: user.username,
        email: user.email,
        regNo: user.regNo || null,
        level: user.level || null,
        staffNo: user.staffNo || null,
      };

      return response.redirect(user.mustChangePassword ? '/change-password' : loginPage.dashboard);
    });
  } catch (error) {
    return next(error);
  }
  };
  router.post(`/${area}/login`, requireCsrf, handleLogin);
  router.post(loginPage.loginPath, requireCsrf, handleLogin);
});

function logout(request, response, next) {
  const area = request.path.startsWith('/admin/')
    ? 'admin'
    : request.path.startsWith('/student/')
      ? 'student'
      : request.session.user && loginPages[request.session.user.area]
        ? request.session.user.area
        : 'student';
  const loginPath = loginPages[area].loginPath;

  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie('connect.sid');
    return response.redirect(loginPath);
  });
}

router.get('/logout', logout);
router.post('/logout', requireCsrf, logout);
router.post('/student/logout', requireCsrf, logout);
router.post('/admin/logout', requireCsrf, logout);

router.get('/change-password', requireAuth, (request, response) => {
  return response.render('change-password', { error: null, area: request.session.user.area });
});

router.post('/change-password', requireAuth, requireCsrf, async (request, response, next) => {
  const password = String(request.body.password || '');
  const confirmation = String(request.body.confirmPassword || '');

  if (password.length < 8 || password !== confirmation) {
    return response.status(400).render('change-password', { error: 'Passwords must match and contain at least 8 characters.', area: request.session.user.area });
  }

  try {
    const user = await User.findById(request.session.user.id);
    if (!user) return response.redirect('/');
    user.passwordHash = await bcrypt.hash(password, 12);
    user.mustChangePassword = false;
    await user.save();
    request.session.user.mustChangePassword = false;
    return response.redirect(`/${request.session.user.area}/dashboard`);
  } catch (error) {
    return next(error);
  }
});

Object.entries(loginPages).forEach(([area, loginPage]) => {
  router.get(`/${area}/dashboard`, async (request, response, next) => {
    if (!request.session.user || request.session.user.area !== area) {
      return response.redirect(`/${area}/login`);
    }

    try {
      const user = await User.findById(request.session.user.id).lean();
      if (!user || user.role !== loginPage.role) {
        request.session.destroy(() => {});
        return response.redirect(`/${area}/login`);
      }

      request.session.user = {
        ...request.session.user,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        regNo: user.regNo || null,
        level: user.level || null,
        staffNo: user.staffNo || null,
        mustChangePassword: user.mustChangePassword
      };

      const view = ['timeline', 'details', 'attendance', 'reports', 'users', 'admin-attendance', 'admin-reports', 'report-detail'].includes(request.query.view) ? request.query.view : 'overview';
        const stats = area === 'student'
          ? { attendanceCount: await Attendance.countDocuments({ student: user._id }), reportCount: await Report.countDocuments({ student: user._id }) }
          : { attendanceCount: 0, reportCount: await Report.countDocuments(), studentCount: await User.countDocuments({ role: 2 }) };
        const attendance = area === 'student'
          ? await Attendance.find({ student: user._id }).sort({ clockIn: -1 }).lean()
          : [];
        const reports = area === 'student'
          ? await Report.find({ student: user._id }).sort({ weekStarting: -1 }).lean()
          : [];
        const students = area === 'admin' && view === 'users'
          ? await User.find({ role: 2 }).select('fullname username email regNo level createdAt').sort({ fullname: 1 }).lean()
          : [];
        const adminRecords = area === 'admin' && ['admin-attendance', 'admin-reports'].includes(view)
          ? view === 'admin-attendance'
            ? await Attendance.find().populate('student', 'fullname username regNo').sort({ clockIn: -1 }).lean()
            : await Report.find().populate('student', 'fullname username regNo').sort({ weekStarting: -1 }).lean()
          : [];
        const adminReport = area === 'admin' && view === 'report-detail'
          ? await Report.findById(request.query.id).populate('student', 'fullname username regNo').lean()
          : null;
        const error = request.query.error === 'invalid-file'
          ? 'Upload a PDF, Word document, or text file up to 5 MB.'
          : request.query.error === 'expired'
            ? 'This form expired. Please try again.'
            : request.query.error === 'already-clocked-in'
              ? 'You already have an active attendance record.'
              : request.query.error === 'attendance-not-found'
                ? 'That attendance record could not be found.'
                : null;
        const values = {
          weekStarting: request.query.weekStarting || '',
          title: request.query.title || '',
          summary: request.query.summary || ''
        };
        const timeline = area === 'student'
          ? [
              ...(await Report.find({ student: user._id }).sort({ weekStarting: -1 }).lean()).map(report => ({
                type: 'report',
                date: report.weekStarting,
                title: report.title,
                detail: report.status === 'reviewed' ? 'Report reviewed' : 'Report submitted',
                href: '/student/reports'
              })),
              ...(await Attendance.find({ student: user._id }).sort({ clockIn: -1 }).lean()).map(entry => ({
                type: 'attendance',
                date: entry.clockIn,
                title: entry.clockOut ? 'Attendance completed' : 'Attendance in progress',
                detail: entry.clockOut ? `${entry.durationMinutes || 0} minutes recorded` : 'Clocked in',
                href: '/student/attendance'
              }))
            ].sort((first, second) => new Date(second.date) - new Date(first.date))
          : [];
        return response.render('dashboard', { user: request.session.user, area, view, stats, timeline, attendance, reports, error, values, students, adminRecords, adminReport });
    } catch (error) {
      return next(error);
    }
  });
});

module.exports = router;
