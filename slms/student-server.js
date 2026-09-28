require('dotenv').config();

const mongoose = require('mongoose');
const createApp = require('./src/app-factory');
const User = require('./src/models/user.model');

const port = 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slms';

async function start() {
  try {
    await mongoose.connect(mongoUri);
    await User.syncIndexes();
    
    // Create student portal app
    const app = createApp('student');
    
    app.listen(port, () => {
      console.log(`\n📚 STUDENT PORTAL running at http://localhost:${port}`);
      console.log('   Login: http://localhost:' + port + '/student-login');
      console.log('');
    });
  } catch (error) {
    console.error('Unable to connect to MongoDB. Start MongoDB and try again.');
    console.error(error.message);
    process.exitCode = 1;
  }
}

start();
