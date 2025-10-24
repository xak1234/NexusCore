# Model Binary Loading Troubleshooting Guide

## Problem
"Failed to load binary for the model" error when attempting to load GGUF models.

---

## Root Causes & Solutions

### Issue 1: Missing llama.cpp Server Binary

**Symptoms:**
- Error: "llama-server binary not found"
- Cannot locate server executable

**Solutions:**

#### Option A: Install llama.cpp from source
```bash
# Clone llama.cpp repository
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# Build the server
make server

# The binary will be at: ./server
```

#### Option B: Set LLAMA_SERVER_PATH environment variable
```bash
# Windows (PowerShell)
$env:LLAMA_SERVER_PATH = "C:\path\to\llama-server.exe"

# Windows (CMD)
set LLAMA_SERVER_PATH=C:\path\to\llama-server.exe

# macOS/Linux
export LLAMA_SERVER_PATH="/path/to/llama-server"

# Or add to .env.local
echo "LLAMA_SERVER_PATH=/path/to/llama-server" >> .env.local
```

#### Option C: Add llama-server to system PATH
```bash
# Windows: Add C:\path\to\llama.cpp\ to System PATH environment variable
# macOS/Linux: Copy binary to /usr/local/bin
sudo cp ./llama-server /usr/local/bin/

# Verify
which llama-server  # macOS/Linux
where llama-server  # Windows
```

---

### Issue 2: Model File Corrupted or Invalid GGUF Format

**Symptoms:**
- "Model failed to load"
- "Invalid GGUF file"
- File exists but cannot be read

**Solutions:**

#### Verify Model File Integrity
```bash
# Check file size (should be > 100MB for typical models)
ls -lh models/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf  # macOS/Linux
dir models\DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf     # Windows

# Check GGUF header (first 4 bytes should be "GGUF")
xxd -l 16 models/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf  # macOS/Linux
```

#### Download Models Again
```bash
# Remove corrupted model
rm models/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf

# Download fresh copy from Hugging Face
wget https://huggingface.co/deepseek-ai/deepseek-coder-1.3b/resolve/main/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf -O models/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf

# Or use curl
curl -L https://huggingface.co/deepseek-ai/deepseek-coder-1.3b/resolve/main/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf -o models/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf
```

---

### Issue 3: Incorrect Model Path Configuration

**Symptoms:**
- "Model path not found"
- Server looking in wrong directory

**Solutions:**

#### Verify Configuration
```bash
# Check .env.local settings
cat .env.local | grep MODEL_PATH

# Or check Python config
python -c "from python_server.config import settings; print(f'Model path: {settings.model_path}')"
```

#### Fix Configuration
```bash
# In .env.local, ensure:
MODEL_PATH=./models

# Or use absolute path:
MODEL_PATH=/absolute/path/to/nexusllm/models

# For Node.js server, ensure models/ directory exists at project root
ls -d models/
```

---

### Issue 4: Insufficient Disk Space

**Symptoms:**
- Download incomplete
- File size is much smaller than expected
- "Disk full" or similar errors

**Solutions:**

```bash
# Check available disk space
df -h /                    # macOS/Linux
wmic logicaldisk get size,freespace  # Windows

# Ensure at least 20GB free space for large models
# Models typically range from 1.2GB to 7GB each
```

---

### Issue 5: Permission Denied on Model File

**Symptoms:**
- "Permission denied"
- "Cannot read model file"

**Solutions:**

```bash
# macOS/Linux: Fix permissions
chmod 644 models/*.gguf
chmod 755 models/

# Verify ownership
ls -l models/

# If needed, change owner
sudo chown $USER models/*.gguf
```

---

### Issue 6: GPU Memory Issues (GPU Build)

**Symptoms:**
- CUDA/GPU errors during loading
- OutOfMemory errors

**Solutions:**

#### Reduce GPU Layers
```bash
# In .env.local, reduce N_GPU_LAYERS
N_GPU_LAYERS=10  # Start low and increase gradually

# Check GPU memory
nvidia-smi  # NVIDIA
rocm-smi    # AMD
```

#### Fall Back to CPU
```bash
# In .env.local
N_GPU_LAYERS=0

# This forces CPU-only inference
```

---

### Issue 7: Python Server Not Started

**Symptoms:**
- Frontend shows integrity check failures
- Cannot connect to Python API

**Solutions:**

#### Start the Python Server
```bash
# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
python -m python_server.main
```

#### Verify Server is Running
```bash
# Check if server is listening
curl http://localhost:8000/health

# Or check processes
ps aux | grep python_server    # macOS/Linux
tasklist | find "python"       # Windows
```

---

### Issue 8: Node.js Server Configuration Issue

**Symptoms:**
- Frontend runs but backend calls fail
- API returns 404

**Solutions:**

