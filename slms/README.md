# Student Logbook Management System

A role-based web application for managing student industrial-training records. The current application uses Node.js, Express, EJS, MongoDB, and server-side sessions to provide separate student and administrator portals.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the application](#running-the-application)
- [Initial data](#initial-data)
- [User workflows](#user-workflows)
- [Routes](#routes)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Legacy PHP application](#legacy-php-application)

## Overview

SLMS gives students a workspace for recording placement attendance and submitting weekly reports. Administrators use a separate workspace to manage accounts, inspect attendance, and review submitted reports.

The two portals use independent Express application instances and share the same MongoDB database:

| Portal | Default port | Login page | Main audience |
| --- | ---: | --- | --- |
| Student | `3000` | `http://localhost:3000/student-login` | Students |
| Administrator | `3001` | `http://localhost:3001/administrator-login` | Administrators |

Portal middleware redirects requests for the wrong role back to the correct portal, keeping the navigation and sidebar appropriate to the active workspace.

## Features

### Student portal

- Sign in with a username or registration number.
- View a personal dashboard.
- Clock in and clock out for placement attendance.
- See attendance history and calculated duration.
- Create or update one weekly report per week.
- Add an optional PDF, DOC, DOCX, or TXT attachment up to 5 MB.
- Change an initial or existing password.

### Administrator portal

- Sign in through the administrator-only portal.
- View dashboard summaries.
- Create student accounts and administrator/staff accounts.
- Review student attendance records.
- View submitted weekly reports and mark them as reviewed.
- Change passwords and manage account details.

## Architecture

- **Runtime:** Node.js
- **Web framework:** Express 5
- **Templates:** EJS
- **Database:** MongoDB through Mongoose
- **Sessions:** `express-session` with `connect-mongo`
- **Authentication:** Role-based sessions with bcrypt password hashes
- **Uploads:** Multer memory handling followed by storage in `uploads/reports/`
- **HTTP hardening:** Helmet, no-store response headers, and session-based CSRF tokens

Each portal starts its own application instance through `src/app-factory.js`. The shared route and model modules are used by both portals, while portal middleware blocks cross-portal routes.

## Requirements

- Node.js 18 or newer recommended
- npm
- MongoDB running locally or an accessible MongoDB deployment
- Windows users may use the included `.bat` launchers; PowerShell, Command Prompt, and Git Bash are also supported

## Installation

From the project directory:

```bash
npm install
```

Create a local environment file from the template:

```bash
copy .env.example .env
```

On macOS/Linux, use:

```bash
cp .env.example .env
```

Edit `.env` and replace the session secret with a long, random value. Start MongoDB before starting the application.

## Configuration

The application reads these variables from `.env`:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Enables production cookie behavior when set to `production` |
| `PORT` | No | `3000` | Port used by `server.js` and the student portal configuration |
| `ADMIN_PORT` | No | `3001` | Administrator port when using `server-dual.js` |
| `MONGODB_URI` | No | `mongodb://127.0.0.1:27017/slms` | MongoDB connection string |
| `SESSION_SECRET` | **Yes** | None | Secret used to sign session cookies |
| `ADMIN_REGISTRATION_KEY` | No | None | Optional key required for public administrator registration |

Do not commit `.env` or production credentials. `.env.example` is the safe configuration template.

## Running the application

### Recommended: both portals

Run both portals with automatic reload:

```bash
npm run dev:both
```

This starts the student portal on port `3000` and the administrator portal on port `3001`.

For Windows, these launchers are also available:

```text
run-both.bat       Opens both portals in separate Command Prompt windows.
run-both-together.bat  Alternative combined launcher.
```

### Run one portal

```bash
npm run dev:student  # Student portal: http://localhost:3000
npm run dev:admin    # Administrator portal: http://localhost:3001
```

### Run the single shared server

```bash
npm start
```

This starts `server.js` on `PORT` (default `3000`). It is useful for general development, but it does not provide the separate-port experience of `npm run dev:both`.

### Useful checks

```bash
npm run check
```

This runs Node syntax checks against the main server, application, authentication, user, middleware, and model files.

Health checks:

```text
http://localhost:3000/health
http://localhost:3001/health
```

A healthy response contains a JSON status of `ok`.

## Initial data

To create local development users, run:

```bash
node seed.js
```

The seed script currently creates:

| Role | Username | Password | Email |
| --- | --- | --- | --- |
| Administrator | `admin` | `password123` | `admin@gmail.com` |
| Student | `jsmith` | `password123` | `jsmith@sample.com` |

**Important:** `seed.js` deletes all existing users before inserting these records. Do not run it against a shared or production database.

The seeded accounts have `mustChangePassword` enabled and should be updated after first sign-in.

To inspect persisted users, attendance, and reports:

```bash
node verify-database.js
```

## User workflows

### Student attendance

1. Sign in at `/student-login`.
2. Open the attendance view from the student dashboard.
3. Clock in when the placement session starts.
4. Clock out from the open attendance record when it ends.
5. The server stores the timestamps and calculates the duration in minutes.

Only one open clock-in is allowed for a student at a time.

### Weekly reports

1. Sign in to the student portal.
2. Open the reports view.
3. Select a week, enter a title, and provide a summary.
4. Optionally attach a PDF, Word document, or text file.
5. Submit the report. A report for the same student and week is updated rather than duplicated.

Administrators can open submitted reports and mark them as reviewed.

### Account creation

Students can register through `/student/register`. Administrators can register through `/admin/register` when allowed by the optional `ADMIN_REGISTRATION_KEY` setting. An administrator can also create student and staff accounts from the administrator dashboard.

Passwords must contain at least 8 characters. Passwords are stored as bcrypt hashes. Legacy 32-character MD5 password hashes are migrated to bcrypt after a successful login.

## Routes

These are the primary application routes. Most dashboard views are rendered through query parameters such as `view=attendance` or `view=reports`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Redirects to student login |
| `GET` | `/student-login` | Public | Student login page |
| `POST` | `/student-login` | Public | Student login submission |
| `GET` | `/administrator-login` | Public | Administrator login page |
| `POST` | `/administrator-login` | Public | Administrator login submission |
| `GET` | `/student/dashboard` | Student | Student dashboard |
| `POST` | `/student/attendance/clock-in` | Student | Create attendance record |
| `POST` | `/student/attendance/clock-out/:id` | Student | Close attendance record |
| `POST` | `/student/reports` | Student | Create or update weekly report |
| `GET` | `/admin/dashboard` | Administrator | Administrator dashboard |
| `POST` | `/admin/reports/:id/review` | Administrator | Mark a report as reviewed |
| `POST` | `/admin/users/new` | Administrator | Create a student account |
| `POST` | `/admin/staff/new` | Administrator | Create a staff account |
| `GET/POST` | `/change-password` | Authenticated user | Change password |
| `GET/POST` | `/logout` | Authenticated user | End the session |
| `GET` | `/health` | Public | Service health check |

Form submissions require the hidden `_csrf` token generated by the application session.

## Data model

### `User`

Stores students and administrators in one collection. Role values are `1` for administrators and `2` for students. Student records require `regNo` and may include a level from `100 Level` through `500 Level`; administrator records may include `staffNo`.

Unique constraints cover the username/role combination, email, student registration number, and staff number where applicable.

### `Attendance`

Stores the student reference, clock-in time, optional clock-out time, calculated duration in minutes, and timestamps. An index supports finding open attendance records for a student.

### `Report`

Stores the student reference, Monday week start, title, summary, optional attachment metadata, status, and timestamps. Status values are `submitted` and `reviewed`.

### `sessions`

The `connect-mongo` session store persists login sessions in MongoDB. Sessions expire after eight hours through the configured cookie lifetime.

### Files

Uploaded report files are written to `uploads/reports/`. Keep this directory writable by the application process and include it in backups if uploaded evidence is part of the system record.

## Project structure

```text
.
├── server.js                 Single-server entry point
├── student-server.js         Student portal entry point
├── admin-server.js           Administrator portal entry point
├── start-all.js              Starts both portal processes
├── src/
│   ├── app.js                Shared single-app configuration
│   ├── app-factory.js        Portal-specific app factory
│   ├── middleware/           Authentication, roles, and CSRF checks
│   ├── models/               Mongoose schemas
│   ├── routes/               Authentication, user, and student workflows
│   └── views/                EJS templates
├── assets/                   CSS, JavaScript, fonts, and images
├── uploads/reports/          Stored report attachments
├── seed.js                   Development user seed script
├── verify-database.js        Database inspection utility
├── .env.example              Environment variable template
└── package.json              Scripts and dependencies
```

The root also contains an older PHP/MySQL implementation and its supporting files. See [Legacy PHP application](#legacy-php-application).

## Security

- Use a strong, unique `SESSION_SECRET` in every environment.
- Run behind HTTPS in production and set `NODE_ENV=production` so secure cookies are enabled.
- Keep MongoDB credentials and administrator registration keys out of source control.
- Do not use the seeded credentials outside local development.
- Back up both MongoDB and `uploads/reports/`.
- Review upload handling and access controls before exposing the service publicly.
- The application uses Helmet, HTTP-only cookies, SameSite cookies, role checks, and CSRF tokens for state-changing forms.

## Troubleshooting

### MongoDB connection failure

Confirm that MongoDB is running and that `MONGODB_URI` points to the correct deployment. The default local URI is:

```text
mongodb://127.0.0.1:27017/slms
```

### `SESSION_SECRET must be set`

Create `.env` from `.env.example` and set `SESSION_SECRET` before starting any server.

### Port already in use

Stop the process using port `3000` or `3001`, or run the relevant entry point with a different port configuration. Note that `student-server.js` and `admin-server.js` currently use fixed defaults of `3000` and `3001`; update those entry points if you need custom portal ports.

### PowerShell blocks a command

Use the included `.bat` launcher, run the command from Command Prompt, or invoke npm through PowerShell with an execution-policy bypass:

```powershell
powershell -ExecutionPolicy Bypass -Command "npm run dev"
```

### A user cannot sign in after seeding

Use the current Node credentials in the [Initial data](#initial-data) section. The credentials in the legacy PHP documentation belong to a different database and authentication implementation.

## Legacy PHP application

The repository includes an earlier PHP/MySQL application using `etms_db`, PDO, and files such as `index.php`, `task-info.php`, and `classes/admin_class.php`. Its setup and credentials are separate from the Node/MongoDB application documented above.

Use the PHP files only when maintaining that legacy application. Do not mix its MySQL database, MD5 credential records, or PHP session behavior with the Node application. The Node application is the recommended runtime for the current project.
