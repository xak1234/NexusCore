/**
 * CacheMonitor Component
 * 
 * Displays:
 * - Model loading/warmup progress
 * - Cached models with memory usage
 * - Cache hit/miss statistics
 * - Memory management UI
 * - Clearing cache functionality
 */

import React, { useState, useEffect } from 'react';
import type { CacheStatus, LLMModel } from '../types';

interface CacheMonitorProps {
  cacheStatus: CacheStatus | null;
  models: LLMModel[];
  onClearCache?: () => Promise<void>;
  onWarmupModel?: (modelId: string) => Promise<void>;
}

export const CacheMonitor: React.FC<CacheMonitorProps> = ({
  cacheStatus,
  models,
  onClearCache,
  onWarmupModel,
}) => {
  const [isClearing, setIsClearing] = useState(false);
  const [warmingUpModels, setWarmingUpModels] = useState<Set<string>>(new Set());

  if (!cacheStatus) {
    return (
      <div className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50">
        <p className="text-slate-400">Cache status unavailable</p>
      </div>
    );
  }

  const cacheUsagePercent = (cacheStatus.totalCacheSize / cacheStatus.maxCacheSize) * 100;
  const cacheUsageMB = (cacheStatus.totalCacheSize / 1024 / 1024).toFixed(1);
  const maxCacheMB = (cacheStatus.maxCacheSize / 1024 / 1024).toFixed(1);

  const handleClearCache = async () => {
    if (!onClearCache || isClearing) return;
    
    if (!confirm('Clear all cached models? This will free memory but reload times will increase.')) {
      return;
    }

    setIsClearing(true);
    try {
      await onClearCache();
    } catch (err) {
      console.error('Failed to clear cache:', err);
      alert('Failed to clear cache');
    } finally {
      setIsClearing(false);
    }
  };

  const handleWarmupModel = async (modelId: string) => {
    if (!onWarmupModel) return;

    setWarmingUpModels(prev => new Set(prev).add(modelId));
    try {
      await onWarmupModel(modelId);
    } catch (err) {
      console.error('Failed to warmup model:', err);
      alert('Failed to warmup model');
    } finally {
      setWarmingUpModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cache Usage Overview */}
      <div className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Cache Usage</h3>
        
        <div className="space-y-4">
          {/* Usage Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-300">Memory Usage</span>
              <span className="text-sm font-mono bg-slate-700/50 px-2 py-1 rounded text-sky-400">
                {cacheUsageMB} MB / {maxCacheMB} MB
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  cacheUsagePercent > 90
                    ? 'bg-red-500'
                    : cacheUsagePercent > 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(cacheUsagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Warmup Status */}
          {cacheStatus.isWarmingUp && (
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 flex items-center space-x-3">
              <div className="animate-spin">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
              <span className="text-sm text-blue-400">Warming up cache...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-slate-700/50">
            <button
              onClick={handleClearCache}
              disabled={isClearing || cacheStatus.cachedModels.length === 0}
              className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="clear-cache-button"
            >
              {isClearing ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>
        </div>
      </div>

      {/* Cached Models */}
      {cacheStatus.cachedModels.length > 0 && (
        <div className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Cached Models ({cacheStatus.cachedModels.length})</h3>
          
          <div className="space-y-3">
            {cacheStatus.cachedModels.map((cached) => (
              <div
                key={cached.name}
                className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 flex items-start justify-between"
                data-testid={`cached-model-${cached.name}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-100 text-sm">{cached.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Memory: {(cached.memoryUsage / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Last used: {new Date(cached.lastUsed).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => handleWarmupModel(cached.name)}
                  disabled={warmingUpModels.has(cached.name)}
                  className="ml-4 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  data-testid={`warmup-button-${cached.name}`}
                >
                  {warmingUpModels.has(cached.name) ? 'Warming...' : 'Warmup'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loaded Models */}
      {cacheStatus.loadedModels.length > 0 && (
        <div className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Loaded Models ({cacheStatus.loadedModels.length})</h3>
          
          <div className="space-y-2">
            {cacheStatus.loadedModels.map((modelName) => (
              <div
                key={modelName}
                className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm"
                data-testid={`loaded-model-${modelName}`}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-400">{modelName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
