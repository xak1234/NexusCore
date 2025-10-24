import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface LlamaServerConfig {
  modelPath: string;
  gpuIds: number[];
  port: number;
  contextSize?: number;
  threads?: number;
  ngl?: number; // GPU layers
}

export interface LlamaServerInstance {
  process: ChildProcess;
  port: number;
  modelPath: string;
  gpuIds: number[];
  status: 'starting' | 'ready' | 'error';
}

/**
 * Start a llama.cpp server instance
 * Requires llama.cpp to be installed with the server binary
 */
export async function startLlamaServer(config: LlamaServerConfig): Promise<LlamaServerInstance> {
  const {
    modelPath,
    gpuIds,
    port,
    contextSize = 4096,
    threads = 8,
    ngl = 99, // Offload all layers to GPU by default
  } = config;

  // Resolve llama.cpp server binary
  let llamaServerPath = process.env.LLAMA_SERVER_PATH || 'llama-server';

  // If absolute/relative path provided, verify existence directly
  const looksLikePath = llamaServerPath.includes('/') || llamaServerPath.includes('\\') || llamaServerPath.endsWith('.exe');
  if (looksLikePath) {
    const resolved = path.isAbsolute(llamaServerPath)
      ? llamaServerPath
      : path.resolve(process.cwd(), llamaServerPath);
    if (!fs.existsSync(resolved)) {
      console.error(`❌ llama-server not found at path: ${resolved}`);
      console.error('   Set LLAMA_SERVER_PATH to the full path of llama-server');
      throw new Error('llama-server binary not found at specified path');
    }
    llamaServerPath = resolved;
  } else {
    // Otherwise, look up in PATH using platform-appropriate command
    const checkCmd = process.platform === 'win32'
      ? `where ${llamaServerPath}.exe 2> NUL || where ${llamaServerPath} 2> NUL`
      : `command -v ${llamaServerPath} || which ${llamaServerPath}`;
    try {
      await execAsync(checkCmd);
    } catch {
      console.error('❌ llama-server not found in PATH');
      console.error('   Install llama.cpp and ensure llama-server is in PATH');
      console.error('   Or set LLAMA_SERVER_PATH environment variable to the full path');
      throw new Error('llama-server binary not found');
    }
  }

  // Build GPU device list for CUDA
  const cudaDevices = gpuIds.join(',');
  
  console.log(`🚀 Starting llama.cpp server on port ${port}`);
  console.log(`   Model: ${modelPath}`);
  console.log(`   GPUs: ${cudaDevices}`);
  console.log(`   Context: ${contextSize}, Threads: ${threads}, GPU Layers: ${ngl}`);

  const args = [
    '--model', modelPath,
    '--port', port.toString(),
    '--ctx-size', contextSize.toString(),
    '--threads', threads.toString(),
    '--n-gpu-layers', ngl.toString(),
    '--host', '0.0.0.0',
    '--parallel', '4', // Handle multiple requests
    '--cont-batching', // Continuous batching for better throughput
  ];

  const env = {
    ...process.env,
    CUDA_VISIBLE_DEVICES: cudaDevices,
  };

  const llamaProcess = spawn(llamaServerPath, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const instance: LlamaServerInstance = {
    process: llamaProcess,
    port,
    modelPath,
    gpuIds,
    status: 'starting',
  };

  // Monitor stdout for "HTTP server listening"
  llamaProcess.stdout?.on('data', (data: Buffer) => {
    const output = data.toString();
    console.log(`[llama-server:${port}] ${output.trim()}`);
    
    if (output.includes('HTTP server listening') || output.includes('server is listening')) {
      instance.status = 'ready';
      console.log(`✅ llama.cpp server ready on port ${port}`);
    }
  });

  llamaProcess.stderr?.on('data', (data: Buffer) => {
    const output = data.toString();
    if (output.includes('error') || output.includes('failed')) {
      console.error(`[llama-server:${port} ERROR] ${output.trim()}`);
      instance.status = 'error';
    } else {
      console.log(`[llama-server:${port}] ${output.trim()}`);
    }
  });

  llamaProcess.on('exit', (code) => {
    console.log(`⚠️  llama-server on port ${port} exited with code ${code}`);
    instance.status = 'error';
  });

  // Wait for server to be ready (max 30 seconds)
  const startTime = Date.now();
  while (instance.status === 'starting' && Date.now() - startTime < 30000) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (instance.status !== 'ready') {
    llamaProcess.kill();
    throw new Error('Failed to start llama.cpp server within 30 seconds');
  }

  return instance;
}

/**
 * Stop a llama.cpp server instance
 */
export async function stopLlamaServer(instance: LlamaServerInstance): Promise<void> {
  return new Promise((resolve) => {
    if (!instance.process.killed) {
      instance.process.once('exit', () => {
        console.log(`✅ llama-server on port ${instance.port} stopped`);
        resolve();
      });
      
      instance.process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (!instance.process.killed) {
          instance.process.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    } else {
      resolve();
    }
  });
}

/**
 * Send a completion request to llama.cpp server
 */
export async function sendCompletionRequest(
  port: number,
  prompt: string,
  options: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stop?: string[];
  } = {}
): Promise<{ text: string; tokensPerSecond: number; totalTokens: number }> {
  const {
    temperature = 0.7,
    topP = 0.9,
    maxTokens = 2048,
    stop = [],
  } = options;

  const startTime = Date.now();

  try {
    const response = await fetch(`http://localhost:${port}/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        temperature,
        top_p: topP,
        n_predict: maxTokens,
        stop,
      }),
    });

    if (!response.ok) {
      throw new Error(`llama-server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = (Date.now() - startTime) / 1000;
    const totalTokens = data.tokens_predicted || 0;
    const tokensPerSecond = totalTokens / duration;

    return {
      text: data.content || '',
      tokensPerSecond,
      totalTokens,
    };
  } catch (error: any) {
    console.error(`Error calling llama-server on port ${port}:`, error.message);
    throw error;
  }
}

/**
 * Send a chat completion request (OpenAI-compatible format)
 */
export async function sendChatCompletionRequest(
  port: number,
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stream?: boolean;
  } = {}
): Promise<{ content: string; tokensPerSecond: number; totalTokens: number }> {
  const {
    temperature = 0.7,
    topP = 0.9,
    maxTokens = 2048,
    stream = false,
  } = options;

  const startTime = Date.now();

  try {
    const response = await fetch(`http://localhost:${port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream,
      }),
    });

    if (!response.ok) {
      throw new Error(`llama-server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = (Date.now() - startTime) / 1000;
    const totalTokens = data.usage?.total_tokens || 0;
    const tokensPerSecond = totalTokens / duration;

    return {
      content: data.choices[0]?.message?.content || '',
      tokensPerSecond,
      totalTokens,
    };
  } catch (error: any) {
    console.error(`Error calling llama-server on port ${port}:`, error.message);
    throw error;
  }
}

