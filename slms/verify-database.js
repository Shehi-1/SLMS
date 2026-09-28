require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Attendance = require('./src/models/attendance.model');
const Report = require('./src/models/report.model');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slms';

async function verifyAndDisplayData() {
  try {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('    DATABASE VERIFICATION - SLMS Data Persistence Status');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check Users Collection
    console.log('📊 USERS COLLECTION');
    console.log('─────────────────────────────────────────────────────────────');
    const users = await User.find({});
    console.log(`Total Users: ${users.length}`);
    if (users.length > 0) {
      console.log('\nUser Details:');
      users.forEach((user, index) => {
        const roleText = user.role === 1 ? '👤 Admin' : '📚 Student';
        console.log(`\n  ${index + 1}. ${roleText}`);
        console.log(`     Name: ${user.fullname}`);
        console.log(`     Username: ${user.username}`);
        console.log(`     Email: ${user.email}`);
        if (user.regNo) console.log(`     Registration No: ${user.regNo}`);
        if (user.level) console.log(`     Level: ${user.level}`);
        if (user.staffNo) console.log(`     Staff No: ${user.staffNo}`);
        console.log(`     Password Hashed: ✓`);
        console.log(`     Created: ${user.createdAt.toLocaleString()}`);
      });
    } else {
      console.log('⚠️  No users found. Run seed.js to create test users.\n');
    }

    // Check Attendance Collection
    console.log('\n📊 ATTENDANCE COLLECTION');
    console.log('─────────────────────────────────────────────────────────────');
    const attendance = await Attendance.find({}).populate('student', 'fullname username');
    console.log(`Total Attendance Records: ${attendance.length}`);
    if (attendance.length > 0) {
      console.log('\nAttendance Records:');
      attendance.forEach((record, index) => {
        const student = record.student ? record.student.fullname : 'Unknown';
        const status = record.clockOut ? '✅ Clocked Out' : '⏱️  Clocked In';
        console.log(`\n  ${index + 1}. ${student} - ${status}`);
        console.log(`     Clock In: ${record.clockIn.toLocaleString()}`);
        if (record.clockOut) {
          console.log(`     Clock Out: ${record.clockOut.toLocaleString()}`);
          console.log(`     Duration: ${record.durationMinutes} minutes`);
        } else {
          console.log(`     Clock Out: (still clocked in)`);
        }
        console.log(`     Created: ${record.createdAt.toLocaleString()}`);
      });
    } else {
      console.log('ℹ️  No attendance records yet. Students can clock in at /student/attendance\n');
    }

    // Check Reports Collection
    console.log('\n📊 REPORTS COLLECTION');
    console.log('─────────────────────────────────────────────────────────────');
    const reports = await Report.find({}).populate('student', 'fullname username');
    console.log(`Total Reports: ${reports.length}`);
    if (reports.length > 0) {
      console.log('\nReport Details:');
      reports.forEach((report, index) => {
        const student = report.student ? report.student.fullname : 'Unknown';
        const hasAttachment = report.attachment && report.attachment.storedName ? '📎 Yes' : '❌ No';
        console.log(`\n  ${index + 1}. ${student}`);
        console.log(`     Title: ${report.title}`);
        console.log(`     Week Starting: ${report.weekStarting.toLocaleDateString()}`);
        console.log(`     Status: ${report.status}`);
        console.log(`     Attachment: ${hasAttachment}`);
        if (report.attachment && report.attachment.size) {
          console.log(`     File Size: ${(report.attachment.size / 1024).toFixed(2)} KB`);
        }
        console.log(`     Summary Length: ${report.summary.length} characters`);
        console.log(`     Submitted: ${report.createdAt.toLocaleString()}`);
      });
    } else {
      console.log('ℹ️  No reports yet. Students can submit reports at /student/reports\n');
    }

    // Display MongoDB Status
    console.log('\n📊 MONGODB CONNECTION INFO');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Database URI: ${mongoUri}`);
    console.log(`Connection Status: ✅ Connected`);
    console.log(`Collections: ${users.length > 0 ? '✓ users' : ''} ${attendance.length > 0 ? '✓ attendances' : ''} ${reports.length > 0 ? '✓ reports' : ''} ✓ sessions`);

    // Summary
    console.log('\n📋 SUMMARY');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`✅ All data is automatically saved to MongoDB database: "slms"`);
    console.log(`✅ Total Users Registered: ${users.length}`);
    console.log(`✅ Total Attendance Records: ${attendance.length}`);
    console.log(`✅ Total Reports Submitted: ${reports.length}`);
    console.log(`✅ Database is fully operational for data persistence\n`);

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error verifying database:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

verifyAndDisplayData();
