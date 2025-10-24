# 🧪 NexusCore Testing Guide

Complete guide to test all features of your production LLM server.

---

## 📋 Pre-Flight Checklist

Test these **BEFORE** starting the server:

### 1. Test GPU Access

```bash
# Check NVIDIA drivers installed
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.xx.xx    Driver Version: 535.xx.xx    CUDA Version: 12.x   |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# ...

# If this fails, install NVIDIA drivers first!
```

### 2. Test llama.cpp Installation

```bash
# Check if llama-server is available
which llama-server
# Or: where llama-server  (Windows)

# Test it runs
llama-server --help

# Expected: Shows help text with all options

# If fails: Install/build llama.cpp with CUDA support
```

### 3. Check Model Files

```bash
# List models directory
ls -lh models/

# Expected: Shows .gguf files
# mistral-7b-instruct-v0.2.Q4_K_M.gguf  4.4G

# If empty: Download a model first
```

### 4. Verify Environment Configuration

```bash
# Check .env.local exists
cat .env.local

# Must contain at minimum:
# LLAMA_SERVER_PATH=llama-server
# MODEL_PATH=./models
# PORT=8080
# VITE_API_URL=http://localhost:8080/api
```

---

## 🚀 Test 1: Server Startup

### Start the Server

```bash
npm run dev:all
```

### Expected Output:

```
┌─────────────────────────────────────────────────────────────┐
│  🚀  NexusCore LLM Server - Production Mode               │
└─────────────────────────────────────────────────────────────┘

📡 Management API:    http://localhost:8080
🤖 OpenAI-Compatible: http://localhost:8080/v1/chat/completions

📊 Detected GPUs: 2
   • GPU 0: NVIDIA RTX 4090 (24.0GB)
   • GPU 1: NVIDIA RTX 3080 (10.0GB)

📁 Model Directory: ./models
📚 Available Models: 1
   • Mistral 7B Instruct V0.2 (4.4 GB)

🔧 IDE Integration:
   Cursor:  Set OpenAI endpoint to http://localhost:8080
   VSCode:  Configure OpenAI base URL to http://localhost:8080
   Warp:    Use http://localhost:8080 as API endpoint

✅ Server ready! Load a model to start serving requests.
```

### ✅ Pass Criteria:
- Both frontend (port 3000) and backend (port 8080) start
- GPUs are detected (not mock data)
- Models are listed
- No error messages

### ❌ Common Failures:

**"nvidia-smi failed"**
```
❌ CRITICAL: nvidia-smi failed
   This application requires NVIDIA GPUs with drivers installed.
```
**Fix:** Install NVIDIA drivers

**"Model directory not found"**
```
❌ CRITICAL: Model directory not found: ./models
```
**Fix:** `mkdir models` and add .gguf files

---

## 🧪 Test 2: Web Interface

Open browser to `http://localhost:3000`

### Test Dashboard (Default View)

**Expected:**
- [ ] GPU cards showing real GPU names (not "NVIDIA RTX 4090" mock data)
- [ ] GPU utilization showing 0% (no models loaded yet)
- [ ] Charts with baseline data
- [ ] "Server Endpoint" showing 127.0.0.1:8080
- [ ] Tokens/sec showing 0 (no inference yet)

**Screenshot:** Dashboard should look professional, no errors

### Test Models Tab

**Expected:**
- [ ] List of .gguf files from your `models/` directory
- [ ] Each model shows: name, size, quantization, status
- [ ] Status is "Unloaded" initially
- [ ] "Load" button is enabled

### Test Settings Tab

**Expected:**
- [ ] System prompt editor is visible
- [ ] Gemini prompt generator is available
- [ ] Model path configuration is shown

### Test Logs Tab

**Expected:**
- [ ] Empty or shows only initial connection logs
- [ ] No fake/simulated log entries
- [ ] Ready to receive real requests

---

## 🎯 Test 3: Model Loading (Critical!)

This tests the REAL llama.cpp integration.

### Step-by-Step:

1. **Go to Models tab**
2. **Click "Load" on a model** (start with smallest model)
3. **GPU Selection popup appears**
4. **Check GPU 0** (or your primary GPU)
5. **Click "Load on 1 GPU(s)"**

