# NexusLLM Python GGUF Inference Server

A production-ready, high-performance FastAPI-based LLM inference server with full GGUF model support, streaming responses, and GPU acceleration.

## Features

✨ **Complete GGUF Support**
- Full compatibility with llama-cpp-python backend
- Support for quantized models (Q4, Q5, Q8, F16, F32)
- Automatic model discovery and loading

🚀 **High Performance**
- Efficient model caching with LRU eviction
- GPU acceleration support (NVIDIA, AMD, Metal)
- Configurable context windows and batch sizes
- Real-time streaming with Server-Sent Events

🔌 **OpenAI-Compatible API**
- Drop-in replacement for OpenAI API
- `/v1/completions` endpoint for text generation
- `/v1/chat/completions` endpoint for conversational AI
- Standard token usage reporting

💾 **Smart Memory Management**
- Automatic model loading/unloading
- LRU cache for frequently used models
- Graceful shutdown with resource cleanup
- Configurable model cache size

🎯 **Developer Friendly**
- Fully documented Python code with type hints
- Comprehensive error handling
- Structured logging
- FastAPI auto-generated API docs at `/docs`

## Quick Start

### 1. Prerequisites

- Python 3.9+
- GGUF model files in the `models/` directory
- (Optional) GPU drivers for acceleration

### 2. Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local for your setup
# Key settings to adjust:
# - N_GPU_LAYERS: Set > 0 if using GPU
# - N_THREADS: Set to your CPU core count
# - MODEL_PATH: Path to your GGUF models
# - DEFAULT_MODEL: Which model to load by default
```

### 4. Run the Server

```bash
# Start the server
python -m python_server.main

# Server will be available at http://localhost:8000
# API documentation at http://localhost:8000/docs
```

## API Usage Examples

### Text Completion

```bash
# Non-streaming completion
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The future of AI is",
    "max_tokens": 100,
    "temperature": 0.7,
    "top_p": 0.9
  }'

# Streaming completion
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The future of AI is",
    "max_tokens": 100,
    "stream": true
  }'
```

### Chat Completion

```bash
# Chat endpoint
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "max_tokens": 100,
    "stream": false
  }'
```

### List Available Models

```bash
curl http://localhost:8000/v1/models
```

### Tokenization

```bash
# Count tokens in text
curl "http://localhost:8000/v1/tokenize?text=Hello%20world&model=DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf"
```

### Model Management

```bash
# Unload a specific model
curl -X POST http://localhost:8000/v1/models/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf/unload

