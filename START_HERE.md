# 🚀 START HERE - NexusCore Production Setup

## ⚡ What Just Happened

Your GUI has been **completely transformed** into a **production-grade LLM server**:

✅ **All simulation/mock code removed**  
✅ **Real GPU detection via nvidia-smi**  
✅ **Actual model inference with llama.cpp**  
✅ **OpenAI-compatible API for Cursor/VSCode/Warp**  
✅ **Intelligent load balancing across GPUs**  
✅ **Production error handling**  

**NO MORE FAKE DATA. EVERYTHING IS REAL.**

---

## 🎯 Prerequisites Checklist

Before you can run the server, you need:

- [ ] **NVIDIA GPU(s)** with CUDA drivers installed
- [ ] **nvidia-smi** working in terminal
- [ ] **llama.cpp** installed and built with CUDA
- [ ] **GGUF model file(s)** downloaded
- [ ] **Node.js** 18+ installed

---

## 📋 Step-by-Step Setup

### Step 1: Test GPU Access

```bash
nvidia-smi
```

**Expected:** Shows your GPU(s)  
**If fails:** Install NVIDIA drivers from nvidia.com

### Step 2: Install llama.cpp

```bash
# Clone llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Build with CUDA support
make LLAMA_CUBLAS=1

# Test it works
./llama-server --help

# Add to PATH (choose one):
# Option A: Temporary (current session only)
export PATH=$PATH:$(pwd)

# Option B: Permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export PATH=$PATH:/path/to/llama.cpp' >> ~/.bashrc
source ~/.bashrc
```

### Step 3: Get a Model

```bash
# Go back to NexusCore directory
cd /path/to/nexusllm

# Create models directory
mkdir -p models
cd models

# Download a model (Mistral 7B example - 4.4GB)
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf

# Or download from browser and copy here
# Browse models: https://huggingface.co/models?search=gguf
```

### Step 4: Configure Environment

```bash
cd /path/to/nexusllm

# Copy environment template
cp env.example.txt .env.local

# Edit with your paths
nano .env.local  # or use your preferred editor
```

**Minimum required in `.env.local`:**
```env
LLAMA_SERVER_PATH=llama-server
MODEL_PATH=./models
PORT=8080
VITE_API_URL=http://localhost:8080/api
```

### Step 5: Install Dependencies

```bash
npm install
```

### Step 6: Start the Server

```bash
npm run dev:all
```

**You should see:**
```
┌─────────────────────────────────────────────────────────────┐
│  🚀  NexusCore LLM Server - Production Mode               │
└─────────────────────────────────────────────────────────────┘

📊 Detected GPUs: 2
   • GPU 0: NVIDIA RTX 4090 (24.0GB)
   • GPU 1: NVIDIA RTX 3080 (10.0GB)

📚 Available Models: 1
   • Mistral 7B Instruct V0.2 (4.4GB)

✅ Server ready! Load a model to start serving requests.
```

### Step 7: Load a Model

1. Open browser: `http://localhost:3000`
2. Click **"Models"** tab
3. Find your model, click **"Load"**
4. Select GPU(s) to use
5. Click **"Load on X GPU(s)"**
6. Wait for status to change to **"Loaded"** (may take 10-30 seconds)

**Backend will show:**
```
🚀 Starting llama.cpp server on port 8081
   Model: ./models/mistral-7b-instruct-v0.2.Q4_K_M.gguf
   GPUs: 0
✅ llama.cpp server ready on port 8081
```

---

## 🎨 Configure Your IDE

### For Cursor:

1. Open Cursor Settings (`Cmd/Ctrl + ,`)
2. Search for "OpenAI"
3. Set **Base URL** to: `http://localhost:8080`
4. Leave API key blank
5. Press `Cmd/Ctrl + K` to test!

### For VSCode:

1. Install "Continue" extension
2. Open Continue settings (`~/.continue/config.json`)
3. Add:
```json
{
  "models": [{
    "title": "NexusCore Local",
    "provider": "openai",
    "model": "local",
    "apiBase": "http://localhost:8080/v1",
    "apiKey": "not-needed"
  }]
}
```
4. Restart VSCode

### For Warp Terminal:

1. Open Warp settings
2. Navigate to AI section
3. Set custom endpoint: `http://localhost:8080/v1/chat/completions`
4. Leave API key blank

**Full instructions:** See [IDE_INTEGRATION.md](./IDE_INTEGRATION.md)

