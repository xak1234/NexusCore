# NexusLLM Startup Script for Windows
# This script starts all required services for the NexusLLM application

Write-Host "🚀 Starting NexusLLM Services..." -ForegroundColor Cyan

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if Python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python is not installed. Please install Python 3.9+ first." -ForegroundColor Red
    exit 1
}

# Set working directory to script location
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
}

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Creating .env.local configuration file..." -ForegroundColor Yellow
    @"
# NexusCore LLM Server - Environment Configuration

# Python Server Configuration (for GGUF model inference)
HOST=0.0.0.0
PORT=8000
DEBUG=False

# Model Configuration
MODEL_PATH=./models
DEFAULT_MODEL=LFM2-1.2B-Q8_0.gguf
AUTO_LOAD_MODEL=true

# GPU/CPU Configuration
N_GPU_LAYERS=35
N_THREADS=8
CONTEXT_LENGTH=4096
BATCH_SIZE=512

# Cache Configuration
ENABLE_CACHE=True
CACHE_DIR=./cache
MAX_CACHED_MODELS=2

# Node.js Server Configuration
VITE_API_URL=http://localhost:8080/api
PYTHON_SERVER_URL=http://localhost:8000

# Optional: Gemini API for Log Analysis
VITE_GEMINI_API_KEY=

# llama.cpp Server Path (if using llama-server instead of Python)
LLAMA_SERVER_PATH=llama-server
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local" -ForegroundColor Green
}

# Kill any existing processes on our ports
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
$ports = @(8000, 8080, 3000)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | 
                Select-Object -ExpandProperty OwningProcess | 
                Select-Object -Unique
    if ($process) {
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Write-Host "   Stopped process on port $port" -ForegroundColor Gray
    }
}

Start-Sleep -Seconds 1

# Start Python server
Write-Host "`n🐍 Starting Python GGUF Inference Server (Port 8000)..." -ForegroundColor Yellow
$env:PORT = "8000"
$env:HOST = "0.0.0.0"
$pythonJob = Start-Job -ScriptBlock {
    Set-Location $using:scriptPath
    python -m python_server.main 2>&1
}

# Wait for Python server to be ready
Write-Host "   Waiting for Python server to start..." -ForegroundColor Gray
$pythonReady = $false
$attempts = 0
while (-not $pythonReady -and $attempts -lt 30) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $pythonReady = $true
            Write-Host "   ✅ Python server is ready!" -ForegroundColor Green
        }
    } catch {
        $attempts++
        if ($attempts % 5 -eq 0) {
            Write-Host "   Still waiting... ($attempts seconds)" -ForegroundColor Gray
        }
    }
}

if (-not $pythonReady) {
    Write-Host "❌ Python server failed to start. Check the logs." -ForegroundColor Red
    Receive-Job $pythonJob
    exit 1
}

# Start Node.js server and frontend
Write-Host "`n🚀 Starting Node.js Backend and Frontend..." -ForegroundColor Yellow
$nodeJob = Start-Job -ScriptBlock {
    Set-Location $using:scriptPath
    npm run dev:all 2>&1
}

# Wait for services to be ready
Write-Host "   Waiting for all services to start..." -ForegroundColor Gray
$nodeReady = $false
$attempts = 0
while (-not $nodeReady -and $attempts -lt 30) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $nodeReady = $true
            Write-Host "   ✅ Node.js server is ready!" -ForegroundColor Green
        }
    } catch {
        $attempts++
        if ($attempts % 5 -eq 0) {
            Write-Host "   Still waiting... ($attempts seconds)" -ForegroundColor Gray
        }
    }
}

if (-not $nodeReady) {
    Write-Host "❌ Node.js server failed to start. Check the logs." -ForegroundColor Red
    Receive-Job $nodeJob
    exit 1
}

# Auto-load default model if configured
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "AUTO_LOAD_MODEL=true") {
    Write-Host "`n🤖 Auto-loading default model..." -ForegroundColor Yellow
    
    # Get default model from config
    $defaultModel = "LFM2-1.2B-Q8_0"
    if ($envContent -match "DEFAULT_MODEL=(.+)\.gguf") {
        $defaultModel = $Matches[1]
    }
    
    try {
        $body = @{
            gpuIds = @(0, 1)
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/models/$defaultModel/load" `
                                     -Method POST `
                                     -ContentType "application/json" `
                                     -Body $body
        
        if ($response.status -eq "loaded") {
            Write-Host "   ✅ Model loaded: $defaultModel" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  Failed to auto-load model: $_" -ForegroundColor Yellow
    }
}

# Display status
Write-Host "`n✨ NexusLLM is running!" -ForegroundColor Green
Write-Host "`n📍 Service URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:8080" -ForegroundColor White
Write-Host "   Python API:  http://localhost:8000" -ForegroundColor White
Write-Host "`n🔌 VSCode/Cursor Integration:" -ForegroundColor Cyan
Write-Host "   OpenAI Base URL: http://localhost:8080" -ForegroundColor White
Write-Host "`n📊 Monitoring:" -ForegroundColor Cyan
Write-Host "   Use Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host "   Logs are being captured in the background" -ForegroundColor Gray

# Open browser
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

# Monitor services
Write-Host "`n🔍 Monitoring services (Press Ctrl+C to stop)..." -ForegroundColor Gray
try {
    while ($true) {
        # Check if services are still running
        if ($pythonJob.State -ne "Running") {
            Write-Host "`n❌ Python server stopped unexpectedly!" -ForegroundColor Red
            Receive-Job $pythonJob
            break
        }
        if ($nodeJob.State -ne "Running") {
            Write-Host "`n❌ Node.js server stopped unexpectedly!" -ForegroundColor Red
            Receive-Job $nodeJob
            break
        }
        Start-Sleep -Seconds 5
    }
} finally {
    # Cleanup on exit
    Write-Host "`n🛑 Shutting down services..." -ForegroundColor Yellow
    Stop-Job $pythonJob -ErrorAction SilentlyContinue
    Stop-Job $nodeJob -ErrorAction SilentlyContinue
    Remove-Job $pythonJob -ErrorAction SilentlyContinue
    Remove-Job $nodeJob -ErrorAction SilentlyContinue
    
    # Kill processes on ports
    foreach ($port in $ports) {
        $process = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess | 
                    Select-Object -Unique
        if ($process) {
            Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host "✅ All services stopped." -ForegroundColor Green
}

