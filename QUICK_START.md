# Quick Start Guide

Get NexusCore LLM Server running in 5 minutes!

## Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js version (needs v18+)
node --version

# Check if nvidia-smi works (optional but recommended)
nvidia-smi

# Check if you have npm
npm --version
```

## Installation (3 Steps)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Create Environment File

Create a file named `.env.local` in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_URL=http://localhost:8080/api
PORT=8080
MODEL_PATH=./models
```

> **Get Gemini API Key:** https://makersuite.google.com/app/apikey (it's free!)

### Step 3: Start the Application

```bash
npm run dev:all
```

This starts both frontend (port 3000) and backend (port 8080).

## Access the Application

Open your browser to: **http://localhost:3000**

You should see:
- ✅ Dashboard with GPU status
- ✅ Real-time metrics
- ✅ Model management interface

## What If It Doesn't Work?

### Problem: "Failed to connect to backend server"

**Solution:**
```bash
# Kill any process using port 8080
# Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:8080 | xargs kill -9

# Restart
npm run dev:all
```

### Problem: "Gemini API errors"

**Solution:**
- Double-check your API key in `.env.local`
- Make sure it's a Gemini key, not OpenAI
- Verify no extra spaces before/after the key

### Problem: "GPU shows mock data"

**Solution:**
- This is normal if you don't have NVIDIA GPUs
- The app works fine with mock data for testing
- To get real GPU data, install NVIDIA drivers and ensure `nvidia-smi` works

## Next Steps

1. **Add Models** (Optional)
   ```bash
   mkdir models
   # Copy your .gguf files to models directory
   ```

2. **Explore Features**
   - Try the drag-and-drop dashboard widgets
   - Load/unload models
   - Use Gemini to analyze logs

3. **Customize**
   - Edit system prompts in Settings
   - Configure model storage path
   - Adjust polling intervals in `App.tsx`

## Development Tips

**Run frontend only:**
```bash
npm run dev
```

**Run backend only:**
```bash
npm run dev:server
```

**Build for production:**
```bash
npm run build
npm run build:server
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start frontend + backend |
| `npm run dev` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run build` | Build frontend |
| `npm run build:server` | Build backend |

## Getting Help

1. Check [README.md](README.md) for full documentation
2. See [ENV_SETUP.md](ENV_SETUP.md) for environment configuration
3. Review [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for technical details

---

**That's it! You're ready to manage your LLM models.** 🚀