---

## 🧪 Test It Works

### Test 1: Check Server Health

```bash
curl http://localhost:8080/api/health
```

**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T12:00:00.000Z",
  "modelsLoaded": 1
}
```

### Test 2: Make AI Request

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a hello world in Python"}
    ],
    "max_tokens": 100
  }'
```

**Expected:** Real response from your model!

### Test 3: Check Dashboard

1. Go to `http://localhost:3000`
2. Open **"Logs"** tab
3. You should see your test request

---

## ⚙️ How It Works

```
┌──────────┐         ┌─────────────┐         ┌──────────────┐
│ Cursor/  │         │  NexusCore  │         │  llama.cpp   │
│ VSCode/  │ ──────> │ Load        │ ──────> │  Server      │
│ Warp     │         │ Balancer    │         │  (GPU)       │
└──────────┘         └─────────────┘         └──────────────┘
                            │
                            ├─> Model A on GPU 0
                            ├─> Model B on GPU 1
                            └─> Model C on GPU 2,3

1. IDE sends request to NexusCore
2. Load balancer selects best model (least loaded)
3. Request forwarded to llama.cpp server
4. Model runs on GPU, generates response
5. Response returned to IDE
6. Request logged in dashboard
```

---

## 🔥 Key Features

### Load Balancing
- Automatically distributes requests across loaded models
- Chooses model with lowest active requests
- No configuration needed

### Multi-GPU Support
- Load models across multiple GPUs
- Split large models across GPUs
- Each model can use different GPUs

### Real-Time Monitoring
- Live GPU utilization
- Tokens per second tracking
- Request logging and history
- Performance metrics

### OpenAI Compatible
- Drop-in replacement for OpenAI API
- Works with any OpenAI-compatible tool
- Same request/response format

---

## 🐛 Troubleshooting

### "nvidia-smi failed"
**Fix:** Install NVIDIA drivers
```bash
# Ubuntu
sudo apt-get install nvidia-driver-535

# Check installed
nvidia-smi
```

### "llama-server not found"
**Fix:** Add to PATH or set full path in `.env.local`
```env
LLAMA_SERVER_PATH=/full/path/to/llama.cpp/llama-server
```

### "Model directory not found"
**Fix:** Create directory and add models
```bash
mkdir -p models
cd models
# Download a .gguf file
```

### "Failed to connect to backend"
**Fix:** Ensure backend is running
```bash
# Check if running
curl http://localhost:8080/api/health

# Restart if needed
npm run dev:server
```

### Model loads but slow inference
**Try:**
- Use smaller model (7B instead of 34B)
- Use more quantized model (Q4 instead of Q8)
- Reduce context size in load settings
- Check GPU utilization in dashboard

---

## 📚 Documentation

| File | What It Covers |
|------|----------------|
| **This file (START_HERE.md)** | Quick setup |
| **README.md** | Complete documentation |
| **IDE_INTEGRATION.md** | IDE setup details |
| **PRODUCTION_READY.md** | Technical implementation |
| **QUICK_START.md** | Alternative quick start |
| **PRODUCTION_CONVERSION_SUMMARY.md** | What changed |

---

## 🎯 Next Steps

1. ✅ Complete setup above
2. ✅ Load a model
3. ✅ Configure your IDE
4. ✅ Send a test request
5. 🚀 **Start coding with local AI!**

---

## 💡 Tips

- **Start with smaller models** (7B) for testing
- **Monitor GPU memory** in dashboard before loading large models
- **Keep models loaded** between sessions (loading takes time)
- **Check logs** in dashboard to debug issues
- **Use Q4_K_M quantization** for best speed/quality balance

---

## 🆘 Need Help?

1. **Check logs:** Terminal shows detailed errors
2. **Test components:**
   - GPU: `nvidia-smi`
   - llama.cpp: `llama-server --help`
   - Backend: `curl localhost:8080/api/health`
3. **Read docs:** See list above
4. **Check dashboard:** `http://localhost:3000` shows status

---

## ✨ You're Ready!

NexusCore is now a **production-grade LLM server** ready to:
- Replace OpenAI/Copilot with self-hosted AI
- Serve your entire team with shared GPU resources
- Experiment with different models
- Build AI-powered applications

**Zero simulation. Zero mock data. 100% real.**

🚀 **Happy coding with local AI!**

---

_For detailed technical information, see [PRODUCTION_READY.md](./PRODUCTION_READY.md)_

