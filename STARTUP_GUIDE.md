# NexusLLM Startup Guide

## 🚀 Quick Start

### Windows Users
Simply double-click `start-nexus.bat` to launch all services automatically!

### Manual Start
```bash
# PowerShell
./start-nexus.ps1

# Or use npm
npm run dev:all
```

## 📋 What the Startup Script Does

1. **Checks Prerequisites**
   - Verifies Node.js is installed
   - Verifies Python 3.9+ is installed
   - Installs npm dependencies if needed

2. **Creates Configuration**
   - Auto-creates `.env.local` if missing
   - Sets up default configuration for both GPUs

3. **Starts Services**
   - Python GGUF Server (Port 8000)
   - Node.js Backend API (Port 8080)
   - React Frontend (Port 3000)

4. **Auto-loads Model** (Optional)
   - Loads the smallest model (LFM2-1.2B-Q8_0) by default
   - Uses both GPUs automatically

5. **Opens Browser**
   - Automatically opens http://localhost:3000

## ⚙️ Configuration

Edit `.env.local` to customize:

```env
# Change default model to auto-load
DEFAULT_MODEL=LFM2-1.2B-Q8_0.gguf
AUTO_LOAD_MODEL=true

# Adjust GPU layers (35 = use GPU, 0 = CPU only)
N_GPU_LAYERS=35

# Set CPU threads
N_THREADS=8
```

## 🔌 VSCode/Cursor Integration

After starting, configure your IDE:

### Cursor
1. Open Settings → Models → OpenAI
2. Set Base URL: `http://localhost:8080`
3. Set API Key: `any-key-works`

### VSCode with Continue Extension
1. Open Continue settings
2. Add custom model:
```json
{
  "models": [{
    "title": "NexusLLM",
    "provider": "openai",
    "apiBase": "http://localhost:8080/v1",
    "apiKey": "any-key-works",
    "model": "LFM2-1.2B-Q8_0"
  }]
}
```

## 🛠️ Troubleshooting

### Services Won't Start
- Check if ports 3000, 8000, 8080 are already in use
- Run as Administrator if permission errors occur
- Check Windows Defender/Firewall settings

### Model Won't Load
- Ensure you have GGUF files in `./models` directory
- Check available GPU memory with `nvidia-smi`
- Try loading a smaller model first

### Python Server Crashes
- Install Visual C++ Redistributables
- Update GPU drivers
- Try CPU-only mode: set `N_GPU_LAYERS=0`

## 📊 Monitoring

While running, you can:
- View logs in the PowerShell window
- Check GPU usage: http://localhost:3000
- Monitor requests in the Logs tab
- See performance metrics on Dashboard

## 🛑 Stopping Services

Press `Ctrl+C` in the PowerShell window to gracefully stop all services.

## 🔄 Daily Usage

1. **Start**: Double-click `start-nexus.bat`
2. **Wait**: ~30 seconds for services to initialize
3. **Use**: Browser opens automatically
4. **Stop**: Press Ctrl+C when done

The script handles everything automatically!

