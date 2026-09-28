@echo off
title Student Portal - SLMS
cd /d "%~dp0"
echo Starting Student Portal on http://localhost:3000
node --watch student-server.js
pause
