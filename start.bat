@echo off
cd /d "%~dp0"
python --version >nul 2>&1
if errorlevel 1 (echo Python not found. Install it from python.org & pause & exit /b 1)
if not exist .venv python -m venv .venv
call .venv\Scripts\activate
pip install -q -r requirements.txt
python -c "from backend.database import init_db; init_db()"
start /b cmd /c "timeout /t 3 >nul & start http://127.0.0.1:8000"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause
