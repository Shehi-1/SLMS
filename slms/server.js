require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/user.model');

const port = Number(process.env.PORT || 3000);
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slms';

async function start() {
  try {
    await mongoose.connect(mongoUri);
    await User.syncIndexes();
    app.listen(port, () => {
      console.log(`SLBMS Node server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to MongoDB. Start MongoDB and try again.');
    console.error(error.message);
    process.exitCode = 1;
  }
}

start();
