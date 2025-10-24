/**
 * Application Integrity Check System
 * 
 * Validates component initialization and GGUF model support at startup.
 * Runs comprehensive checks to ensure:
 * - All required components are properly mounted
 * - API connectivity is established
 * - GGUF models are accessible
 * - GPU detection works
 * - Cache system is initialized
 */

import type { LLMModel, GPU, CacheStatus, ServerStats } from '../types';
import * as api from './apiService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface IntegrityCheckResult {
  success: boolean;
  timestamp: number;
  checks: {
    apiConnectivity: CheckStatus;
    modelDiscovery: CheckStatus;
    gpuDetection: CheckStatus;
    cacheSystem: CheckStatus;
    ggufSupport: CheckStatus;
    serverHealth: CheckStatus;
  };
  summary: {
    passedChecks: number;
    totalChecks: number;
    warnings: string[];
    errors: string[];
  };
}

export interface CheckStatus {
  passed: boolean;
  duration: number;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// Integrity Check Functions
// ============================================================================

/**
 * Check API connectivity to backend server
 */
async function checkAPIConnectivity(): Promise<CheckStatus> {
  const start = performance.now();

  try {
    const health = await api.fetchServerStats();
    const duration = performance.now() - start;

    return {
      passed: true,
      duration,
      message: 'API server is reachable and responding',
      details: {
        tokensPerSecond: health.tokensPerSecond,
        activeConnections: health.activeConnections,
      },
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      passed: false,
      duration,
      message: `API connectivity failed: ${error.message}`,
      details: { error: error.toString() },
    };
  }
}

/**
 * Check if GGUF models are discoverable
 */
async function checkModelDiscovery(): Promise<CheckStatus> {
  const start = performance.now();

  try {
    const models = await api.fetchModels();
    const duration = performance.now() - start;

    if (!models || models.length === 0) {
      return {
        passed: false,
        duration,
        message: 'No GGUF models found in model directory',
        details: { modelCount: 0 },
      };
    }

    const ggufModels = models.filter(m => m.isGGUF);
    const loadedModels = models.filter(m => m.status === 'Loaded');

    return {
      passed: true,
      duration,
      message: `Found ${models.length} GGUF models (${loadedModels.length} loaded)`,
      details: {
        totalModels: models.length,
        ggufModels: ggufModels.length,
        loadedModels: loadedModels.length,
        models: models.map(m => ({
          name: m.name,
          size: m.size,
          status: m.status,
          quantization: m.quantization,
        })),
      },
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      passed: false,
      duration,
      message: `Model discovery failed: ${error.message}`,
      details: { error: error.toString() },
    };
  }
}

/**
 * Check GPU availability and detection
 */
async function checkGPUDetection(): Promise<CheckStatus> {
  const start = performance.now();

  try {
    const gpus = await api.fetchGPUs();
    const duration = performance.now() - start;

    if (!gpus || gpus.length === 0) {
      return {
        passed: true, // GPU detection can pass even with 0 GPUs (CPU-only setup is valid)
        duration,
        message: 'CPU-only setup detected (no GPUs available)',
        details: { gpuCount: 0 },
      };
    }

    const cudaGpus = gpus.filter(g => g.deviceType === 'CUDA');
    const metalGpus = gpus.filter(g => g.deviceType === 'Metal');
    const rocmGpus = gpus.filter(g => g.deviceType === 'ROCm');

    return {
      passed: true,
      duration,
      message: `Found ${gpus.length} GPU(s) available for inference`,
      details: {
        totalGPUs: gpus.length,
        cudaGpus: cudaGpus.length,
        metalGpus: metalGpus.length,
        rocmGpus: rocmGpus.length,
        gpus: gpus.map(g => ({
          id: g.id,
          name: g.name,
          deviceType: g.deviceType,
          memory: `${g.memoryUsed}/${g.memoryTotal}GB`,
        })),
      },
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      passed: false,
      duration,
      message: `GPU detection failed: ${error.message}`,
      details: { error: error.toString() },
    };
  }
}

/**
 * Check cache system initialization
 */
async function checkCacheSystem(): Promise<CheckStatus> {
  const start = performance.now();

  try {
    // Verify localStorage is available
    if (!window.localStorage) {
      throw new Error('localStorage not available');
    }

    const testKey = '__integrity_check_cache__';
    localStorage.setItem(testKey, 'test');
    const testValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    if (testValue !== 'test') {
      throw new Error('localStorage read/write test failed');
    }

    const duration = performance.now() - start;

    return {
      passed: true,
      duration,
      message: 'Cache system (localStorage) is operational',
      details: {
        storageAvailable: true,
        readWriteTest: 'passed',
      },
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      passed: false,
      duration,
      message: `Cache system check failed: ${error.message}`,
      details: { error: error.toString() },
    };
  }
}

/**
 * Check GGUF support and model compatibility
 */
async function checkGGUFSupport(): Promise<CheckStatus> {
  const start = performance.now();

  try {
    const models = await api.fetchModels();
    const duration = performance.now() - start;

    if (!models || models.length === 0) {
      return {
        passed: false,
        duration,
        message: 'No models available to check GGUF support',
        details: { modelCount: 0 },
      };
    }

    const ggufModels = models.filter(m => m.isGGUF !== false);
    const quantizedModels = models.filter(
      m =>
        m.quantization &&
        ['Q4_K_M', 'Q4_K_S', 'Q5_K_M', 'Q8_0', 'F16', 'F32'].some(q =>
          m.quantization?.includes(q)
        )
    );

    if (ggufModels.length === 0) {
      return {
        passed: false,
        duration,
        message: 'No GGUF models detected in model directory',
        details: { ggufModelCount: 0 },
      };
    }

    return {
      passed: true,
      duration,
      message: `GGUF support verified: ${ggufModels.length} GGUF models detected`,
      details: {
        ggufModels: ggufModels.length,
        quantizedModels: quantizedModels.length,
        supportedQuantizations: [
          'Q4_K_M',
          'Q4_K_S',
          'Q5_K_M',
          'Q8_0',
          'F16',
          'F32',
        ],
        models: ggufModels.map(m => ({
          name: m.name,
          quantization: m.quantization,
          contextLength: m.contextLength || 'unknown',
        })),
      },
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      passed: false,
      duration,
      message: `GGUF support check failed: ${error.message}`,
      details: { error: error.toString() },
    };
  }
}

/**
 * Check server health and performance metrics
 */
async function checkServerHealth(): Promise<CheckStatus> {
  const start = performance.now();

  try {
    const stats = await api.fetchServerStats();
    const duration = performance.now() - start;

    const issues: string[] = [];

    // Check for concerning metrics
    if (stats.errorCount > 10) {
      issues.push(`High error count: ${stats.errorCount}`);
    }
    if (stats.averageLatency > 5000) {
      issues.push(`High average latency: ${stats.averageLatency}ms`);
    }

    const passed = issues.length === 0;

    return {
      passed,
      duration,
      message: passed
        ? 'Server is healthy'
        : `Server has potential issues: ${issues.join(', ')}`,
      details: {
        tokensPerSecond: stats.tokensPerSecond,
        requestsPerMinute: stats.requestsPerMinute,
        activeConnections: stats.activeConnections,
        errorCount: stats.errorCount,
        averageLatency: stats.averageLatency,
        uptime: stats.uptime,
        issues,
      },
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      passed: false,
      duration,
      message: `Server health check failed: ${error.message}`,
      details: { error: error.toString() },
    };
  }
}

// ============================================================================
// Main Integrity Check Function
// ============================================================================

/**
 * Run all integrity checks
 * 
 * Executes all component checks in parallel and aggregates results
 */
export async function runIntegrityCheck(): Promise<IntegrityCheckResult> {
  console.log('[Integrity Check] Starting application integrity validation...');

  const startTime = performance.now();

  const results = await Promise.all([
    checkAPIConnectivity(),
    checkModelDiscovery(),
    checkGPUDetection(),
    checkCacheSystem(),
    checkGGUFSupport(),
    checkServerHealth(),
  ]);

  const [
    apiCheck,
    modelCheck,
    gpuCheck,
    cacheCheck,
    ggufCheck,
    serverCheck,
  ] = results;

  const passedChecks = results.filter(r => r.passed).length;
  const totalChecks = results.length;

  const warnings: string[] = [];
  const errors: string[] = [];

  // Aggregate issues
  if (!apiCheck.passed) errors.push(apiCheck.message);
  if (!modelCheck.passed) errors.push(modelCheck.message);
  if (!gpuCheck.passed) warnings.push(gpuCheck.message);
  if (!cacheCheck.passed) errors.push(cacheCheck.message);
  if (!ggufCheck.passed) errors.push(ggufCheck.message);
  if (!serverCheck.passed) warnings.push(serverCheck.message);

  const success = errors.length === 0;

  const result: IntegrityCheckResult = {
    success,
    timestamp: Date.now(),
    checks: {
      apiConnectivity: apiCheck,
      modelDiscovery: modelCheck,
      gpuDetection: gpuCheck,
      cacheSystem: cacheCheck,
      ggufSupport: ggufCheck,
      serverHealth: serverCheck,
    },
    summary: {
      passedChecks,
      totalChecks,
      warnings,
      errors,
    },
  };

  // Log results
  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`[Integrity Check] Completed in ${duration}s`);
  console.log(`[Integrity Check] Status: ${success ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(
    `[Integrity Check] Checks: ${passedChecks}/${totalChecks} passed`
  );

  if (warnings.length > 0) {
    console.warn('[Integrity Check] Warnings:', warnings);
  }

  if (errors.length > 0) {
    console.error('[Integrity Check] Errors:', errors);
  }

  return result;
}

/**
 * Log integrity check results to console
 */
export function logIntegrityCheckResults(result: IntegrityCheckResult): void {
  console.group('[Integrity Check] Detailed Results');

  Object.entries(result.checks).forEach(([checkName, checkStatus]) => {
    const status = checkStatus.passed ? '✓' : '✗';
    const duration = checkStatus.duration.toFixed(2);
    console.log(
      `${status} ${checkName} (${duration}ms): ${checkStatus.message}`
    );

    if (checkStatus.details) {
      console.table(checkStatus.details);
    }
  });

  console.log(`\nSummary: ${result.summary.passedChecks}/${result.summary.totalChecks} checks passed`);

  if (result.summary.warnings.length > 0) {
    console.warn('Warnings:', result.summary.warnings);
  }

  if (result.summary.errors.length > 0) {
    console.error('Errors:', result.summary.errors);
  }

  console.groupEnd();
}
