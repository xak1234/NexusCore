import express, { Request, Response } from 'express';
import cors from 'cors';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { 
  isPythonServerAvailable, 
  proxyCompletion, 
  proxyChatCompletion, 
  proxyListModels,
  streamCompletion 
} from './pythonBackendProxy.js';

const execAsync = promisify(exec);

// Load environment variables (supports .env.local)
try {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fsSync.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  } else {
    dotenv.config();
  }
} catch (e) {
  // ignore env load errors, fallback to process.env
}
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Production-grade storage
interface ModelInstance {
  modelId: string;
  gpuIds: number[];
  status: 'loading' | 'ready' | 'error';
  tokensPerSecond: number;
  requestsInFlight: number;
  totalRequests: number;
}

interface RequestLog {
  id: string;
  timestamp: string;
  source: string;
  prompt: string;
  response: string;
  status: 'Success' | 'Error';
  tokensPerSecond: number;
  modelId?: string;
  gpuIds?: number[];
  duration?: number;
}

let requestLogs: any[] = [];
let loadedModels: Map<string, ModelInstance> = new Map();
let activeConnections = 0;
let pythonServerHealthy = false;

// Check Python server on startup
async function checkPythonServer() {
  try {
    pythonServerHealthy = await isPythonServerAvailable();
    if (pythonServerHealthy) {
      console.log('✅ Python GGUF server is available');
    } else {
      console.warn('⚠️  Python GGUF server not responding');
    }
  } catch (e) {
    pythonServerHealthy = false;
  }
}

checkPythonServer();
setInterval(checkPythonServer, 10000);

// Models API
app.get('/api/models', async (req: Request, res: Response) => {
  try {
    if (!pythonServerHealthy) {
      return res.status(503).json({ error: 'Python server unavailable' });
    }

    const models = await proxyListModels();
    const formattedModels = models.map((m: any) => ({
      id: m.name.replace('.gguf', ''),
      name: m.name,
      size: `${(m.size_bytes / (1024 ** 3)).toFixed(1)} GB`,
      quantization: m.name.includes('Q4') ? 'Q4_K_M' : m.name.includes('Q8') ? 'Q8_0' : 'F16',
      status: loadedModels.get(m.name)?.status === 'ready' ? 'Loaded' : 'Unloaded',
      loadedOnGpuIds: [],
    }));

    res.json(formattedModels);
  } catch (error: any) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: error.message });
  }
});

