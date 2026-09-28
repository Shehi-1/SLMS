/**
 * Database Configuration and Data Persistence Guide
 * SLMS - Student Logbook Management System
 * 
 * This system automatically saves ALL data to MongoDB.
 * Below is a complete guide of what gets saved and where.
 */

// ============================================
// 1. USER DATA (Users Collection)
// ============================================
/*
All user registrations and logins are saved to MongoDB:

CREATE NEW ACCOUNT:
- Admin Registration: POST /admin/register
  - Saves: fullname, username, email, staffNo, passwordHash, role=1
  
- Student Registration: POST /student/register  
  - Saves: fullname, username, email, regNo (registration number), 
    level (100-500), passwordHash, role=2

ADMIN CREATE NEW STUDENT: 
- POST /admin/users/new
  - Saves: Same as student registration

LOGIN:
- Authentication updates MongoDB session store
- Session data includes: user ID, role, name
- Stored in: connect-mongo session collection

PASSWORD UPDATES:
- Legacy passwords auto-migrated to bcryptjs hashing
- POST /change-password updates passwordHash
*/

// ============================================
// 2. ATTENDANCE DATA (Attendance Collection)
// ============================================
/*
Student clock-in/clock-out tracking:

CLOCK IN:
- Route: POST /student/attendance/clock-in
- Saves: {
    student: ObjectId (ref to User),
    clockIn: Date (current time),
    clockOut: null,
    durationMinutes: null,
    createdAt: Date,
    updatedAt: Date
  }

CLOCK OUT:
- Route: POST /student/attendance/clock-out/:id
- Updates: {
    clockOut: Date (current time),
    durationMinutes: number (calculated)
  }

RETRIEVE:
- GET /student/attendance
- Displays all attendance records sorted by date
- All data persists in MongoDB
*/

// ============================================
// 3. REPORTS DATA (Report Collection)
// ============================================
/*
Student weekly reports with file attachments:

SUBMIT REPORT:
- Route: POST /student/reports
- Saves: {
    student: ObjectId (ref to User),
    weekStarting: Date (Monday of week),
    title: String (max 120 chars),
    summary: String (max 5000 chars),
    attachment: {
      originalName: String,
      storedName: String (hashed filename),
      mimeType: String (pdf, doc, docx, txt),
      size: Number (bytes)
    },
    status: 'submitted' or 'reviewed',
    createdAt: Date,
    updatedAt: Date
  }
- File saved to: uploads/reports/ folder

RETRIEVE REPORTS:
- GET /student/reports
- All reports displayed sorted by week
- Admin can view all student reports
*/

// ============================================
// 4. SESSIONS (Sessions Collection)
// ============================================
/*
Session management via connect-mongo:

AUTOMATIC PERSISTENCE:
- Express-session auto-saves to MongoDB
- Collection: sessions
- Expires after 8 hours of inactivity
- Stores: user ID, role, permissions, CSRF token
*/

// ============================================
// 5. DATABASE MODELS & INDEXES
// ============================================
/*
User Model Indexes:
- username (1) + role (1) - unique compound index
- email - unique index
- regNo - unique sparse index (only for students)
- staffNo - unique sparse index (only for admins)

Attendance Model Indexes:
- student (1) + clockOut (1)
- Optimized for queries like "find open clock-in"

Report Model Indexes:
- student (1) + weekStarting (-1)
- Optimized for "student's reports by week"
*/

// ============================================
// OPERATIONS SUMMARY
// ============================================
const dataOperations = {
  'User Registration': {
    method: 'POST',
    route: '/admin/register or /student/register',
    saves: 'Users collection',
    auto_generates: 'Unique ID, timestamps'
  },
  'Attendance Clock-In': {
    method: 'POST',
    route: '/student/attendance/clock-in',
    saves: 'Attendance collection',
    auto_generates: 'Clock-in timestamp, ID'
  },
  'Attendance Clock-Out': {
    method: 'POST',
    route: '/student/attendance/clock-out/:id',
    saves: 'Attendance collection (update)',
    auto_calculates: 'Duration in minutes'
  },
  'Submit Report': {
    method: 'POST',
    route: '/student/reports',
    saves: 'Reports collection + files to disk',
    auto_generates: 'Report ID, timestamps, week reference'
  },
  'Login': {
    method: 'POST',
    route: '/:role/login',
    saves: 'Sessions collection via connect-mongo',
    duration: '8 hours'
  },
  'Password Change': {
    method: 'POST',
    route: '/change-password',
    saves: 'Users collection (passwordHash update)',
    auto_generates: 'New hash timestamp'
  }
};

// ============================================
// TESTING & VERIFICATION
// ============================================
/*
To verify data is being saved:

1. Login to MongoDB with mongosh:
   mongosh mongodb://127.0.0.1:27017/slms

2. Check collections:
   show collections
   
3. View users:
   db.users.find({})
   
4. View attendance:
   db.attendances.find({})
   
5. View reports:
   db.reports.find({})
   
6. View sessions:
   db.sessions.find({})
*/

// ============================================
// DATA FLOW DIAGRAM
// ============================================
/*
USER INTERACTION → EXPRESS ROUTES → MONGOOSE MODELS → MONGODB
                                         ↓
                                  Validation
                                  Encryption (passwords)
                                  Indexing
                                  Timestamps
                                  References

EXAMPLE FLOW:
User fills form → POST /student/register → 
Validation checks → Bcryptjs hashing → 
User.create() → MongoDB save → 
Unique indexes enforced → 
Auto timestamps added → 
Session created → 
connect-mongo saves session
*/

console.log('✅ All data is automatically saved to MongoDB');
console.log('✅ Every action has persistent storage');
console.log('✅ Transactions include: Users, Attendance, Reports, Sessions');
