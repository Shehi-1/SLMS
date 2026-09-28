require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/user.model');

// Different ports for admin and student
const ports = {
  student: Number(process.env.PORT || 3000),
  admin: Number(process.env.ADMIN_PORT || 3001)
};

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slms';

async function start() {
  try {
    await mongoose.connect(mongoUri);
    await User.syncIndexes();
    
    // Start student server
    app.listen(ports.student, () => {
      console.log(`\n📚 STUDENT PORTAL running at http://localhost:${ports.student}`);
      console.log('   Login: http://localhost:' + ports.student + '/student-login');
      console.log('');
    });

    // Start admin server on different port
    const adminApp = require('./src/app');
    adminApp.listen(ports.admin, () => {
      console.log(`👤 ADMIN PORTAL running at http://localhost:${ports.admin}`);
      console.log('   Login: http://localhost:' + ports.admin + '/administrator-login');
      console.log('');
    });

  } catch (error) {
    console.error('Unable to connect to MongoDB. Start MongoDB and try again.');
    console.error(error.message);
    process.exitCode = 1;
  }
}

start();