# Clear all cached models
curl -X POST http://localhost:8000/v1/cache/clear
```

## Configuration Guide

### GPU Acceleration

**NVIDIA GPUs:**
```bash
# Install CUDA-enabled llama-cpp-python
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121
```

Then in `.env.local`:
```
N_GPU_LAYERS=35  # Adjust based on your GPU VRAM
```

**AMD GPUs:**
```bash
# Install ROCm-enabled llama-cpp-python
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/rocm
```

**Apple Metal:**
```bash
# Metal support is built-in, just set GPU layers
N_GPU_LAYERS=35
```

### Performance Tuning

| Setting | Impact | Recommendation |
|---------|--------|-----------------|
| `N_THREADS` | CPU utilization | Set to number of cores |
| `N_GPU_LAYERS` | GPU acceleration | 0 for CPU, 20+ for GPU |
| `BATCH_SIZE` | Token processing | 128-1024 depending on VRAM |
| `CONTEXT_LENGTH` | Memory usage | 2048 for general use, 4096+ for long documents |
| `MAX_CACHED_MODELS` | Memory management | 1-3 depending on model size |

### Model Parameters

**Temperature (0.0 - 2.0)**
- 0.0 = Deterministic (always same output)
- 0.7 = Balanced (default)
- 1.5+ = Very creative

**Top-P (0.0 - 1.0)**
- Controls diversity via nucleus sampling
- 0.9 = 90% probability mass (recommended)

**Top-K (0+)**
- Only sample from top K tokens
- 40 = default, 0 = disabled

**Repeat Penalty (1.0+)**
- Penalizes repeated tokens
- 1.1 = mild, 1.5 = strong

## Architecture

### Module Overview

```
python_server/
├── __init__.py           # Package initialization
├── main.py              # FastAPI application and endpoints
├── config.py            # Settings management
├── model_manager.py     # Model loading and caching
├── inference.py         # Text generation engine
└── schemas.py           # Pydantic request/response schemas
```

### Data Flow

1. **Request** → Validated by Pydantic schema
2. **Model Loading** → Check cache → Load if needed
3. **Tokenization** → Count tokens, validate context
4. **Inference** → Generate with specified parameters
5. **Response** → Return completion or stream tokens

## Key Components

### ModelManager
- Handles model lifecycle (load/unload)
- Maintains LRU cache of loaded models
- Prevents duplicate concurrent loads
- Graceful resource cleanup

### InferenceEngine
- Configurable text generation
- Token counting and validation
- Streaming support with real-time tokens
- Chat message formatting

### FastAPI Application
- OpenAI-compatible endpoints
- Server-Sent Events streaming
- Comprehensive error handling
- Auto-generated API documentation

## Performance Tips

### CPU-Only Setup
```
N_GPU_LAYERS=0
N_THREADS=<num_cores>
BATCH_SIZE=512
CONTEXT_LENGTH=2048
```

### GPU-Accelerated Setup
```
N_GPU_LAYERS=30-40  # Depends on VRAM
N_THREADS=4-8
BATCH_SIZE=1024+
CONTEXT_LENGTH=4096+
```

### Production Deployment
```
DEBUG=False
ENABLE_METRICS=True
MAX_CACHED_MODELS=3
CORS_ORIGINS=https://yourdomain.com
```

## Troubleshooting

### Model Loading Fails
- Check model file exists and is valid GGUF
- Ensure sufficient disk space
- Verify MODEL_PATH setting

### Out of Memory
- Reduce N_GPU_LAYERS
- Lower CONTEXT_LENGTH or BATCH_SIZE
- Decrease MAX_CACHED_MODELS

### Slow Inference
- Increase N_GPU_LAYERS (if GPU available)
- Increase N_THREADS (if CPU-bound)
- Check system load and available resources

### Streaming Cuts Off
- Increase REQUEST_TIMEOUT
- Check client connection
- Monitor server logs

## Production Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "-m", "python_server.main"]
```

### systemd Service

```ini
[Unit]
Description=NexusLLM GGUF Inference Server
After=network.target

[Service]
Type=simple
User=llm
WorkingDirectory=/opt/nexusllm
Environment="PATH=/opt/nexusllm/venv/bin"
ExecStart=/opt/nexusllm/venv/bin/python -m python_server.main
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

### Logs
```bash
# Follow logs
tail -f logs/server.log

# Debug mode logs
DEBUG=True python -m python_server.main
```

### Metrics (if enabled)
- Token throughput (tokens/second)
- Request latency
- Cache hit rate
- Memory usage

## API Reference

### POST /v1/completions
Generate text completion from a prompt.

**Parameters:**
- `prompt` (str, required): Input text
- `max_tokens` (int, 1-4096, default: 128)
- `temperature` (float, 0.0-2.0, default: 0.7)
- `top_p` (float, 0.0-1.0, default: 0.9)
- `top_k` (int, default: 40)
- `repeat_penalty` (float, default: 1.1)
- `stream` (bool, default: false)
- `model` (str, optional): Model name

### POST /v1/chat/completions
Generate chat completion from messages.

**Parameters:**
- `messages` (array, required): Message objects with `role` and `content`
- `max_tokens` (int, default: 128)
- `temperature` (float, default: 0.7)
- `top_p` (float, default: 0.9)
- `stream` (bool, default: false)
- `model` (str, optional): Model name

### GET /v1/models
List available GGUF models.

### POST /v1/tokenize
Count tokens in text.

**Parameters:**
- `text` (str, required): Text to tokenize
- `model` (str, optional): Model name

### POST /v1/models/{model_name}/unload
Unload a specific model.

### POST /v1/cache/clear
Clear all cached models.

### GET /health
Health check endpoint.

## License

This project is part of NexusLLM and follows the same license terms.

## Support

For issues, questions, or contributions, please refer to the main NexusLLM repository.