#### Check API URLs
```bash
# In App.tsx, verify API_BASE_URL
# Should match backend: http://localhost:8080/api

# Or check services/apiService.ts line 3
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

# Set environment variable if needed
export VITE_API_URL=http://localhost:8080/api
```

#### Start Node.js Server
```bash
# Install dependencies
npm install

# Run development server
npm run dev:server

# Or run both frontend and backend
npm run dev:all
```

---

## Quick Diagnosis

Run this comprehensive diagnostic script:

```bash
#!/bin/bash
# Model Loading Diagnostics

echo "=== Model Loading Diagnostics ==="
echo ""

# Check llama-server
echo "1. Checking llama-server:"
which llama-server 2>/dev/null && echo "✓ Found in PATH" || echo "✗ Not in PATH"

# Check model files
echo ""
echo "2. Checking model files:"
ls -lh models/*.gguf 2>/dev/null || echo "✗ No models found"

# Check model file format
echo ""
echo "3. Checking GGUF format (first 4 bytes should spell 'GGUF'):"
xxd -l 4 models/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf 2>/dev/null || echo "✗ Cannot read file"

# Check disk space
echo ""
echo "4. Checking disk space:"
df -h / | tail -1

# Check Python environment
echo ""
echo "5. Checking Python setup:"
python --version 2>/dev/null && echo "✓ Python found" || echo "✗ Python not found"
pip list 2>/dev/null | grep llama-cpp-python || echo "✗ llama-cpp-python not installed"

# Check Node.js server
echo ""
echo "6. Checking Node.js server:"
curl -s http://localhost:8080/api/models >/dev/null && echo "✓ Server running" || echo "✗ Server not responding"

# Check Python server  
echo ""
echo "7. Checking Python server:"
curl -s http://localhost:8000/health >/dev/null && echo "✓ Server running" || echo "✗ Server not responding"

echo ""
echo "=== End Diagnostics ==="
```

---

## Step-by-Step Recovery

1. **Stop all servers**
   ```bash
   # Kill any running instances
   pkill -f llama-server
   pkill -f python_server
   pkill -f "npm run"
   ```

2. **Verify model file**
   ```bash
   # Check file exists and has content
   ls -lh models/
   file models/*.gguf  # Should say "data"
   ```

3. **Ensure llama.cpp is available**
   ```bash
   # Test llama-server directly
   llama-server --version
   ```

4. **Start Python server**
   ```bash
   python -m python_server.main
   # Should see: [Integrity Check] status: ✓ PASSED
   ```

5. **Start Node.js server**
   ```bash
   npm run dev:server
   ```

6. **Test frontend**
   ```bash
   npm run dev
   # Open http://localhost:5173
   ```

7. **Test API directly**
   ```bash
   curl http://localhost:8000/v1/models
   ```

---

## Environment Variables Reference

### For Python Server (`python_server/config.py`)
```bash
MODEL_PATH=./models
DEFAULT_MODEL=DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf
N_GPU_LAYERS=0
N_THREADS=4
CONTEXT_LENGTH=2048
BATCH_SIZE=512
DEBUG=False
```

### For Node.js Server (`server/index.ts`)
```bash
LLAMA_SERVER_PATH=/path/to/llama-server
PORT=8080
```

### For Frontend (`services/apiService.ts`)
```bash
VITE_API_URL=http://localhost:8080/api
```

---

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "llama-server not found" | Binary missing | Install llama.cpp or set LLAMA_SERVER_PATH |
| "Invalid GGUF file" | Corrupted model | Redownload model file |
| "Model path not found" | Wrong configuration | Check MODEL_PATH in .env.local |
| "No space left on device" | Disk full | Free up disk space |
| "Permission denied" | File permissions | Run `chmod 644 models/*.gguf` |
| "CUDA out of memory" | GPU memory full | Reduce N_GPU_LAYERS |
| "Connection refused" | Server not running | Start Python or Node.js server |
| "404 Not Found" | Wrong API URL | Check VITE_API_URL |

---

## Additional Resources

- **llama.cpp GitHub**: https://github.com/ggerganov/llama.cpp
- **GGUF Format Spec**: https://github.com/ggerganov/ggml/blob/master/docs/gguf.md
- **Model Sources**:
  - Hugging Face: https://huggingface.co/models?filter=gguf
  - Ollama Library: https://ollama.ai/library
  - GGUF Models: https://huggingface.co/TheBloke

---

## Still Having Issues?

1. Check the console logs for detailed error messages
2. Enable DEBUG mode: `DEBUG=True` in .env.local
3. Review the comprehensive testing guide: `TESTING_COMPREHENSIVE.md`
4. Check the Python server logs for detailed diagnostics
5. Verify all dependencies are installed: `pip install -r requirements.txt`