// Load Model API
app.post('/api/models/:modelId/load', async (req: Request, res: Response) => {
  const { modelId } = req.params;
  const { gpuIds } = req.body;

  try {
    if (!pythonServerHealthy) {
      return res.status(503).json({ error: 'Python server unavailable' });
    }

    loadedModels.set(modelId, {
      modelId,
      gpuIds: gpuIds || [0],
      status: 'ready',
      tokensPerSecond: 0,
      requestsInFlight: 0,
      totalRequests: 0,
    });

    res.json({ status: 'loaded', modelId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unload Model API
app.post('/api/models/:modelId/unload', async (req: Request, res: Response) => {
  const { modelId } = req.params;

  try {
    loadedModels.delete(modelId);
    res.json({ status: 'unloaded', modelId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GPU Info API (mock since Python server handles GPU)
app.get('/api/gpus', async (req: Request, res: Response) => {
  try {
    res.json([
      {
        id: 0,
        name: 'GPU (managed by Python server)',
        utilization: 0,
        memoryUsed: 0,
        memoryTotal: 24,
        temperature: 0,
        loadedModelId: null,
      },
    ]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Server Stats API
app.get('/api/server-stats', async (req: Request, res: Response) => {
  res.json({
    tokensPerSecond: 0,
    requestsPerMinute: 0,
    activeConnections,
    totalRequests: requestLogs.length,
    errorCount: requestLogs.filter(l => l.status === 'Error').length,
    averageLatency: 0,
    uptime: process.uptime(),
  });
});

// Request Logs API
app.get('/api/logs', (req: Request, res: Response) => {
  res.json(requestLogs.slice(-100));
});

// Add a request log (called by LLM server after each request)
app.post('/api/logs', (req: Request, res: Response) => {
  const log = {
    id: `log${Date.now()}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ...req.body,
  };
  
  requestLogs.unshift(log);
  if (requestLogs.length > 100) {
    requestLogs = requestLogs.slice(0, 100);
  }
  
  res.json({ success: true, logId: log.id });
});

// Inference API - Proxy to Python server
app.post('/api/inference', async (req: Request, res: Response) => {
  activeConnections++;

  try {
    if (!pythonServerHealthy) {
      return res.status(503).json({ error: 'Python server unavailable' });
    }

    const { prompt, model, max_tokens, temperature, top_p, top_k, stream } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const chunk of streamCompletion({
          prompt,
          model,
          max_tokens: max_tokens || 128,
          temperature: temperature || 0.7,
          top_p: top_p || 0.9,
          top_k: top_k || 40,
          stream: true,
        })) {
          res.write(`data: ${chunk}\n\n`);
        }
        res.end();
      } catch (error: any) {
        res.write(`data: {"error": "${error.message}"}\n\n`);
        res.end();
      }
    } else {
      const result = await proxyCompletion({
        prompt,
        model,
        max_tokens: max_tokens || 128,
        temperature: temperature || 0.7,
        top_p: top_p || 0.9,
        top_k: top_k || 40,
        stream: false,
      });

      res.json(result);
    }
  } catch (error: any) {
    console.error('Inference error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    activeConnections--;
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: pythonServerHealthy ? 'ok' : 'degraded',
    pythonServer: pythonServerHealthy ? 'available' : 'unavailable',
  });
});

// ============================================================================
// OpenAI-Compatible API Endpoints (for IDE Integration)
// ============================================================================

/**
 * Load Balancer: Select the best model instance based on current load
 */
function selectModelForRequest(): ModelInstance | null {
  const availableModels = Array.from(loadedModels.values()).filter(m => m.status === 'ready');
  
  if (availableModels.length === 0) {
    return null;
  }
  
  // Load balancing strategy: Choose model with lowest requests in flight
  availableModels.sort((a, b) => a.requestsInFlight - b.requestsInFlight);
  
  return availableModels[0];
}

/**
 * OpenAI-compatible chat completions endpoint
 * Compatible with Cursor, VSCode Copilot, and other OpenAI-compatible clients
 */
app.post('/v1/chat/completions', async (req: Request, res: Response) => {
  const { messages, temperature, max_tokens, stream, model: requestedModel } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  
  try {
    // Select model using load balancer
    const modelInstance = selectModelForRequest();
    
    if (!modelInstance) {
      return res.status(503).json({ 
        error: 'No models currently loaded. Please load a model first.' 
      });
    }
    
    const startTime = Date.now();
    modelInstance.requestsInFlight++;
    
    // Import backend-specific functions
    let result: { content: string; tokensPerSecond: number; totalTokens: number };
    if (pythonServerHealthy) {
      const r = await proxyChatCompletion(modelInstance.modelId, messages, {
        temperature: temperature || 0.7,
        maxTokens: max_tokens || 2048,
      });
      const content = r.choices?.[0]?.message?.content || r.content || '';
      const totalTokens = r.usage?.total_tokens || r.totalTokens || 0;
      result = { content, tokensPerSecond: r.tokensPerSecond || 0, totalTokens };
    } else {
      result = { content: 'Python server unavailable', tokensPerSecond: 0, totalTokens: 0 };
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Update model stats
    modelInstance.requestsInFlight--;
    modelInstance.totalRequests++;
    modelInstance.tokensPerSecond = result.tokensPerSecond;
    
    // Log the request
    const logEntry: RequestLog = {
      id: `log${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source: req.headers['user-agent']?.includes('cursor') ? 'Cursor' : 
              req.headers['user-agent']?.includes('vscode') ? 'VSCode' : 'WebUI',
      prompt: messages[messages.length - 1]?.content || '',
      response: result.content,
      status: 'Success',
      tokensPerSecond: result.tokensPerSecond,
      modelId: modelInstance.modelId,
      gpuIds: modelInstance.gpuIds,
      duration,
    };
    
    requestLogs.unshift(logEntry);
    if (requestLogs.length > 100) {
      requestLogs = requestLogs.slice(0, 100);
    }
    
    // Return OpenAI-compatible response
    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelInstance.modelId,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: result.content,
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0, // llama.cpp doesn't always provide this
        completion_tokens: result.totalTokens,
        total_tokens: result.totalTokens,
      },
    });
    
  } catch (error: any) {
    console.error('Error in chat completion:', error);
    
    // Log the error
    requestLogs.unshift({
      id: `log${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source: 'WebUI',
      prompt: messages[messages.length - 1]?.content || '',
      response: `Error: ${error.message}`,
      status: 'Error',
      tokensPerSecond: 0,
    });
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * OpenAI-compatible completions endpoint (legacy)
 */
app.post('/v1/completions', async (req: Request, res: Response) => {
  const { prompt, temperature, max_tokens } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  
  try {
    const modelInstance = selectModelForRequest();
    
    if (!modelInstance) {
      return res.status(503).json({ error: 'No models currently loaded' });
    }
    
    modelInstance.requestsInFlight++;
    
    let result: { text: string; tokensPerSecond: number; totalTokens: number };
    if (pythonServerHealthy) {
      const r = await proxyCompletion(modelInstance.modelId, [{ role: 'user', content: prompt }], {
        temperature: temperature || 0.7,
        maxTokens: max_tokens || 2048,
      });
      const text = r.choices?.[0]?.message?.content || r.content || '';
      const totalTokens = r.usage?.total_tokens || r.totalTokens || 0;
      result = { text, tokensPerSecond: r.tokensPerSecond || 0, totalTokens };
    } else {
      result = { text: 'Python server unavailable', tokensPerSecond: 0, totalTokens: 0 };
    }
    
    modelInstance.requestsInFlight--;
    modelInstance.totalRequests++;
    modelInstance.tokensPerSecond = result.tokensPerSecond;
    
    res.json({
      id: `cmpl-${Date.now()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: modelInstance.modelId,
      choices: [{
        text: result.text,
        index: 0,
        finish_reason: 'stop',
      }],
      usage: {
        total_tokens: result.totalTokens,
      },
    });
    
  } catch (error: any) {
    console.error('Error in completion:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List available models (OpenAI-compatible)
 */
app.get('/v1/models', async (req: Request, res: Response) => {
  try {
    const models = await proxyListModels();
    
    res.json({
      object: 'list',
      data: models.map((m: any) => ({
        id: m.name.replace('.gguf', ''),
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'nexuscore',
        permission: [],
        root: m.name,
        parent: null,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`🚀 Node.js proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying to Python server at ${process.env.PYTHON_SERVER_URL || 'http://localhost:8000'}`);
  console.log(`   Make sure Python GGUF server is running: python -m python_server.main`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  // Stop all loaded models
  // No explicit stop needed for Python server, it's a proxy
  
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;

