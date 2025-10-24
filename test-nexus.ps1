# NexusLLM System Test Script
# Tests all components and provides diagnostic information

Write-Host "`n🔍 NexusLLM System Test" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Test results
$results = @{}

# 1. Check Prerequisites
Write-Host "`n1. Checking Prerequisites..." -ForegroundColor Yellow

# Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    $results["Node.js"] = "✅ Installed ($nodeVersion)"
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    $results["Node.js"] = "❌ Not installed"
    Write-Host "   ❌ Node.js: Not installed" -ForegroundColor Red
}

# Python
$pythonVersion = python --version 2>$null
if ($pythonVersion) {
    $results["Python"] = "✅ Installed ($pythonVersion)"
    Write-Host "   ✅ Python: $pythonVersion" -ForegroundColor Green
} else {
    $results["Python"] = "❌ Not installed"
    Write-Host "   ❌ Python: Not installed" -ForegroundColor Red
}

# NVIDIA GPU
$gpuInfo = nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null
if ($gpuInfo) {
    $results["GPU"] = "✅ NVIDIA GPU(s) detected"
    Write-Host "   ✅ GPU: NVIDIA GPU(s) detected" -ForegroundColor Green
    $gpuInfo | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
} else {
    $results["GPU"] = "⚠️  No NVIDIA GPU detected (CPU mode)"
    Write-Host "   ⚠️  GPU: No NVIDIA GPU detected" -ForegroundColor Yellow
}

# 2. Check Files
Write-Host "`n2. Checking Required Files..." -ForegroundColor Yellow

# Models directory
if (Test-Path "./models/*.gguf") {
    $modelCount = (Get-ChildItem "./models/*.gguf").Count
    $results["Models"] = "✅ $modelCount GGUF model(s) found"
    Write-Host "   ✅ Models: $modelCount GGUF model(s) found" -ForegroundColor Green
} else {
    $results["Models"] = "❌ No GGUF models found"
    Write-Host "   ❌ Models: No GGUF models in ./models directory" -ForegroundColor Red
}

# Dependencies
if (Test-Path "node_modules") {
    $results["Dependencies"] = "✅ Node modules installed"
    Write-Host "   ✅ Dependencies: Node modules installed" -ForegroundColor Green
} else {
    $results["Dependencies"] = "⚠️  Node modules not installed"
    Write-Host "   ⚠️  Dependencies: Run 'npm install'" -ForegroundColor Yellow
}

# 3. Check Services
Write-Host "`n3. Checking Services..." -ForegroundColor Yellow

# Python server
try {
    $pythonHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($pythonHealth.status -eq "ok") {
        $results["Python Server"] = "✅ Running on port 8000"
        Write-Host "   ✅ Python Server: Running on port 8000" -ForegroundColor Green
    }
} catch {
    $results["Python Server"] = "❌ Not running"
    Write-Host "   ❌ Python Server: Not running" -ForegroundColor Red
}

# Node.js server
try {
    $nodeHealth = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($nodeHealth.status) {
        $results["Node.js Server"] = "✅ Running on port 8080"
        Write-Host "   ✅ Node.js Server: Running on port 8080" -ForegroundColor Green
    }
} catch {
    $results["Node.js Server"] = "❌ Not running"
    Write-Host "   ❌ Node.js Server: Not running" -ForegroundColor Red
}

# Frontend
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($frontend.StatusCode -eq 200) {
        $results["Frontend"] = "✅ Running on port 3000"
        Write-Host "   ✅ Frontend: Running on port 3000" -ForegroundColor Green
    }
} catch {
    $results["Frontend"] = "❌ Not running"
    Write-Host "   ❌ Frontend: Not running" -ForegroundColor Red
}

# 4. Test API Endpoints
Write-Host "`n4. Testing API Endpoints..." -ForegroundColor Yellow

