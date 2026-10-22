@echo off
cd /d "%~dp0.."
start /b cmd /c "cd backend && npm run dev"
start /b cmd /c "cd frontend && npm run dev"
