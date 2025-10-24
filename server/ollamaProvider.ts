import type { Request } from 'express';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export interface OllamaModelInfo {
  id: string;
  name: string;
  size: string;
  quantization: string;
  status: 'Loaded' | 'Unloaded' | 'Loading';
  loadedOnGpuIds: number[];
  path: string | null;
}

function bytesToGB(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 GB';
  return (bytes / (1024 ** 3)).toFixed(1) + ' GB';
}

export async function listModels(): Promise<OllamaModelInfo[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
  if (!res.ok) throw new Error(`Ollama /api/tags failed: ${res.status}`);
  const data: any = await res.json();
  const models = (data.models || []) as any[];
  return models.map((m: any) => ({
    id: m.name,
    name: m.name,
    size: bytesToGB(m.size || 0),
    quantization: 'GGUF',
    status: 'Loaded',
    loadedOnGpuIds: [],
    path: null,
  }));
}

export async function pullModel(name: string): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error(`Ollama pull failed: ${res.status}`);
  // The pull endpoint streams progress lines; we don't need to parse all of them here
}

export async function deleteModel(name: string): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error(`Ollama delete failed: ${res.status}`);
}

export async function chatCompletion(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; maxTokens?: number }
): Promise<{ content: string; tokensPerSecond: number; totalTokens: number }> {
  const start = Date.now();
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
      },
      stream: false,
    })
  });
  if (!res.ok) throw new Error(`Ollama chat failed: ${res.status} ${res.statusText}`);
  const data: any = await res.json();
  const duration = (Date.now() - start) / 1000;
  const totalTokens = data.eval_count || data.response?.length || 0;
  const tps = duration > 0 ? totalTokens / duration : 0;
  const content = data.message?.content ?? data.response ?? '';
  return { content, tokensPerSecond: tps, totalTokens };
}


