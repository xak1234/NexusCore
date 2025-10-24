/**
 * Python Backend Proxy
 * Routes inference requests to the Python GGUF server
 * Eliminates need to install/manage separate llama.cpp binary
 */

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:8000';

export interface ProxyRequest {
  prompt?: string;
  messages?: any[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  model?: string;
}

export interface ProxyResponse {
  id: string;
  choices: any[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  content?: string;
  tokensPerSecond?: number;
  totalTokens?: number;
}

/**
 * Check if Python server is available
 */
export async function isPythonServerAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${PYTHON_SERVER_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Proxy completion request to Python server
 */
export async function proxyCompletion(modelIdOrRequest: string | ProxyRequest, messages?: any[], options?: any): Promise<ProxyResponse> {
  let req: ProxyRequest;
  
  if (typeof modelIdOrRequest === 'string') {
    // New signature: (modelId, messages, options)
    req = {
      model: modelIdOrRequest,
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2048,
    };
  } else {
    // Old signature: (request)
    req = modelIdOrRequest;
  }

  const response = await fetch(`${PYTHON_SERVER_URL}/v1/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    throw new Error(`Python server error: ${response.statusText}`);
  }

  return response.json() as Promise<ProxyResponse>;
}

/**
 * Proxy chat completion request to Python server
 */
export async function proxyChatCompletion(modelIdOrRequest: string | ProxyRequest, messages?: any[], options?: any): Promise<ProxyResponse> {
  let req: ProxyRequest;
  
  if (typeof modelIdOrRequest === 'string') {
    // New signature: (modelId, messages, options)
    req = {
      model: modelIdOrRequest,
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2048,
    };
  } else {
    // Old signature: (request)
    req = modelIdOrRequest;
  }

  const response = await fetch(`${PYTHON_SERVER_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    throw new Error(`Python server error: ${response.statusText}`);
  }

  return response.json() as Promise<ProxyResponse>;
}

/**
 * List available models from Python server
 */
export async function proxyListModels(): Promise<any[]> {
  const response = await fetch(`${PYTHON_SERVER_URL}/v1/models`);

  if (!response.ok) {
    throw new Error(`Python server error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.data || [];
}

/**
 * Stream completion from Python server
 */
export async function* streamCompletion(req: ProxyRequest): AsyncGenerator<string> {
  const response = await fetch(`${PYTHON_SERVER_URL}/v1/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...req, stream: true }),
  });

  if (!response.ok) {
    throw new Error(`Python server error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data) yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
