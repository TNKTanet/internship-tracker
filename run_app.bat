@echo off
chcp 65001 >nul
title InternList — SPU CWIE Internship Tracker (Real-Time Sheet Sync)
echo Starting InternList Real-Time Server on http://localhost:3000 ...
start "" "http://localhost:3000"
python "%~dp0server.py"
pause
