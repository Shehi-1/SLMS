@echo off
title SLMS - Student & Admin Portals
cd /d "%~dp0"
echo Starting both Student and Admin portals together...
echo.
node start-all.js
pause
