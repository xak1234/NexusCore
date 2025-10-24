# Error Display & Console Debugging Guide

## Overview

When integrity checks fail on application startup, the system now displays a comprehensive error modal with detailed information and copy-to-clipboard functionality for all console logs.

## Features

### 1. **Error Modal**

When the application initializes and integrity checks fail, a modal dialog appears with:

#### ✅ Error Summary Section
- Lists all errors from failed integrity checks
- **Copy Button**: Click to copy all errors as plain text
- Color-coded in red for immediate visibility

#### ⚠️ Warnings Section (if any)
- Displays non-critical warnings
- **Copy Button**: Copy all warnings
- Color-coded in yellow

#### Failed Checks Details
- **Expandable Sections**: Click each failed check to see details
- **Message**: Description of what failed
- **Details**: JSON-formatted diagnostic information
- **Copy Button**: Copy individual check details for troubleshooting

#### 📋 Full Report (JSON)
- Complete integrity check report in JSON format
- Shows all checks (passed and failed)
- Timestamps and duration metrics
- **Copy Button**: Copy entire report for sharing with support

#### 🖥️ Browser Console Guide
- Instructions on how to access browser developer console
- Keyboard shortcut: **F12**
- Where to find `[Integrity Check]` logs

### 2. **Copy to Clipboard Feature**

- **One-click copying** of error messages, warnings, and reports
- **Visual feedback**: Button shows "Copied!" for 2 seconds after clicking
- Works on all major browsers (Chrome, Firefox, Safari, Edge)
- No external dependencies required

### 3. **Action Buttons**

- **Dismiss**: Close the error modal and continue with degraded functionality
- **Retry**: Reload the page and run integrity checks again

## Integrity Checks

The system validates 6 critical areas:

### 1. **API Connectivity**
- Checks if backend server is reachable
- Validates response format
- **Failure Reason**: Backend server not running

### 2. **Model Discovery**
- Scans for GGUF models in configured directory
- **Failure Reason**: No models found or model directory missing

### 3. **GPU Detection**
- Detects available GPUs (CUDA, ROCm, Metal)
- **Failure Reason**: GPU drivers not installed (Warning only - CPU-only is valid)

### 4. **Cache System**
- Tests localStorage read/write capabilities
- **Failure Reason**: Browser storage disabled or unavailable

### 5. **GGUF Support**
- Validates model quantization formats
- Supports: Q4_K_M, Q4_K_S, Q5_K_M, Q8_0, F16, F32
- **Failure Reason**: No compatible GGUF models

### 6. **Server Health**
- Monitors error count and latency
- **Warning Threshold**: >10 errors or >5000ms latency

## How to Debug Errors

### Step 1: View the Error Modal
When application loads, look for the red error modal displaying what failed.

### Step 2: Read Error Messages
Each error explains what check failed and why.

### Step 3: Copy Detailed Information
Use the **Copy** buttons to capture error details:

```
✓ Summary: Click to copy error list
✓ Full Report: Copy complete JSON report
✓ Individual Checks: Copy specific failed check
```

### Step 4: Open Browser Console
1. Press **F12** or right-click → **Inspect**
2. Click **Console** tab
3. Look for messages starting with **`[Integrity Check]`**

### Step 5: Share Information
Copy error details and share with developers:
- **Full Report (JSON)**: Most comprehensive
- **Error Summary**: Quick overview
- **Console logs**: For deep debugging

## Console Log Format

The integrity check outputs structured logs:

```
[Integrity Check] Starting application integrity validation...
[Integrity Check] Completed in 1.23s
[Integrity Check] Status: ✗ FAILED
[Integrity Check] Checks: 4/6 passed
[Integrity Check] Errors: [list of errors]
[Integrity Check] Warnings: [list of warnings]
[Integrity Check] Detailed Results
  ✓ apiConnectivity (245.3ms): API server is reachable
  ✗ modelDiscovery (128.4ms): No GGUF models found in model directory
  ✓ gpuDetection (89.2ms): Found 2 GPU(s)
  ✓ cacheSystem (12.5ms): localStorage operational
  ✗ ggufSupport (156.7ms): GGUF support check failed: No models available
  ✓ serverHealth (423.1ms): Server is healthy
```

## Common Errors & Solutions

### "No GGUF models found"
**Problem**: Model directory is empty or misconfigured

**Solution**:
1. Check `MODEL_PATH` environment variable
2. Ensure `.gguf` files exist in the model directory
3. Verify file permissions are readable

**Example Fix**:
```bash
# Check model directory
ls -la ./models/*.gguf

# Or set custom path in .env
MODEL_PATH=/path/to/models
```

