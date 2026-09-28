const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { requireAuth, requireRole, requireCsrf } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/admin/users', requireAuth, requireRole(1), async (request, response, next) => {
  return response.redirect('/admin/dashboard?view=users');
});

function registrationData(request, area, error = null, values = {}) {
  return {
    error: error || (request.query.error === 'expired' ? 'Your form expired. Please try again.' : null),
    created: request.query.created === '1',
    area,
    values
  };
}

for (const [area, role] of [['admin', 1], ['student', 2]]) {
  router.get(`/${area}/register`, (request, response) => {
    return response.render('register', registrationData(request, area));
  });

  router.post(`/${area}/register`, requireCsrf, async (request, response, next) => {
    const values = {
      fullname: String(request.body.fullname || '').trim(),
      username: String(request.body.username || '').trim().toLowerCase(),
      email: String(request.body.email || '').trim().toLowerCase(),
      regNo: area === 'student' ? String(request.body.regNo || '').trim().toUpperCase() : '',
      level: area === 'student' ? String(request.body.level || '').trim() : '',
      staffNo: area === 'admin' ? String(request.body.staffNo || '').trim().toUpperCase() : ''
    };
    const password = String(request.body.password || '');

    try {
      if (area === 'admin' && process.env.ADMIN_REGISTRATION_KEY && request.body.registrationKey !== process.env.ADMIN_REGISTRATION_KEY) {
        return response.status(403).render('register', registrationData(request, area, 'A valid administrator setup key is required.', values));
      }

      if (!values.fullname || !values.username || !values.email || (area === 'student' && (!values.regNo || !values.level)) || (area === 'admin' && !values.staffNo) || password.length < 8) {
        return response.status(400).render('register', registrationData(
          request,
          area,
          'Name, username, email, and a password of at least 8 characters are required.',
          values
        ));
      }

      const existingUser = await User.findOne({
        $or: [
          { username: values.username, role },
          { email: values.email },
          ...(area === 'student' ? [{ regNo: values.regNo }] : [{ staffNo: values.staffNo }])
        ]
      });

      if (existingUser) {
        return response.status(409).render('register', registrationData(
          request,
          area,
          'That username or email is already registered.',
          values
        ));
      }

      await User.create({
        fullname: values.fullname,
        username: values.username,
        email: values.email,
        ...(area === 'student' ? { regNo: values.regNo, level: values.level } : { staffNo: values.staffNo }),
        passwordHash: await bcrypt.hash(password, 12),
        role,
        mustChangePassword: false
      });

      return response.redirect(`/${area}/register?created=1`);
    } catch (error) {
      if (error.code === 11000) {
        return response.status(409).render('register', registrationData(request, area, 'That username, email, or registration number is already registered.', values));
      }
      return next(error);
    }
  });
}

router.get('/admin/users/new', requireAuth, requireRole(1), (request, response) => {
  response.render('new-student', { error: null, values: {}, request });
});

router.post('/admin/users/new', requireAuth, requireRole(1), async (request, response, next) => {
  const values = {
    fullname: String(request.body.fullname || '').trim(),
    username: String(request.body.username || '').trim().toLowerCase(),
    email: String(request.body.email || '').trim().toLowerCase(),
    regNo: String(request.body.regNo || '').trim().toUpperCase(),
    level: String(request.body.level || '').trim()
  };
  const password = String(request.body.password || '');

  try {
    if (!values.fullname || !values.username || !values.email || !values.regNo || !values.level || password.length < 8) {
      return response.status(400).render('new-student', {
        error: 'Name, username, email, and a password of at least 8 characters are required.',
        values,
        request
      });
    }

    const existingUser = await User.findOne({
      $or: [{ username: values.username, role: 2 }, { email: values.email }, { regNo: values.regNo }]
    });

    if (existingUser) {
      return response.status(409).render('new-student', {
        error: 'That username or email is already registered.',
        values,
        request
      });
    }

    await User.create({
      ...values,
      passwordHash: await bcrypt.hash(password, 12),
      role: 2,
      mustChangePassword: false
    });

    return response.redirect('/admin/users/new?created=1');
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).render('new-student', {
        error: 'That username, email, or registration number is already registered.',
        values,
        request
      });
    }
    return next(error);
  }
});

router.get('/admin/staff/new', requireAuth, requireRole(1), (request, response) => {
  response.render('new-staff', { error: null, values: {}, request });
});

router.post('/admin/staff/new', requireAuth, requireRole(1), requireCsrf, async (request, response, next) => {
  const values = {
    fullname: String(request.body.fullname || '').trim(),
    username: String(request.body.username || '').trim().toLowerCase(),
    email: String(request.body.email || '').trim().toLowerCase(),
    staffNo: String(request.body.staffNo || '').trim().toUpperCase()
  };
  const password = String(request.body.password || '');

  try {
    if (!values.fullname || !values.username || !values.email || !values.staffNo || password.length < 8) {
      return response.status(400).render('new-staff', {
        error: 'Name, username, email, and a password of at least 8 characters are required.',
        values,
        request
      });
    }

    const existingUser = await User.findOne({ $or: [{ username: values.username, role: 1 }, { email: values.email }, { staffNo: values.staffNo }] });
    if (existingUser) {
      return response.status(409).render('new-staff', {
        error: 'That username or email is already registered.',
        values,
        request
      });
    }

    await User.create({
      ...values,
      passwordHash: await bcrypt.hash(password, 12),
      role: 1,
      mustChangePassword: false
    });

    return response.redirect('/admin/staff/new?created=1');
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).render('new-staff', {
        error: 'That username or email is already registered.',
        values,
        request
      });
    }
    return next(error);
  }
});

module.exports = router;
