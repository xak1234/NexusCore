@echo off
REM NexusLLM Quick Start with Virtual Environment

echo Starting NexusLLM with Python virtual environment...

REM Start everything in one command
call venv\Scripts\activate.bat && start /B python -m python_server.main && timeout /t 3 /nobreak > nul && npm run dev:all

pause