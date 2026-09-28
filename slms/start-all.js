require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     SLMS - Starting Student & Admin Portals Together       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Start Student Server
console.log('🚀 Starting Student Portal on port 3000...');
const studentServer = spawn('node', ['student-server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Wait a second then start Admin Server
setTimeout(() => {
  console.log('\n🚀 Starting Admin Portal on port 3001...\n');
  const adminServer = spawn('node', ['admin-server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  // Handle admin server errors
  adminServer.on('error', (error) => {
    console.error('❌ Admin server error:', error);
  });

  adminServer.on('close', (code) => {
    console.log(`Admin server stopped (code ${code})`);
  });
}, 1000);

// Handle student server errors
studentServer.on('error', (error) => {
  console.error('❌ Student server error:', error);
});

studentServer.on('close', (code) => {
  console.log(`Student server stopped (code ${code})`);
});

// Display info
console.log('═══════════════════════════════════════════════════════════');
console.log('📚 STUDENT PORTAL');
console.log('   URL: http://localhost:3000/student-login');
console.log('');
console.log('👤 ADMIN PORTAL');
console.log('   URL: http://localhost:3001/administrator-login');
console.log('═══════════════════════════════════════════════════════════\n');

// Handle termination
process.on('SIGINT', () => {
  console.log('\n\n⛔ Shutting down servers...');
  studentServer.kill();
  adminServer.kill();
  process.exit(0);
});
