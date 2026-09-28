require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const User = require('./src/models/user.model');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slms';

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB at:', mongoUri);

    // Clear existing users
    console.log('Clearing existing users...');
    const deletedCount = await User.deleteMany({});
    console.log(`✓ Cleared ${deletedCount.deletedCount} existing users`);

    // Hash passwords
    console.log('Hashing passwords...');
    const adminHash = await bcryptjs.hash('password123', 10);
    const staffHash = await bcryptjs.hash('password123', 10);

    // Define admin users to seed
    const adminUsers = [
      {
        fullname: 'Admin',
        username: 'admin',
        email: 'admin@gmail.com',
        passwordHash: adminHash,
        role: 1,
        mustChangePassword: true
      },
      {
        fullname: 'John Smith',
        username: 'jsmith',
        email: 'jsmith@sample.com',
        regNo: 'STU001',
        level: '200 Level',
        passwordHash: staffHash,
        role: 2,
        mustChangePassword: true
      }
    ];

    // Insert admin users
    console.log('Inserting users...');
    const insertedUsers = await User.insertMany(adminUsers);
    console.log(`✓ Inserted ${insertedUsers.length} users:`);
    insertedUsers.forEach((user, index) => {
      const roleText = user.role === 1 ? 'Admin' : 'Student';
      console.log(`  ${index + 1}. ${user.fullname} (${user.username}) - Role: ${roleText}`);
    });

    // Display all users in MongoDB
    console.log('\n📊 All users in MongoDB:');
    const allUsers = await User.find({});
    console.log(`Total users: ${allUsers.length}`);
    allUsers.forEach((user, index) => {
      const roleText = user.role === 1 ? 'Admin' : 'Student';
      console.log(`  ${index + 1}. ${user.fullname} (${user.username}) - Email: ${user.email} - Role: ${roleText}`);
    });

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('  Admin - Username: admin, Password: password123');
    console.log('  Student - Username: jsmith, Password: password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);
  }
}

seedDatabase();
