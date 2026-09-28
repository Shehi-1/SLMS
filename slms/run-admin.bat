@echo off
title Admin Portal - SLMS
cd /d "%~dp0"
echo Starting Admin Portal on http://localhost:3001
node --watch admin-server.js
pause
