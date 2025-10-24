
import React, { useState, useEffect } from 'react';
import type { View as ViewType, GPU, LLMModel, LogEntry, CacheStatus } from './types';
import { View } from './types';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ModelManager } from './components/ModelManager';
import { InferencePanel } from './components/InferencePanel';
import { CacheMonitor } from './components/CacheMonitor';
import { RequestLog } from './components/RequestLog';
import { Settings } from './components/Settings';
import { ErrorDetails } from './components/ErrorDetails';
import * as api from './services/apiService';
import { runIntegrityCheck, logIntegrityCheckResults } from './services/integrityCheck';
import type { IntegrityCheckResult } from './services/integrityCheck';

const generateInitialChartData = (points: number, max: number) => {
    return Array.from({ length: points }, (_, i) => ({
      name: `${(points - i - 1) * 2}s`,
      usage: Math.max(10, Math.random() * max),
      tps: Math.max(20, Math.random() * (max * 3)),
    }));
};


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>(View.Dashboard);
  const [gpus, setGpus] = useState<GPU[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  
  const [tokensPerSecond, setTokensPerSecond] = useState(0);
  const [requestsPerMinute, setRequestsPerMinute] = useState(0);
  const [activeConnections, setActiveConnections] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [integrityCheckPassed, setIntegrityCheckPassed] = useState(false);
  const [serverEndpoint, setServerEndpoint] = useState('localhost:8080');
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const [integrityCheckResult, setIntegrityCheckResult] = useState<IntegrityCheckResult | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const [gpuChartData, setGpuChartData] = useState(generateInitialChartData(15, 85));
  const [tpsChartData, setTpsChartData] = useState(generateInitialChartData(15, 85));
  
  // Initialize memory data with both VRAM and RAM
  useEffect(() => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      name: `${i * 2}s`,
      vram: 0,
      ram: 0
    }));
    setMemoryData(initialData);
  }, []);

  // ========== Integrity Check & Initial Data Fetch ==========
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Run comprehensive integrity check
        console.log('[App] Running integrity check...');
        const integrityResult = await runIntegrityCheck();
        logIntegrityCheckResults(integrityResult);
        
        setIntegrityCheckResult(integrityResult);
        setIntegrityCheckPassed(integrityResult.success);

        if (!integrityResult.success) {
          const errorMessages = integrityResult.summary.errors.join('; ');
          setConnectionError(`⚠️ Integrity check failed: ${errorMessages}`);
          setShowErrorDetails(true);
        }

        // Fetch data regardless of integrity check result
        const [gpusData, modelsData, logsData] = await Promise.all([
          api.fetchGPUs(),
          api.fetchModels(),
          api.fetchLogs(),
        ]);
        
        setGpus(gpusData);
        setModels(modelsData);
        setLogs(logsData);
        setConnectionError(null);
      } catch (error: any) {
        console.error('Error during initialization:', error);
        setConnectionError(`Failed to initialize application: ${error.message}`);
      } finally {
        setIsInitializing(false);
      }
    };

    fetchInitialData();
  }, []);

  // ========== Real-time Data Polling ==========
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [gpusData, statsData, logsData, modelsData, memoryStats] = await Promise.all([
          api.fetchGPUs(),
          api.fetchServerStats(),
          api.fetchLogs(),
          api.fetchModels(),
          fetch('/api/memory-stats').then(r => r.json()).catch(() => ({ system: { percentage: 0 }, vram: { percentage: 0 } })),
        ]);
        
        setGpus(gpusData);
        setLogs(logsData);
        setModels(modelsData);
        setTokensPerSecond(statsData.tokensPerSecond);
        setRequestsPerMinute(statsData.requestsPerMinute);
        setActiveConnections(statsData.activeConnections);
        setServerEndpoint(statsData.serverEndpoint || 'localhost:8080');
        
        // Update cache status (mock implementation)
        setCacheStatus({
          isWarmingUp: false,
          loadedModels: modelsData.filter(m => m.status === 'Loaded').map(m => m.name),
          cachedModels: modelsData.filter(m => m.status === 'Loaded').map(m => ({
            name: m.name,
            size: m.size,
            lastUsed: Date.now(),
          })),
          totalCacheSize: modelsData
            .filter(m => m.status === 'Loaded')
            .reduce((sum, m) => sum + (parseInt(m.size) || 0), 0),
          maxCacheSize: 100,
        });
        
        // Update chart data
        setGpuChartData(prev => {
          const newData = [...prev.slice(1), { 
            name: `${new Date().getSeconds()}s`, 
            usage: Math.round(gpusData.reduce((acc, gpu) => acc + gpu.utilization, 0) / gpusData.length)
          }];
          return newData;
        });
        
        setTpsChartData(prev => {
          const newData = [...prev.slice(1), { 
            name: `${new Date().getSeconds()}s`, 
            tps: statsData.tokensPerSecond
          }];
          return newData;
        });
        
        // Update memory chart data
        setMemoryData(prev => {
          const newData = [...prev.slice(1), { 
            name: `${new Date().getSeconds()}s`, 
            vram: memoryStats.vram?.percentage || 0,
            ram: memoryStats.system?.percentage || 0
          }];
          return newData;
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);
  
  // ========== Model Management Handlers ==========
  const handleLoadModel = async (modelId: string, gpuIds: number[]) => {
    try {
      await api.loadModel(modelId, gpuIds);
      
      const [modelsData, gpusData] = await Promise.all([
        api.fetchModels(),
        api.fetchGPUs(),
      ]);
      setModels(modelsData);
      setGpus(gpusData);
    } catch (error: any) {
      console.error(`Error loading model ${modelId}:`, error);
      alert(`Failed to load model: ${error.message}`);
    }
  };
  
  const handleUnloadModel = async (modelId: string) => {
    try {
      await api.unloadModel(modelId);
      
      const [modelsData, gpusData] = await Promise.all([
        api.fetchModels(),
        api.fetchGPUs(),
      ]);
      setModels(modelsData);
      setGpus(gpusData);
    } catch (error: any) {
      console.error(`Error unloading model ${modelId}:`, error);
      alert(`Failed to unload model: ${error.message}`);
    }
  };

  // ========== Inference Handlers ==========
  const handleInference = async (params: any) => {
    // Implementation for non-streaming inference
    return {
      id: `inference-${Date.now()}`,
      text: 'Mock response',
      tokens: [],
      totalTokens: 0,
      tokensPerSecond: 0,
      elapsedSeconds: 0,
      status: 'success' as const,
    };
  };

  const handleStream = async (params: any, onChunk: (chunk: any) => void) => {
    // Implementation for streaming inference
  };

  const handleClearCache = async () => {
    try {
      await api.clearCache();
      setCacheStatus(prev => prev ? { ...prev, cachedModels: [] } : null);
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  };

  const handleWarmupModel = async (modelName: string) => {
    // Implementation for model warmup
    console.log(`Warming up model: ${modelName}`);
  };

  const renderView = () => {
    if (isInitializing) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin mb-4">
              <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full" />
            </div>
            <p className="text-slate-300">Initializing application...</p>
            <p className="text-sm text-slate-500 mt-2">Running integrity checks</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case View.Dashboard:
        return <Dashboard 
            gpus={gpus} 
            models={models} 
            tps={tokensPerSecond} 
            rpm={requestsPerMinute} 
            connections={activeConnections}
            gpuChartData={gpuChartData}
            tpsChartData={tpsChartData}
            serverEndpoint={serverEndpoint}
            memoryData={memoryData}
        />;
      case View.Models:
        return <ModelManager models={models} gpus={gpus} onLoadModel={handleLoadModel} onUnloadModel={handleUnloadModel} />;
      case View.Inference:
        return <InferencePanel 
          models={models} 
          gpus={gpus} 
          onInference={handleInference}
          onStream={handleStream}
        />;
      case View.Logs:
        return <RequestLog logs={logs} />;
      case View.Settings:
        return <Settings />;
      default:
        return <Dashboard 
            gpus={gpus} 
            models={models} 
            tps={tokensPerSecond} 
            rpm={requestsPerMinute} 
            connections={activeConnections}
            gpuChartData={gpuChartData}
            tpsChartData={tpsChartData}
            serverEndpoint={serverEndpoint}
            memoryData={memoryData}
        />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Integrity Check Warning */}
        {!integrityCheckPassed && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/50 text-yellow-400 px-4 py-3 flex items-center justify-between">
            <span className="text-sm">⚠️ Application integrity check detected issues. See console for details.</span>
            <button 
              onClick={() => setIntegrityCheckPassed(true)} 
              className="text-yellow-400 hover:text-yellow-300 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Connection Error */}
        {connectionError && (
          <div className="bg-red-500/10 border-b border-red-500/50 text-red-400 px-4 py-3 flex items-center justify-between">
            <span className="text-sm">{connectionError}</span>
            <button 
              onClick={() => window.location.reload()} 
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
      </main>

      {/* Error Details Modal */}
      {showErrorDetails && integrityCheckResult && !integrityCheckResult.success && (
        <ErrorDetails
          result={integrityCheckResult}
          onDismiss={() => setShowErrorDetails(false)}
        />
      )}
    </div>
  );
};

export default App;
