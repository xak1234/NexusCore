# NexusLLM Python GGUF Server - Quick Start Guide

Get the high-performance GGUF inference server running in 5 minutes!

## Prerequisites

- Python 3.9 or later
- GGUF model files (you already have 3 in `models/` folder)
- ~2GB RAM minimum (4GB recommended)

## Step 1: Set Up Python Environment

```bash
# Navigate to project directory
cd C:\git\nexusllm

# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate
```

## Step 2: Install Dependencies

```bash
# Install requirements
pip install -r requirements.txt
```

This installs:
- **FastAPI**: Web framework for REST API
- **llama-cpp-python**: GGUF model inference engine
- **Uvicorn**: ASGI server
- **Pydantic**: Request validation
- And other dependencies

**Estimated time**: 2-5 minutes (longer on first install)

## Step 3: Configure (Optional)

```bash
# Copy the example environment file
copy .env.local.example .env.local

# Edit .env.local if needed (mostly optional):
# - If you have a GPU, set N_GPU_LAYERS=35 (or higher)
# - N_THREADS: CPU thread count (default 4 is usually fine)
```

**For NVIDIA GPU users:**
```bash
# Install GPU-accelerated version
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121

# Then set in .env.local:
# N_GPU_LAYERS=35
```

## Step 4: Run the Server

```bash
# Start the server
python -m python_server.main

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

🎉 **Server is running!**

## Step 5: Test It Out

### Option A: Web Browser (Easiest)

Open browser and go to: `http://localhost:8000/docs`

You'll see interactive API documentation. Try these:

1. Click "GET /health" → "Try it out" → "Execute"
2. Click "GET /v1/models" → "Try it out" → "Execute"

### Option B: Command Line (curl)

```bash
# Health check
curl http://localhost:8000/health

# List models
curl http://localhost:8000/v1/models

# Generate text
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, my name is",
    "max_tokens": 50,
    "temperature": 0.7
  }'
```

### Option C: Python Test Script

```bash
# Run the comprehensive test suite
python -m python_server.test_server
```

This will:
1. Check server health ✓
2. List available models ✓
3. Test tokenization ✓
4. Generate text completions ✓
5. Stream tokens in real-time ✓
6. Test chat completions ✓

## API Examples

### Text Completion

```bash
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The future of AI is",
    "max_tokens": 100,
    "temperature": 0.7
  }'
```

### Chat Completion

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is Python?"}
    ],
    "max_tokens": 100
  }'
```

### Streaming Responses

```bash
# Stream tokens as they're generated (real-time feedback)
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "In the year 2030,",
    "max_tokens": 100,
    "stream": true
  }'
```

## Common Issues

### "ModuleNotFoundError: No module named 'llama_cpp'"

```bash
# Make sure virtual environment is activated
venv\Scripts\activate

# Then install again
pip install -r requirements.txt
```

### "Model file not found"

Make sure:
1. You have `.gguf` files in `models/` folder
2. `.env.local` has correct `MODEL_PATH` setting
3. Model name matches filename exactly

### Server won't start / Address already in use

```bash
# Change port in .env.local or run on different port:
PORT=8001 python -m python_server.main
```

### Slow inference

Check `.env.local`:
- CPU only? Set `N_THREADS` = number of CPU cores
- Have GPU? Set `N_GPU_LAYERS=35` and install GPU build
- Change `BATCH_SIZE` to find sweet spot

## Next Steps

1. **Read full documentation**: `PYTHON_SERVER_README.md`
2. **Configure GPU**: See "GPU Acceleration" section
3. **Deploy**: Docker example in README
4. **Integrate**: Use with your application via API

## Useful URLs

- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Available Models**: http://localhost:8000/v1/models

## Project Structure

```
C:\git\nexusllm\
├── python_server/           # Main server code
│   ├── main.py             # FastAPI app & endpoints
│   ├── config.py           # Settings management
│   ├── model_manager.py    # Model loading & caching
│   ├── inference.py        # Text generation
│   ├── schemas.py          # Request/response schemas
│   └── test_server.py      # Test suite
├── models/                  # GGUF model files
├── .env.local              # Your configuration (create from .env.local.example)
├── requirements.txt        # Python dependencies
└── PYTHON_SERVER_README.md # Full documentation
```

## Tips & Tricks

- **First load is slow**: Models are cached after first load, subsequent requests are faster
- **Monitor resources**: Use `htop` (Linux) or Task Manager (Windows) to watch CPU/Memory
- **Debug mode**: Set `DEBUG=True` in `.env.local` for verbose logging
- **Multiple models**: Server can load multiple models (configured by `MAX_CACHED_MODELS`)

## Need Help?

1. Check logs: Run with `DEBUG=True` for detailed output
2. Test endpoint: `curl http://localhost:8000/health`
3. See full docs: Read `PYTHON_SERVER_README.md`
4. View API docs: Visit `http://localhost:8000/docs`

**Happy inferencing!** 🚀
