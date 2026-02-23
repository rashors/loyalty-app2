@echo off

echo Starting MongoDB Service...
net start MongoDB

timeout /t 2

echo Starting Backend (LAN enabled)...
start cmd /k "cd /d C:\Users\John\Documents\App\backend && venv\Scripts\activate && uvicorn server:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2

echo Starting Frontend...
start cmd /k "cd /d C:\Users\John\Documents\App\frontend && npx expo start -c"

echo Development environment started!
exit