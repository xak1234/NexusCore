@echo off
REM NexusLLM Quick Start Batch File
REM This runs the PowerShell script with proper execution policy

echo Starting NexusLLM...
powershell -ExecutionPolicy Bypass -File "%~dp0start-nexus.ps1"
pause