### "API connectivity failed"
**Problem**: Backend server not running or unreachable

**Solution**:
1. Start Python backend: `python -m python_server.main`
2. Check `PYTHON_SERVER_URL` environment variable (default: http://localhost:8000)
3. Verify backend is listening on correct port

**Example Fix**:
```bash
# Start Python server
python -m python_server.main

# Or set custom server URL
PYTHON_SERVER_URL=http://backend.server:8000
```

### "Cache system check failed"
**Problem**: localStorage not available (privacy mode, cookies disabled)

**Solution**:
1. Disable browser privacy/incognito mode
2. Check browser storage settings
3. Ensure cookies are enabled

### "GPU detection failed"
**Problem**: NVIDIA drivers or CUDA not installed

**Solution**:
1. Install NVIDIA GPU drivers
2. Install CUDA toolkit
3. Run `nvidia-smi` to verify installation

## Error Modal UI

```
┌─────────────────────────────────────────────────────┐
│ ❌ Integrity Check Failed                           │ ✕
│    4/6 checks passed                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Error Summary                            [Copy]     │
│ • No GGUF models found                               │
│ • GGUF support check failed                         │
│                                                      │
│ Warnings                                 [Copy]     │
│ ⚠ GPU detection: CPU-only setup                     │
│                                                      │
│ Failed Checks                                       │
│ ▼ modelDiscovery (128.4ms)              [Copy]     │
│   Message: No GGUF models found...                  │
│   {                                                  │
│     "modelCount": 0,                                │
│     ...                                             │
│   }                                                 │
│                                                      │
│ Full Report (JSON)                       [Copy]     │
│ {                                                    │
│   "timestamp": "2024-10-22...",                     │
│   "success": false,                                 │
│   ...                                               │
│ }                                                    │
│                                                      │
│ Browser Console                                     │
│ Press F12 or right-click → Inspect                 │
│ Click Console tab                                   │
│ Look for [Integrity Check] messages                │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                         [Dismiss] [Retry]
└─────────────────────────────────────────────────────┘
```

## Integration with Error Banner

When the modal is dismissed, an error banner appears at the top of the main app:

```
⚠️ Integrity check failed: [error list]
   View Details →
```

Click "View Details" to reopen the error modal.

## JSON Report Format

```json
{
  "timestamp": "2024-10-22T10:30:45.123Z",
  "success": false,
  "summary": {
    "passedChecks": 4,
    "totalChecks": 6,
    "warnings": ["GPU detection: CPU-only setup"],
    "errors": [
      "No GGUF models found in model directory",
      "GGUF support check failed: No models available"
    ]
  },
  "checks": [
    {
      "name": "apiConnectivity",
      "passed": true,
      "duration": "245.30ms",
      "message": "API server is reachable and responding"
    },
    {
      "name": "modelDiscovery",
      "passed": false,
      "duration": "128.40ms",
      "message": "No GGUF models found in model directory",
      "details": {
        "modelCount": 0,
        "modelPath": "./models"
      }
    }
  ]
}
```

## Accessing Detailed Logs

### Browser Console Methods

**In Chrome/Firefox/Edge:**
1. Open DevTools: `F12` or `Ctrl+Shift+I`
2. Go to **Console** tab
3. Filter by `[Integrity Check]` in search box
4. Right-click on logs → **Copy** → **Copy Message**

**View Full Details:**
```javascript
// In console, type:
console.table(window.__integrityCheckResult)

// Or access the result object:
console.log(window.__integrityCheckResult)
```

### Export Console Logs

**Method 1: Copy Full Report**
- Use the [Copy] button in "Full Report (JSON)" section

**Method 2: Manual Export**
```javascript
// In browser console:
copy(JSON.stringify(window.__integrityCheckResult, null, 2))
// Then paste in text editor
```

## Support & Troubleshooting

If you encounter integrity check failures:

1. **Copy the Full Report** using the modal's [Copy] button
2. **Open Browser Console** and look for `[Integrity Check]` logs
3. **Share** the report and console logs with support

For detailed troubleshooting, refer to:
- `MODEL_BINARY_LOADING_TROUBLESHOOTING.md` - Model loading issues
- `PYTHON_SERVER_README.md` - Backend server setup
- `PYTHON_QUICKSTART.md` - Quick start guide

## Next Steps

After fixing integrity check failures:

1. **Dismiss** the error modal or **Retry** to reload
2. **Monitor** the console for any new errors
3. **Verify** all checks pass (6/6)
4. **Start using** the application normally
