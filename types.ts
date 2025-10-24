
export enum View {
  Dashboard = 'DASHBOARD',
  Models = 'MODELS',
  Inference = 'INFERENCE',
  Logs = 'LOGS',
  Settings = 'SETTINGS',
}

export interface GPU {
  id: number;
  name: string;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  loadedModelId: string | null;
  computeCapability?: string;
  deviceType?: 'CUDA' | 'CPU' | 'Metal' | 'ROCm';
}

// ============================================================================
// GGUF Model Types
// ============================================================================

export interface GGUFModelInfo {
  name: string;
  size_bytes: number;
  type: string;
  created: number;
  quantization?: string;
  parameters?: string;
}

export interface LLMModel {
  id: string;
  name: string;
  size: string;
  quantization: string;
  status: 'Loaded' | 'Unloaded';
  loadedOnGpuIds: number[];
  // GGUF-specific fields
  ggufPath?: string;
  isGGUF?: boolean;
  contextLength?: number;
  maxTokens?: number;
}

// ============================================================================
// Inference Configuration Types
// ============================================================================

export interface InferenceParams {
  prompt: string;
  modelId: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  stream: boolean;
  useGPU: boolean;
}

export interface StreamChunk {
  token: string;
  tokensGenerated: number;
  timestamp: number;
  elapsed: number;
}

export interface InferenceResult {
  id: string;
  text: string;
  tokens: StreamChunk[];
  totalTokens: number;
  tokensPerSecond: number;
  elapsedSeconds: number;
  status: 'success' | 'error';
  error?: string;
}

// ============================================================================
// Cache & Warmup Types
// ============================================================================

export interface CacheStatus {
  isWarmingUp: boolean;
  loadedModels: string[];
  cachedModels: {
    name: string;
    memoryUsage: number;
    lastUsed: number;
  }[];
  totalCacheSize: number;
  maxCacheSize: number;
}

// ============================================================================
// Request Logging Types
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'VSCode' | 'Cursor' | 'Warp' | 'WebUI' | 'API';
  model: string;
  prompt: string;
  response: string;
  tokensPerSecond: number;
  status: 'Success' | 'Error' | 'Running';
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  temperature?: number;
  totalDuration?: number;
}

// ============================================================================
// Server Statistics Types
// ============================================================================

export interface ServerStats {
  tokensPerSecond: number;
  requestsPerMinute: number;
  activeConnections: number;
  totalRequests: number;
  errorCount: number;
  averageLatency: number;
  uptime: number;
}
