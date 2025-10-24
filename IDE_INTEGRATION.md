# IDE Integration Guide

Configure your favorite coding IDE to use NexusCore as your local LLM backend.

## 🎯 Overview

NexusCore provides an OpenAI-compatible API endpoint that works with:
- **Cursor** - AI-powered code editor
- **VSCode** with Continue or other OpenAI extensions
- **Warp** - AI terminal
- Any tool that supports OpenAI API format

## Prerequisites

1. NexusCore server running: `npm run dev:all`
2. At least one model loaded via the web interface
3. Model should be ready (status: "Loaded")

---

## 🖥️ Cursor Integration

Cursor has built-in support for custom OpenAI endpoints.

### Setup Steps:

1. Open Cursor Settings (`Cmd/Ctrl + ,`)
2. Search for "OpenAI"
3. Find "OpenAI: Base URL" setting
4. Set it to: `http://localhost:8080`
5. Leave API key blank (not required for local server)

### Alternative Method (settings.json):

```json
{
  "openai.apiBase": "http://localhost:8080",
  "openai.apiKey": "not-needed"
}
```

### Usage:

- Press `Cmd/Ctrl + K` to ask Cursor AI
- All requests will be sent to your local LLM
- Monitor requests in NexusCore dashboard

---

## 💻 VSCode Integration

### Option 1: Continue Extension

1. Install the "Continue" extension
2. Open Continue settings (`~/.continue/config.json`)
3. Add NexusCore as a model provider:

```json
{
  "models": [
    {
      "title": "NexusCore Local",
      "provider": "openai",
      "model": "your-model-name",
      "apiBase": "http://localhost:8080/v1",
      "apiKey": "not-needed"
    }
  ]
}
```

### Option 2: GitHub Copilot Alternative

If you have an OpenAI-compatible VSCode extension:

1. Open VSCode Settings
2. Search for the extension's API settings
3. Set base URL to: `http://localhost:8080`

---

## ⚡ Warp Terminal Integration

Warp supports custom AI backends for terminal assistance.

### Setup:

1. Open Warp settings
2. Navigate to "AI" or "Features" section
3. Find "Custom AI Endpoint" or similar
4. Enter: `http://localhost:8080/v1/chat/completions`
5. Leave API key blank

---

## 🔧 Generic OpenAI-Compatible Tool

For any tool that accepts custom OpenAI endpoints:

```
Base URL: http://localhost:8080
API Key:  (leave blank or use any string)
Model:    (any model name, will auto-route to loaded model)
```

### API Endpoints:

- **Chat Completions**: `POST http://localhost:8080/v1/chat/completions`
- **Completions**: `POST http://localhost:8080/v1/completions`
- **List Models**: `GET http://localhost:8080/v1/models`

---

## 📡 API Request Format

### Chat Completion Request:

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful coding assistant."},
      {"role": "user", "content": "Write a Python function to sort a list"}
    ],
    "temperature": 0.7,
    "max_tokens": 2048
  }'
```

### Response Format:

```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1704067200,
  "model": "codellama-34b",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Here's a Python function to sort a list..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 150,
    "total_tokens": 150
  }
}
```

---

## 🚦 Testing Your Connection

### Test with curl:

```bash
# List available models
curl http://localhost:8080/v1/models

# Send a test request
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello!"}],
    "max_tokens": 50
  }'
```

### Verify in Dashboard:

1. Open NexusCore web interface: http://localhost:3000
2. Go to "Logs" tab
3. You should see your test requests appear in real-time

---

## ⚖️ Load Balancing

NexusCore automatically balances requests across loaded models:

- **Strategy**: Least-requests-in-flight
- **Automatic**: No configuration needed
- **Multi-GPU**: Load is distributed based on current usage

### Example:

If you have 2 models loaded:
1. Model A on GPU 0: 2 requests in flight
2. Model B on GPU 1: 0 requests in flight
3. Next request goes to Model B

---

## 🔍 Troubleshooting

### Issue: "Connection refused"

**Solution:**
- Ensure backend is running: `npm run dev:server`
- Check port 8080 is not blocked by firewall
- Verify with: `curl http://localhost:8080/api/health`

### Issue: "No models currently loaded"

**Solution:**
- Load a model via web interface (Models tab)
- Wait for status to change from "Loading" to "Loaded"
- Check backend logs for errors

### Issue: "Slow responses"

**Solution:**
- Check GPU utilization in Dashboard
- Verify model fits in GPU memory
- Consider using smaller model or lower quantization
- Adjust `contextSize` and `threads` in model loading

### Issue: "IDE not detecting custom endpoint"

**Solution:**
- Restart IDE after changing settings
- Check IDE extension version supports custom endpoints
- Try both `http://localhost:8080` and `http://localhost:8080/v1`
- Some tools require `/v1` path, others don't

---

## 📊 Monitoring Requests

All IDE requests are logged in NexusCore dashboard:

- **Source Detection**: Automatically identifies Cursor/VSCode/Warp
- **Performance Metrics**: Tokens/sec, duration, GPU usage
- **Error Tracking**: Failed requests with error messages
- **Real-time Updates**: Live feed of all requests

---

## 🎛️ Advanced Configuration

### Custom System Prompts:

Configure in Settings tab of web interface:

```
You are an expert software engineer specializing in Python and TypeScript.
Always provide clean, well-documented code with error handling.
```

### Model-Specific Settings:

When loading a model, configure:
- **Context Size**: Default 4096 (increase for longer conversations)
- **Threads**: CPU threads for processing (default 8)
- **GPU Layers**: Number of layers on GPU (99 = all)

### Multiple Models:

Load different models for different purposes:
- Small model (7B) for quick completions
- Large model (34B) for complex reasoning
- Load balancer automatically distributes requests

---

## 💡 Tips & Best Practices

1. **Keep Models Loaded**: Model loading takes time, keep frequently used models in memory

2. **Monitor GPU Memory**: Check Dashboard to avoid OOM errors

3. **Use Appropriate Models**: 
   - Code completion: 7B-13B models
   - Code review: 34B+ models
   - Chat: Any size based on GPU

4. **Test Before Production**: Test with curl before configuring IDE

5. **Watch Logs**: Keep dashboard open to see what's being sent

---

## 📚 Example Prompts

### For Coding Assistants:

```
System: You are a senior software engineer. Write production-ready code.
User: Create a REST API endpoint for user authentication
```

### For Code Review:

```
User: Review this code for security issues and suggest improvements
```

### For Debugging:

```
User: This code throws a TypeError. Help me fix it: [paste code]
```

---

## 🆘 Support

- **Dashboard**: http://localhost:3000
- **API Docs**: This file
- **Logs**: Check Logs tab in dashboard
- **Health Check**: http://localhost:8080/api/health

For issues, check the server logs in your terminal where you ran `npm run dev:server`.