if ($results["Python Server"] -like "*✅*" -and $results["Node.js Server"] -like "*✅*") {
    # Test model listing
    try {
        $models = Invoke-RestMethod -Uri "http://localhost:8080/api/models" -ErrorAction SilentlyContinue
        $results["Model API"] = "✅ Working ($($models.Count) models)"
        Write-Host "   ✅ Model API: Working ($($models.Count) models available)" -ForegroundColor Green
    } catch {
        $results["Model API"] = "❌ Failed"
        Write-Host "   ❌ Model API: Failed" -ForegroundColor Red
    }

    # Test OpenAI compatibility
    try {
        $testChat = @{
            messages = @(@{role = "user"; content = "test"})
            model = "test"
            max_tokens = 1
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "http://localhost:8080/v1/chat/completions" `
                                     -Method POST `
                                     -ContentType "application/json" `
                                     -Body $testChat `
                                     -ErrorAction SilentlyContinue
        
        if ($response.error) {
            $results["OpenAI API"] = "✅ Endpoint working (no model loaded)"
            Write-Host "   ✅ OpenAI API: Endpoint working" -ForegroundColor Green
        } else {
            $results["OpenAI API"] = "✅ Working with loaded model"
            Write-Host "   ✅ OpenAI API: Working with loaded model" -ForegroundColor Green
        }
    } catch {
        if ($_.Exception.Message -like "*No models currently loaded*") {
            $results["OpenAI API"] = "✅ Endpoint working (no model loaded)"
            Write-Host "   ✅ OpenAI API: Endpoint working (no model loaded)" -ForegroundColor Green
        } else {
            $results["OpenAI API"] = "❌ Failed"
            Write-Host "   ❌ OpenAI API: Failed" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⚠️  Skipping API tests (servers not running)" -ForegroundColor Yellow
}

# 5. Port Availability
Write-Host "`n5. Checking Port Availability..." -ForegroundColor Yellow

@(3000, 8000, 8080) | ForEach-Object {
    $port = $_
    $inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($inUse) {
        $process = Get-Process -Id $inUse[0].OwningProcess -ErrorAction SilentlyContinue
        Write-Host "   ⚠️  Port ${port}: In use by $($process.ProcessName)" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Port ${port}: Available" -ForegroundColor Green
    }
}

# Summary
Write-Host "`n📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

$passed = ($results.Values | Where-Object { $_ -like "*✅*" }).Count
$failed = ($results.Values | Where-Object { $_ -like "*❌*" }).Count
$warnings = ($results.Values | Where-Object { $_ -like "*⚠️*" }).Count

Write-Host "`n   Passed:   $passed" -ForegroundColor Green
Write-Host "   Failed:   $failed" -ForegroundColor Red
Write-Host "   Warnings: $warnings" -ForegroundColor Yellow

# Recommendations
Write-Host "`n💡 Recommendations" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

if ($failed -gt 0 -or $warnings -gt 0) {
    if ($results["Node.js"] -like "*❌*") {
        Write-Host "`n• Install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    }
    if ($results["Python"] -like "*❌*") {
        Write-Host "`n• Install Python 3.9+ from https://python.org/" -ForegroundColor Yellow
    }
    if ($results["Models"] -like "*❌*") {
        Write-Host "`n• Download GGUF models and place in ./models directory" -ForegroundColor Yellow
        Write-Host "  Example: https://huggingface.co/TheBloke" -ForegroundColor Gray
    }
    if ($results["Dependencies"] -like "*⚠️*") {
        Write-Host "`n• Run 'npm install' to install dependencies" -ForegroundColor Yellow
    }
    if ($results["Python Server"] -like "*❌*" -or $results["Node.js Server"] -like "*❌*") {
        Write-Host "`n• Run './start-nexus.bat' to start all services" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n✨ Everything looks good! Your NexusLLM system is ready to use." -ForegroundColor Green
    Write-Host "`n• Double-click 'start-nexus.bat' to start" -ForegroundColor Gray
    Write-Host "• Configure your IDE with base URL: http://localhost:8080" -ForegroundColor Gray
}

Write-Host "`n"
