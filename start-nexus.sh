#!/bin/bash
# NexusLLM Startup Script for Linux/macOS
# This script starts all required services for the NexusLLM application

echo -e "\033[36m🚀 Starting NexusLLM Services...\033[0m"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "\033[31m❌ Node.js is not installed. Please install Node.js first.\033[0m"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "\033[31m❌ Python 3 is not installed. Please install Python 3.9+ first.\033[0m"
    exit 1
fi

# Set working directory to script location
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "\033[33m📦 Installing Node.js dependencies...\033[0m"
    npm install
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo -e "\033[33m📝 Creating .env.local configuration file...\033[0m"
    cat > .env.local << 'EOF'
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
EOF
    echo -e "\033[32m✅ Created .env.local\033[0m"
fi

# Kill any existing processes on our ports
echo -e "\033[33m🧹 Cleaning up existing processes...\033[0m"
for port in 8000 8080 3000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        kill -9 $(lsof -Pi :$port -sTCP:LISTEN -t) 2>/dev/null
        echo -e "   Stopped process on port $port"
    fi
done

sleep 1

# Start Python server
echo -e "\n\033[33m🐍 Starting Python GGUF Inference Server (Port 8000)...\033[0m"
export PORT=8000
export HOST=0.0.0.0
python3 -m python_server.main > python_server.log 2>&1 &
PYTHON_PID=$!

# Wait for Python server to be ready
echo -e "   Waiting for Python server to start..."
python_ready=false
attempts=0
while [ "$python_ready" = false ] && [ $attempts -lt 30 ]; do
    sleep 1
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        python_ready=true
        echo -e "   \033[32m✅ Python server is ready!\033[0m"
    else
        attempts=$((attempts + 1))
        if [ $((attempts % 5)) -eq 0 ]; then
            echo -e "   Still waiting... ($attempts seconds)"
        fi
    fi
done

if [ "$python_ready" = false ]; then
    echo -e "\033[31m❌ Python server failed to start. Check python_server.log\033[0m"
    exit 1
fi

# Start Node.js server and frontend
echo -e "\n\033[33m🚀 Starting Node.js Backend and Frontend...\033[0m"
npm run dev:all > node_server.log 2>&1 &
NODE_PID=$!

# Wait for services to be ready
echo -e "   Waiting for all services to start..."
node_ready=false
attempts=0
while [ "$node_ready" = false ] && [ $attempts -lt 30 ]; do
    sleep 1
    if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
        node_ready=true
        echo -e "   \033[32m✅ Node.js server is ready!\033[0m"
    else
        attempts=$((attempts + 1))
        if [ $((attempts % 5)) -eq 0 ]; then
            echo -e "   Still waiting... ($attempts seconds)"
        fi
    fi
done

if [ "$node_ready" = false ]; then
    echo -e "\033[31m❌ Node.js server failed to start. Check node_server.log\033[0m"
    exit 1
fi

# Auto-load default model if configured
if grep -q "AUTO_LOAD_MODEL=true" .env.local; then
    echo -e "\n\033[33m🤖 Auto-loading default model...\033[0m"
    
    # Get default model from config
    DEFAULT_MODEL=$(grep "DEFAULT_MODEL=" .env.local | cut -d'=' -f2 | cut -d'.' -f1)
    DEFAULT_MODEL=${DEFAULT_MODEL:-LFM2-1.2B-Q8_0}
    
    response=$(curl -s -X POST http://localhost:8080/api/models/$DEFAULT_MODEL/load \
        -H "Content-Type: application/json" \
        -d '{"gpuIds": [0, 1]}')
    
    if echo "$response" | grep -q '"status":"loaded"'; then
        echo -e "   \033[32m✅ Model loaded: $DEFAULT_MODEL\033[0m"
    else
        echo -e "   \033[33m⚠️  Failed to auto-load model\033[0m"
    fi
fi

# Display status
echo -e "\n\033[32m✨ NexusLLM is running!\033[0m"
echo -e "\n\033[36m📍 Service URLs:\033[0m"
echo -e "   Frontend:    http://localhost:3000"
echo -e "   Backend API: http://localhost:8080"
echo -e "   Python API:  http://localhost:8000"
echo -e "\n\033[36m🔌 VSCode/Cursor Integration:\033[0m"
echo -e "   OpenAI Base URL: http://localhost:8080"
echo -e "\n\033[36m📊 Monitoring:\033[0m"
echo -e "   \033[33mUse Ctrl+C to stop all services\033[0m"
echo -e "   Logs: python_server.log, node_server.log"

# Open browser (cross-platform)
sleep 2
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
fi

# Cleanup function
cleanup() {
    echo -e "\n\033[33m🛑 Shutting down services...\033[0m"
    kill $PYTHON_PID 2>/dev/null
    kill $NODE_PID 2>/dev/null
    
    # Kill processes on ports
    for port in 8000 8080 3000; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            kill -9 $(lsof -Pi :$port -sTCP:LISTEN -t) 2>/dev/null
        fi
    done
    
    echo -e "\033[32m✅ All services stopped.\033[0m"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Monitor services
echo -e "\n\033[90m🔍 Monitoring services (Press Ctrl+C to stop)...\033[0m"
while true; do
    # Check if services are still running
    if ! kill -0 $PYTHON_PID 2>/dev/null; then
        echo -e "\n\033[31m❌ Python server stopped unexpectedly!\033[0m"
        tail -n 20 python_server.log
        cleanup
    fi
    if ! kill -0 $NODE_PID 2>/dev/null; then
        echo -e "\n\033[31m❌ Node.js server stopped unexpectedly!\033[0m"
        tail -n 20 node_server.log
        cleanup
    fi
    sleep 5
done
