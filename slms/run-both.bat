@echo off
cd /d "%~dp0"

echo Starting SLMS - Student and Admin Portals...
echo.

start "Student Portal" cmd /k run-student.bat
timeout /t 2 /nobreak

start "Admin Portal" cmd /k run-admin.bat

echo.
echo ============================================
echo Both portals are starting...
echo.
echo 📚 Student Portal: http://localhost:3000/student-login
echo.
echo 👤 Admin Portal:   http://localhost:3001/administrator-login
echo ============================================