### Expected Backend Logs:

```bash
🚀 Loading model mistral-7b-instruct-v0.2.Q4_K_M on GPUs: 0
🚀 Starting llama.cpp server on port 8081
   Model: ./models/mistral-7b-instruct-v0.2.Q4_K_M.gguf
   GPUs: 0
   Context: 4096, Threads: 8, GPU Layers: 99

[llama-server:8081] llama_model_loader: loaded meta data...
[llama-server:8081] llama_model_loader: loading model...
[llama-server:8081] ...
[llama-server:8081] HTTP server listening at http://0.0.0.0:8081

✅ llama.cpp server ready on port 8081
✅ Model mistral-7b-instruct-v0.2.Q4_K_M loaded successfully on port 8081
```

### Expected Frontend:

- [ ] Model status changes from "Unloaded" → "Loading" → "Loaded"
- [ ] Shows "Loaded on GPU 0"
- [ ] GPU card in Dashboard now shows model name
- [ ] GPU utilization may spike during loading

### ✅ Pass Criteria:
- Model status shows "Loaded"
- Backend shows llama-server process started
- No error messages
- Loading completes within 30 seconds

### ❌ Common Failures:

**"llama-server not found"**
```
❌ llama-server not found in PATH
```
**Fix:** Set `LLAMA_SERVER_PATH` in .env.local to full path

**"Model path not available"**
```
❌ Model path not available
```
**Fix:** Ensure .gguf file exists in models/ directory

**"Failed to start within 30 seconds"**
```
❌ Failed to start llama.cpp server within 30 seconds
```
**Fix:** Model too large for GPU memory, try smaller model

---

## 🔌 Test 4: OpenAI-Compatible API

Test the main endpoint that IDEs will use.

### Test Chat Completions (Primary Endpoint)

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Say hello in one sentence"}
    ],
    "temperature": 0.7,
    "max_tokens": 50
  }'
```

### Expected Response:

```json
{
  "id": "chatcmpl-1705843200000",
  "object": "chat.completion",
  "created": 1705843200,
  "model": "mistral-7b-instruct-v0.2.Q4_K_M",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I assist you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 12,
    "total_tokens": 12
  }
}
```

### ✅ Pass Criteria:
- HTTP 200 response
- Valid JSON response
- `content` field contains REAL text from model (not error message)
- Response time < 10 seconds

### Check Dashboard:
- [ ] Go to Logs tab
- [ ] New log entry appears
- [ ] Shows your prompt and response
- [ ] Status: "Success"
- [ ] Tokens/sec value is reasonable (20-200 t/s)

### Test List Models Endpoint

```bash
curl http://localhost:8080/v1/models
```

**Expected:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "mistral-7b-instruct-v0.2.Q4_K_M",
      "object": "model",
      "created": 1705843200,
      "owned_by": "nexuscore"
    }
  ]
}
```

### Test Legacy Completions Endpoint

```bash
curl -X POST http://localhost:8080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Once upon a time",
    "max_tokens": 50
  }'
```

---

## 🧠 Test 5: Load Balancing

This tests intelligent request distribution.

### Prerequisites:
- Load 2 different models on different GPUs

### Test Setup:

```bash
# Model 1: Load on GPU 0
# Model 2: Load on GPU 1
# (Use web interface Models tab)
```

### Send Multiple Requests:

```bash
# Send 10 requests rapidly
for i in {1..10}; do
  curl -X POST http://localhost:8080/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Request $i\"}],\"max_tokens\":20}" &
done
wait
```

### Check Load Distribution:

1. **Go to Dashboard**
2. **Observe GPU utilization**
   - Both GPUs should show activity
   - Load distributed roughly evenly

3. **Check Logs tab**
   - Requests show different `modelId` values
   - Some on GPU 0, some on GPU 1

### ✅ Pass Criteria:
- Requests distributed across both models
- No single model handles all requests
- Backend logs show alternating model selection

---

## 📊 Test 6: Real-Time Metrics

Test that dashboard shows REAL data, not simulated.

### Before Model Loaded:

```bash
curl http://localhost:8080/api/stats
```

