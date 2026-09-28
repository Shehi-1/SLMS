const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const MongoStore = require('connect-mongo');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const studentRoutes = require('./routes/student.routes');
const crypto = require('crypto');

const app = express();
const sessionSecret = process.env.SESSION_SECRET;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slms';

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set in the environment.');
}

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
  next();
});

app.get('/health', (request, response) => {
  response.json({ status: 'ok', service: 'slbms-node' });
});

// Auth routes (login, register, logout)
app.use(authRoutes);

// User management routes
app.use(userRoutes);

// Student routes (attendance, reports)
app.use(studentRoutes);

// Error handling
app.use((request, response) => {
  response.status(404).render('error', { message: 'Page not found' });
});

app.use((error, request, response, next) => {
  const message = process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message;
  response.status(500).render('error', { message });
});

module.exports = app;
