import type { GPU, LLMModel, LogEntry } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Error handling helper
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// GPU APIs
export async function fetchGPUs(): Promise<GPU[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/gpus`);
    return handleResponse<GPU[]>(response);
  } catch (error) {
    console.error('Error fetching GPUs:', error);
    throw error;
  }
}

// Model APIs
export async function fetchModels(): Promise<LLMModel[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/models`);
    return handleResponse<LLMModel[]>(response);
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}

export async function loadModel(modelId: string, gpuIds: number[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/models/${modelId}/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gpuIds }),
    });
    await handleResponse(response);
  } catch (error) {
    console.error(`Error loading model ${modelId}:`, error);
    throw error;
  }
}

export async function unloadModel(modelId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/models/${modelId}/unload`, {
      method: 'POST',
    });
    await handleResponse(response);
  } catch (error) {
    console.error(`Error unloading model ${modelId}:`, error);
    throw error;
  }
}

// Log APIs
export async function fetchLogs(): Promise<LogEntry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/logs`);
    return handleResponse<LogEntry[]>(response);
  } catch (error) {
    console.error('Error fetching logs:', error);
    throw error;
  }
}

export async function addLog(logEntry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    });
    await handleResponse(response);
  } catch (error) {
    console.error('Error adding log:', error);
    throw error;
  }
}

// Stats APIs
export interface ServerStats {
  tokensPerSecond: number;
  requestsPerMinute: number;
  activeConnections: number;
  totalRequests: number;
}

export async function fetchServerStats(): Promise<ServerStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    return handleResponse<ServerStats>(response);
  } catch (error) {
    console.error('Error fetching server stats:', error);
    throw error;
  }
}

// Health check
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
}