**Expected:**
```json
{
  "tokensPerSecond": 0,
  "requestsPerMinute": 0,
  "activeConnections": 0,
  "totalRequests": 0,
  "modelsLoaded": 0
}
```

### After Sending Requests:

```bash
# Send a few requests
for i in {1..5}; do
  curl -X POST http://localhost:8080/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Test"}],"max_tokens":30}'
  sleep 2
done

# Check stats again
curl http://localhost:8080/api/stats
```

**Expected:**
```json
{
  "tokensPerSecond": 85.3,    // REAL value from inference
  "requestsPerMinute": 5,      // Actual count from last minute
  "activeConnections": 0,      // No in-flight requests
  "totalRequests": 5,          // Cumulative count
  "modelsLoaded": 1
}
```

### ✅ Pass Criteria:
- `tokensPerSecond` is reasonable (20-200 for most models)
- `requestsPerMinute` matches actual requests sent
- `totalRequests` increments with each request
- `modelsLoaded` reflects actually loaded models

### ❌ NOT Expected:
- Random values changing independently of requests
- Values like `Math.random() * 200` patterns
- Activity when no requests are being sent

---

## 🎨 Test 7: IDE Integration

Test with a real IDE to confirm end-to-end workflow.

### Test with Cursor:

1. **Configure Cursor:**
   - Open Settings (`Cmd/Ctrl + ,`)
   - Search "OpenAI"
   - Set Base URL: `http://localhost:8080`
   - Save

2. **Test AI Completion:**
   - Open any code file
   - Press `Cmd/Ctrl + K`
   - Type: "Write a hello world function"
   - Press Enter

3. **Expected:**
   - Cursor sends request to your server
   - Response appears in Cursor
   - Check NexusCore Dashboard Logs tab
   - New log entry with source: "Cursor"

### Test with VSCode + Continue:

1. **Install Continue extension**

2. **Configure (~/.continue/config.json):**
```json
{
  "models": [{
    "title": "NexusCore",
    "provider": "openai",
    "model": "local",
    "apiBase": "http://localhost:8080/v1",
    "apiKey": "not-needed"
  }]
}
```

3. **Test:**
   - Open Continue sidebar
   - Send a message
   - Should get response from your local model

### ✅ Pass Criteria:
- IDE successfully connects
- Receives real responses from model
- Logs appear in NexusCore dashboard
- No errors in browser console or terminal

---

## 🔥 Test 8: Stress Test

Test server stability under load.

### Rapid Sequential Requests:

```bash
# Send 50 requests
for i in {1..50}; do
  echo "Request $i"
  curl -X POST http://localhost:8080/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Count to 5"}],"max_tokens":30}'
  echo ""
done
```

### Expected:
- All requests complete successfully
- No crashes or hangs
- Dashboard remains responsive
- GPU utilization stays stable

### Concurrent Requests:

```bash
# Send 20 concurrent requests
for i in {1..20}; do
  curl -X POST http://localhost:8080/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Request $i\"}],\"max_tokens\":20}" &
done
wait
```

### Expected:
- Most/all requests succeed
- Server queues requests properly
- No OOM errors
- Response times may increase but stay reasonable

---

## 🛑 Test 9: Model Unloading

Test clean shutdown of llama-server processes.

### Steps:

1. **Go to Models tab**
2. **Click "Unload" on loaded model**
3. **Watch backend logs**

### Expected Backend Logs:

```bash
🛑 Unloading model mistral-7b-instruct-v0.2.Q4_K_M...
✅ llama-server on port 8081 stopped
✅ Model mistral-7b-instruct-v0.2.Q4_K_M unloaded successfully
```

### Expected Frontend:
- Model status changes to "Unloaded"
- GPU card shows "Idle"
- GPU utilization drops to 0%

### Test API After Unload:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Test"}]}'
```

**Expected:**
```json
{
  "error": "No models currently loaded. Please load a model first."
}
```
HTTP 503 status code

---

## 🔄 Test 10: Server Restart & Graceful Shutdown

### Test Graceful Shutdown:

1. **Load a model**
2. **Press Ctrl+C in server terminal**

### Expected:

```bash
^C
🛑 Received SIGTERM, shutting down gracefully...
   Stopping mistral-7b-instruct-v0.2.Q4_K_M...
