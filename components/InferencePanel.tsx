/**
 * InferencePanel Component
 * 
 * Provides user interface for:
 * - Model selection (with GGUF validation)
 * - Parameter controls (temperature, top-p, top-k, repeat penalty)
 * - CPU/GPU selection
 * - Prompt input and submission
 * - Streaming output display with real-time token visualization
 * - Error handling and recovery
 */

import React, { useState, useRef, useEffect } from 'react';
import type { LLMModel, GPU, InferenceParams, StreamChunk, InferenceResult } from '../types';
import { BoltIcon, ExclamationIcon } from './Icons';

interface InferencePanelProps {
  models: LLMModel[];
  gpus: GPU[];
  onInference: (params: InferenceParams) => Promise<InferenceResult>;
  onStream?: (params: InferenceParams, onChunk: (chunk: StreamChunk) => void) => Promise<void>;
}

const ParameterSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  tooltip?: string;
}> = ({ label, value, min, max, step, onChange, tooltip }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <span className="text-sm font-mono bg-slate-700/50 px-2 py-1 rounded text-sky-400">
        {value.toFixed(step < 1 ? 2 : 0)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
      title={tooltip}
    />
    <div className="flex justify-between text-xs text-slate-500">
      <span>{min}</span>
      <span>{max}</span>
    </div>
  </div>
);

export const InferencePanel: React.FC<InferencePanelProps> = ({
  models,
  gpus,
  onInference,
  onStream,
}) => {
  // ========== State Management ==========
  const [selectedModel, setSelectedModel] = useState<string>(
    models.find(m => m.status === 'Loaded')?.id || models[0]?.id || ''
  );
  
  const [prompt, setPrompt] = useState('');
  const [useStreaming, setUseStreaming] = useState(true);
  const [useGPU, setUseGPU] = useState(gpus.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [streamChunks, setStreamChunks] = useState<StreamChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Model parameters (GGUF-specific)
  const [params, setParams] = useState({
    maxTokens: 128,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
  });

  // Auto-scroll to latest output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamChunks, result]);

  // ========== Event Handlers ==========

  const handleParamChange = (key: keyof typeof params, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleInference = async () => {
    if (!prompt.trim() || !selectedModel) {
      setError('Please enter a prompt and select a model');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStreamChunks([]);

    try {
      const inferenceParams: InferenceParams = {
        prompt: prompt.trim(),
        modelId: selectedModel,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        topP: params.topP,
        topK: params.topK,
        repeatPenalty: params.repeatPenalty,
        stream: useStreaming,
        useGPU,
      };

      if (useStreaming && onStream) {
        // Streaming mode
        await onStream(inferenceParams, (chunk) => {
          setStreamChunks(prev => [...prev, chunk]);
        });
      } else {
        // Non-streaming mode
        const res = await onInference(inferenceParams);
        setResult(res);
        setStreamChunks(res.tokens || []);
      }
    } catch (err: any) {
      setError(err.message || 'Inference failed');
      console.error('Inference error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearOutput = () => {
    setResult(null);
    setStreamChunks([]);
    setError(null);
  };

  const selectedModelData = models.find(m => m.id === selectedModel);
  const canUseGPU = gpus.some(g => g.loadedModelId === selectedModel || g.loadedModelId === null);

  // ========== Render ==========

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Panel: Controls */}
      <div className="lg:col-span-1 bg-slate-800/60 rounded-lg p-6 border border-slate-700/50 flex flex-col space-y-6 overflow-y-auto">
        <div>
          <h3 className="text-lg font-bold text-slate-100 mb-4">Inference Settings</h3>
          
          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-sky-500"
              disabled={isLoading}
              data-testid="model-select"
            >
              <option value="">Select a model...</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.status === 'Loaded' ? '✓' : ''}
                </option>
              ))}
            </select>
            {selectedModelData && (
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <p>Size: {selectedModelData.size}</p>
                <p>Quantization: {selectedModelData.quantization}</p>
                <p>Status: <span className={selectedModelData.status === 'Loaded' ? 'text-green-400' : 'text-yellow-400'}>
                  {selectedModelData.status}
                </span></p>
              </div>
            )}
          </div>

          {/* Hardware Selection */}
          <div className="mb-6 pb-6 border-b border-slate-700/50">
            <label className="block text-sm font-medium text-slate-300 mb-3">Hardware</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-2 rounded hover:bg-slate-700/30 cursor-pointer">
                <input
                  type="radio"
                  name="hardware"
                  value="cpu"
                  checked={!useGPU}
                  onChange={() => setUseGPU(false)}
                  className="w-4 h-4"
                  data-testid="hardware-cpu"
                  disabled={isLoading}
                />
                <span className="text-sm text-slate-300">CPU</span>
              </label>
              <label className={`flex items-center space-x-3 p-2 rounded cursor-pointer ${!canUseGPU ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700/30'}`}>
                <input
                  type="radio"
                  name="hardware"
                  value="gpu"
                  checked={useGPU}
                  onChange={() => setUseGPU(true)}
                  disabled={!canUseGPU || isLoading}
                  className="w-4 h-4"
                  data-testid="hardware-gpu"
                />
                <span className="text-sm text-slate-300">GPU {gpus.length > 0 ? `(${gpus.length} available)` : '(none)'}</span>
              </label>
            </div>
          </div>

          {/* Generation Parameters */}
          <div className="space-y-6">
            <ParameterSlider
              label="Max Tokens"
              value={params.maxTokens}
              min={1}
              max={2048}
              step={1}
              onChange={(value) => handleParamChange('maxTokens', value)}
              tooltip="Maximum tokens to generate"
            />

            <ParameterSlider
              label="Temperature"
              value={params.temperature}
              min={0}
              max={2}
              step={0.1}
              onChange={(value) => handleParamChange('temperature', value)}
              tooltip="0 = deterministic, 1 = balanced, 2 = creative"
            />

            <ParameterSlider
              label="Top-P (Nucleus Sampling)"
              value={params.topP}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => handleParamChange('topP', value)}
              tooltip="Probability mass for nucleus sampling"
            />

            <ParameterSlider
              label="Top-K"
              value={params.topK}
              min={0}
              max={100}
              step={1}
              onChange={(value) => handleParamChange('topK', value)}
              tooltip="Sample from top K tokens (0 = disabled)"
            />

            <ParameterSlider
              label="Repeat Penalty"
              value={params.repeatPenalty}
              min={1}
              max={2}
              step={0.1}
              onChange={(value) => handleParamChange('repeatPenalty', value)}
              tooltip="Penalty for repeated tokens (>1)"
            />
          </div>

          {/* Streaming Toggle */}
          <div className="pt-6 border-t border-slate-700/50">
            <label className="flex items-center space-x-3 p-2 rounded hover:bg-slate-700/30 cursor-pointer">
              <input
                type="checkbox"
                checked={useStreaming}
                onChange={(e) => setUseStreaming(e.target.checked)}
                className="w-4 h-4"
                disabled={isLoading || !onStream}
                data-testid="streaming-toggle"
              />
              <span className="text-sm text-slate-300">Stream Output</span>
            </label>
          </div>
        </div>
      </div>

      {/* Right Panel: Prompt & Output */}
      <div className="lg:col-span-2 flex flex-col space-y-4">
        {/* Prompt Input */}
        <div className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50 flex flex-col">
          <label className="text-sm font-medium text-slate-300 mb-3">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
            disabled={isLoading}
            data-testid="prompt-input"
            rows={4}
          />
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleInference}
              disabled={isLoading || !selectedModel || !prompt.trim()}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                isLoading || !selectedModel || !prompt.trim()
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
              data-testid="inference-button"
            >
              <BoltIcon className="w-5 h-5" />
              <span>{isLoading ? 'Generating...' : 'Generate'}</span>
            </button>
            <button
              onClick={handleClearOutput}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
              data-testid="clear-button"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3">
            <ExclamationIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Output Display */}
        <div className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50 flex flex-col flex-1 min-h-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-slate-300">Output</h3>
            {result && (
              <div className="text-xs text-slate-400 space-x-4">
                <span>⚡ {result.tokensPerSecond.toFixed(2)} tok/s</span>
                <span>⏱ {result.elapsedSeconds.toFixed(2)}s</span>
              </div>
            )}
          </div>
          
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto bg-slate-900/30 rounded-lg p-4 border border-slate-700/30 font-mono text-sm"
            data-testid="output-display"
          >
            {streamChunks.length > 0 ? (
              <div className="space-y-2">
                {streamChunks.map((chunk, idx) => (
                  <div key={idx} className="text-slate-200">
                    <span className="text-slate-400 text-xs">[{chunk.tokensGenerated}]</span>
                    {' '}{chunk.token}
                  </div>
                ))}
                {isLoading && <div className="text-slate-500 animate-pulse">▌</div>}
              </div>
            ) : result?.text ? (
              <div className="text-slate-100 whitespace-pre-wrap">{result.text}</div>
            ) : (
              <div className="text-slate-500 text-center py-8">Awaiting inference...</div>
            )}
          </div>

          {/* Statistics */}
          {result && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900/30 p-3 rounded border border-slate-700/30">
                <p className="text-slate-400">Total Tokens</p>
                <p className="text-lg font-bold text-sky-400">{result.totalTokens}</p>
              </div>
              <div className="bg-slate-900/30 p-3 rounded border border-slate-700/30">
                <p className="text-slate-400">Speed</p>
                <p className="text-lg font-bold text-yellow-400">{result.tokensPerSecond.toFixed(1)}</p>
              </div>
              <div className="bg-slate-900/30 p-3 rounded border border-slate-700/30">
                <p className="text-slate-400">Duration</p>
                <p className="text-lg font-bold text-green-400">{result.elapsedSeconds.toFixed(2)}s</p>
              </div>
              <div className="bg-slate-900/30 p-3 rounded border border-slate-700/30">
                <p className="text-slate-400">Status</p>
                <p className={`text-lg font-bold ${result.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {result.status.toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
