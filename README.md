# NexusCore LLM Server

**A production-grade, self-hosted LLM inference server with OpenAI-compatible API, multi-GPU support, and intelligent load balancing.**

## 🚀 Key Features

- **🎯 OpenAI-Compatible API**: Drop-in replacement for OpenAI API - works with Cursor, VSCode, Warp
- **⚡ Multi-GPU Support**: Load models across multiple GPUs with automatic layer splitting
- **🧠 Intelligent Load Balancing**: Automatic request distribution based on real-time GPU load
- **📊 Real-time Monitoring**: Live GPU metrics, request tracking, and performance analytics
- **🔌 llama.cpp Integration**: Native support for GGUF models with GPU acceleration
- **🎨 Modern Web Interface**: Drag-and-drop dashboard for model management
- **🔒 Production-Ready**: No mock data, real GPU detection, graceful error handling

## 📋 Prerequisites

### Required:
- **Node.js** v18 or higher
- **NVIDIA GPU(s)** with CUDA drivers installed  
- **nvidia-smi** working in terminal
- **llama.cpp** installed with server binary (`llama-server`)

### Optional:
- **Gemini API Key** (for log analysis and prompt generation features)

## 🛠️ Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Install llama.cpp

The server requires llama.cpp for model inference:

```bash
# Clone and build llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make LLAMA_CUBLAS=1  # Build with CUDA support

# Make llama-server available in PATH
export PATH=$PATH:$(pwd)
# Or copy to system PATH:
# sudo cp llama-server /usr/local/bin/
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# REQUIRED: Path to llama-server binary (if not in PATH)
LLAMA_SERVER_PATH=llama-server

# REQUIRED: Model storage directory
MODEL_PATH=./models

# Backend server port
PORT=8080

# Frontend API URL
VITE_API_URL=http://localhost:8080/api

# OPTIONAL: Gemini API key for log analysis
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed configuration.

### 4. Add Model Files

**IMPORTANT**: You need GGUF model files. Create models directory and add your models:

```bash
mkdir models
cd models

# Download a model (example with Mistral 7B)
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf

# Or copy your existing GGUF files
cp /path/to/your/model.gguf ./
```

Supported formats: `.gguf` files from HuggingFace (search for models with GGUF quantization)

## 🏃 Running the Application

### Run Frontend and Backend Together (Recommended)

```bash
npm run dev:all
```

This will start:
- Frontend dev server at `http://localhost:3000`
- Backend API server at `http://localhost:8080`

### Run Separately

**Frontend only:**
```bash
npm run dev
```

**Backend only:**
```bash
npm run dev:server
```

## 🏗️ Building for Production

### Build Frontend

```bash
npm run build
```

### Build Backend

```bash
npm run build:server
```

### Run Production Server

```bash
npm run start:server
```

## 📚 Architecture

### Frontend (`/`)
- **React 19** with TypeScript
- **Vite** for build tooling
- **Recharts** for real-time data visualization
- **React Grid Layout** for customizable dashboard
- **Tailwind CSS** for styling

### Backend (`/server`)
- **Express** REST API server
- **nvidia-smi** integration for GPU monitoring
- **In-memory storage** (replaceable with database)
- **CORS** enabled for frontend communication

### Services (`/services`)
- **apiService.ts**: Frontend API client
- **geminiService.ts**: Google Gemini AI integration

## 🔌 API Endpoints

### OpenAI-Compatible Endpoints (for IDEs):
- `POST /v1/chat/completions` - Chat completions (primary)
- `POST /v1/completions` - Text completions (legacy)
- `GET /v1/models` - List available models

### Management API:
- `GET /api/health` - Server health check
- `GET /api/gpus` - Real-time GPU status
- `GET /api/models` - List GGUF models
- `POST /api/models/:modelId/load` - Load model with llama.cpp
- `POST /api/models/:modelId/unload` - Unload and stop model
- `GET /api/logs` - Request history
- `GET /api/stats` - Performance metrics

## 🎯 Usage

### Web Interface

1. **Dashboard** (`http://localhost:3000`): Real-time GPU metrics and performance
2. **Models**: Load/unload models, assign to specific GPUs
3. **Logs**: Request history with Gemini-powered analysis
4. **Settings**: Configure system prompts and paths

### IDE Integration

Configure your IDE to use NexusCore as AI backend:

**Cursor:**
```
Settings → OpenAI → Base URL: http://localhost:8080
```

**VSCode (with Continue):**
```json
{
  "apiBase": "http://localhost:8080/v1",
  "provider": "openai"
}
```

**Warp Terminal:**
```
Settings → AI → Custom Endpoint: http://localhost:8080/v1/chat/completions
```

See [IDE_INTEGRATION.md](./IDE_INTEGRATION.md) for detailed setup instructions.

## 🔧 Troubleshooting

### Server won't start / GPU detection fails

```bash
# Test GPU access
nvidia-smi

# If fails, install NVIDIA drivers:
# Ubuntu: sudo apt-get install nvidia-driver-535 nvidia-cuda-toolkit
# Windows: Download from NVIDIA website
```

### llama-server not found

```bash
# Check if in PATH
which llama-server

# If not, set in .env.local:
LLAMA_SERVER_PATH=/path/to/llama.cpp/llama-server
```

### Model loading fails

- **Check model path**: Ensure `.gguf` file exists
- **Check GPU memory**: Model must fit in total GPU RAM
- **Check logs**: Terminal shows detailed error messages
- **Reduce GPU layers**: Try loading with fewer layers on GPU

### Slow inference

- **Use quantized models**: Q4_K_M or Q5_K_S for speed
- **Check GPU utilization**: Should be >80% during inference
- **Reduce context size**: Lower from 4096 to 2048
- **Use smaller model**: 7B models are faster than 34B

### IDE not connecting

- **Check model loaded**: Must have ≥1 model in "Loaded" status
- **Test with curl**: `curl localhost:8080/v1/models`
- **Check firewall**: Port 8080 must be accessible
- **Restart IDE**: After changing endpoint settings

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue or PR for bugs, features, or improvements.