✅ llama-server on port 8081 stopped
✅ Server closed
```

### ✅ Pass Criteria:
- Model processes are killed
- No zombie processes left
- Clean exit with code 0

### Check No Orphan Processes:

```bash
# Linux/Mac
ps aux | grep llama-server

# Should show no running llama-server processes

# Windows
tasklist | findstr llama-server
```

---

## 📈 Test 11: Performance Benchmarks

Get baseline performance metrics.

### Single Request Latency:

```bash
time curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Count to 10"}],"max_tokens":50}'
```

**Target:**
- First token: < 1 second
- Total time: < 5 seconds for 50 tokens
- Tokens/sec: > 20 t/s

### Throughput Test:

```bash
# Time 20 sequential requests
time for i in {1..20}; do
  curl -s -X POST http://localhost:8080/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Hi"}],"max_tokens":20}' > /dev/null
done
```

**Target:**
- Total time: < 60 seconds
- Average: < 3 seconds per request

---

## ✅ Full Test Checklist

Use this checklist to verify everything works:

### Infrastructure:
- [ ] nvidia-smi shows GPUs
- [ ] llama-server --help works
- [ ] .gguf model files in models/
- [ ] .env.local configured

### Server Startup:
- [ ] Backend starts on port 8080
- [ ] Frontend starts on port 3000
- [ ] GPUs detected (not mock data)
- [ ] Models listed
- [ ] No errors in console

### Model Loading:
- [ ] Model status: Unloaded → Loading → Loaded
- [ ] llama-server process spawns
- [ ] GPU shows model name
- [ ] Backend logs show success

### API Endpoints:
- [ ] /v1/chat/completions returns real response
- [ ] /v1/models lists models
- [ ] /v1/completions works
- [ ] /api/health returns ok
- [ ] /api/stats shows real metrics

### Dashboard:
- [ ] GPU cards show real data
- [ ] Logs show actual requests
- [ ] Metrics update in real-time
- [ ] No simulated activity when idle

### Load Balancing:
- [ ] Multiple models can be loaded
- [ ] Requests distributed across models
- [ ] Least-loaded model selected

### IDE Integration:
- [ ] Cursor connects successfully
- [ ] VSCode/Continue works
- [ ] Responses appear in IDE
- [ ] Logs show in dashboard

### Cleanup:
- [ ] Model unload works
- [ ] Processes killed cleanly
- [ ] Graceful shutdown works
- [ ] No orphan processes

---

## 🎯 Success Criteria Summary

**Your server is production-ready if:**

✅ All GPU detection is REAL (no fallback to mock)  
✅ Models load with actual llama.cpp processes  
✅ API returns responses from real inference  
✅ Metrics reflect actual performance  
✅ No simulated data anywhere  
✅ IDEs can connect and get responses  
✅ Load balancing distributes requests  
✅ Shutdown is clean with no orphans  

---

## 🐛 Common Issues & Fixes

### Issue: "No response from model"
**Debug:**
```bash
# Check llama-server is running
ps aux | grep llama-server

# Check logs
curl http://localhost:8080/api/logs

# Test llama-server directly
curl http://localhost:8081/health  # Use actual port from backend logs
```

### Issue: "Slow inference"
**Optimize:**
- Use Q4_K_M quantization (faster)
- Reduce max_tokens
- Reduce context size when loading
- Check GPU utilization (should be >80%)

### Issue: "Model won't load"
**Debug:**
```bash
# Check GPU memory
nvidia-smi

# Check model file exists
ls -lh models/*.gguf

# Check backend logs for detailed error
```

---

## 📝 Report Results

After testing, you should be able to confirm:

1. **GPU Detection:** nvidia-smi shows X GPUs
2. **Model Loading:** Loaded Y model(s)
3. **Inference:** Tokens/sec = Z
4. **Requests:** Processed W requests successfully
5. **IDE Integration:** Connected from [Cursor/VSCode/Warp]

**Example:**
> ✅ Tested on 2x RTX 4090, loaded Mistral 7B Q4,  
> 120 tokens/sec average, 50 requests processed,  
> Cursor integration working perfectly!

---

🎉 **Happy Testing!**

See [START_HERE.md](START_HERE.md) for setup if you haven't installed yet.

