@echo off
echo Starting MongoDB...
start cmd /k "cd /d C:\Programme\MongoDB\Server\8.2\bin && mongod --dbpath C:\data\db"

timeout /t 3

echo Starting Backend...
start cmd /k "cd /d C:\Users\John\Documents\App\backend && venv\Scripts\activate && uvicorn server:app --reload"

timeout /t 3

echo Starting Frontend...
start cmd /k "cd /d C:\Users\John\Documents\App\frontend && npx expo start"

echo All services started!
pause