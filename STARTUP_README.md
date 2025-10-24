# 🚀 NexusLLM Startup System

Complete startup and management solution for NexusLLM with automated configuration, testing, and monitoring.

## 📁 Files Created

### Core Startup Scripts
- **`start-nexus.bat`** - Windows quick-start (double-click to run)
- **`start-nexus.ps1`** - PowerShell startup script with full automation
- **`start-nexus.sh`** - Linux/macOS startup script
- **`nexus-tray.ps1`** - System tray application for easy control

### Utilities
- **`test-nexus.ps1`** - System diagnostic and testing tool
- **`config-editor.html`** - Visual configuration editor
- **`.env.local`** - Auto-created configuration file

### Documentation
- **`STARTUP_GUIDE.md`** - User guide for the startup system
- **`STARTUP_README.md`** - This file

## 🎯 Features

### Automatic Startup
- ✅ Prerequisite checking (Node.js, Python, GPU)
- ✅ Dependency installation
- ✅ Port conflict resolution
- ✅ Service health monitoring
- ✅ Auto-load default model
- ✅ Browser auto-launch

### Configuration Management
- ✅ Auto-creates `.env.local` if missing
- ✅ Visual config editor (HTML)
- ✅ GPU auto-detection
- ✅ Sensible defaults

### System Integration
- ✅ System tray application
- ✅ VSCode/Cursor ready
- ✅ OpenAI API compatible
- ✅ Cross-platform support

## 🖱️ Quick Start Options

### Option 1: Batch File (Simplest)
```
Double-click: start-nexus.bat
```

### Option 2: PowerShell
```powershell
./start-nexus.ps1
```

### Option 3: System Tray
```powershell
./nexus-tray.ps1
```
Right-click tray icon for options

### Option 4: Manual
```bash
# Terminal 1
python -m python_server.main

# Terminal 2
npm run dev:all
```

## ⚙️ Configuration

### Using Config Editor
1. Open `config-editor.html` in browser
2. Adjust settings
3. Click "Save Configuration"
4. Move downloaded `.env.local` to project root

### Manual Configuration
Edit `.env.local`:
```env
# Key settings
DEFAULT_MODEL=LFM2-1.2B-Q8_0.gguf  # Smallest/fastest model
AUTO_LOAD_MODEL=true               # Load on startup
N_GPU_LAYERS=35                    # GPU acceleration (0=CPU only)
N_THREADS=8                        # CPU threads
```

## 🧪 Testing & Diagnostics

Run the test script:
```powershell
./test-nexus.ps1
```

Checks:
- Prerequisites (Node.js, Python, GPU)
- File structure
- Service status
- API endpoints
- Port availability

## 🔌 IDE Integration

### Cursor
1. Settings → Models → OpenAI
2. Base URL: `http://localhost:8080`
3. API Key: `any-key-works`

### VSCode + Continue
```json
{
  "models": [{
    "title": "NexusLLM",
    "provider": "openai",
    "apiBase": "http://localhost:8080/v1",
    "apiKey": "any-key-works"
  }]
}
```

## 📊 Monitoring

### Dashboard
- http://localhost:3000 - Main UI
- Real-time GPU metrics
- Request logs
- Performance graphs

### Logs
- PowerShell window - Live output
- `python_server.log` - Python server logs
- `node_server.log` - Node.js logs

### API Endpoints
- http://localhost:8000/health - Python server
- http://localhost:8080/api/health - Node.js server
- http://localhost:8080/v1/models - Available models

## 🛠️ Troubleshooting

### Common Issues

**"Python server unavailable"**
- Check Python is installed: `python --version`
- Check port 8000: `netstat -an | findstr :8000`
- Check logs in PowerShell window

**"No models found"**
- Ensure `.gguf` files in `./models` directory
- Download from: https://huggingface.co/TheBloke

**GPU not detected**
- Run `nvidia-smi` to check drivers
- Set `N_GPU_LAYERS=0` for CPU-only mode

**Port already in use**
- Script auto-kills existing processes
- Manual: Use Task Manager to end processes

### Reset Everything
```powershell
# Stop all services
Get-Process python, node | Stop-Process -Force

# Clear ports
@(3000, 8000, 8080) | ForEach-Object {
    Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
}

# Restart
./start-nexus.bat
```

## 🎨 Customization

### Change Default Model
Edit `.env.local`:
```env
DEFAULT_MODEL=DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf
```

### Disable Auto-load
```env
AUTO_LOAD_MODEL=false
```

### CPU-Only Mode
```env
N_GPU_LAYERS=0
```

### Custom Ports
```env
PORT=8001  # Python server
# Also update PYTHON_SERVER_URL in Node.js section
```

## 📝 Advanced Usage

### Running as Windows Service
```powershell
# Install as service (requires admin)
New-Service -Name "NexusLLM" -BinaryPathName "powershell.exe -File C:\path\to\start-nexus.ps1"
Start-Service NexusLLM
```

### Docker Support
Coming soon - dockerfile in development

### Multi-GPU Setup
Models automatically use all available GPUs when loaded

## 🔄 Updates

To update the startup system:
1. Pull latest changes
2. Delete `.env.local` to regenerate with new options
3. Run `npm install` for new dependencies

## 📞 Support

- Check `STARTUP_GUIDE.md` for usage instructions
- Run `test-nexus.ps1` for diagnostics
- Review logs in PowerShell window
- Check GitHub issues for known problems

---

**Happy coding with your local AI assistant!** 🤖✨
