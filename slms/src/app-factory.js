const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');

// Shared configuration
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slms';
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set in the environment.');
}

function createApp(portalType) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'assets')));
  
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUri }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8
    }
  }));

  app.use((request, response, next) => {
    response.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (!request.session.csrfToken) {
      request.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    response.locals.csrfToken = request.session.csrfToken;
    // Set portal type globally for templates
    response.locals.portalType = portalType;
    next();
  });

  // STRICT Redirect middleware - block wrong routes immediately
  app.use((request, response, next) => {
    const path = request.path;
    const isAdminPath = path.startsWith('/admin') || path.startsWith('/administrator-login') || path.startsWith('/admin/');
    const isStudentPath = path.startsWith('/student') || path.startsWith('/student-login') || path.startsWith('/student/');
    
    // Allow health check and root on all portals
    if (path === '/' || path === '/health') {
      return next();
    }
    
    // Allow login pages and logout
    if (path.startsWith('/change-password') || path === '/logout') {
      return next();
    }
    
    // Student portal: BLOCK all admin routes
    if (portalType === 'student' && isAdminPath) {
      if (!request.session.user) {
        return response.redirect('/student-login');
      }
      // If logged in but trying to access admin, also redirect
      return response.redirect('/student/dashboard');
    }
    
    // Admin portal: BLOCK all student routes
    if (portalType === 'admin' && isStudentPath) {
      if (!request.session.user) {
        return response.redirect('/administrator-login');
      }
      // If logged in but trying to access student, also redirect
      return response.redirect('/admin/dashboard');
    }
    
    next();
  });

  app.get('/health', (request, response) => {
    response.json({ status: 'ok', service: `slbms-node-${portalType}` });
  });

  // Import routes
  const authRoutes = require('./routes/auth.routes');
  const userRoutes = require('./routes/user.routes');
  const studentRoutes = require('./routes/student.routes');

  // Use routes
  app.use(authRoutes);
  app.use(userRoutes);
  app.use(studentRoutes);

  // Error handling
  app.use((request, response) => {
    response.status(404).render('error', { message: 'Page not found' });
  });

  app.use((error, request, response, next) => {
    const message = process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message;
    response.status(500).render('error', { message });
  });

  return app;
}

module.exports = createApp;
