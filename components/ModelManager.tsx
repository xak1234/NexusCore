
import React, { useState } from 'react';
import type { LLMModel, GPU } from '../types';

interface ModelListItemProps {
  model: LLMModel;
  onLoad: (modelId: string, gpuIds: number[]) => void;
  onUnload: (modelId: string) => void;
  availableGpus: GPU[];
}

const ModelListItem: React.FC<ModelListItemProps> = ({ model, onLoad, onUnload, availableGpus }) => {
    const [isGpuSelectorOpen, setIsGpuSelectorOpen] = useState(false);
    const [selectedGpus, setSelectedGpus] = useState<Set<number>>(new Set());

    const handleToggleGpu = (gpuId: number) => {
        setSelectedGpus(prev => {
            const newSet = new Set(prev);
            if (newSet.has(gpuId)) {
                newSet.delete(gpuId);
            } else {
                newSet.add(gpuId);
            }
            return newSet;
        });
    };
    
    const handleConfirmLoad = () => {
        if (selectedGpus.size > 0) {
            onLoad(model.id, Array.from(selectedGpus));
            setIsGpuSelectorOpen(false);
            setSelectedGpus(new Set());
        }
    }

  return (
    <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-sky-500/50 transition-colors duration-200">
        <div className="flex-1 mb-4 sm:mb-0">
            <h3 className="font-bold text-lg text-slate-100">{model.name}</h3>
            <p className="text-sm text-slate-400">
            Size: {model.size} | Quantization: {model.quantization}
            </p>
        </div>
        <div className="flex items-center space-x-4 w-full sm:w-auto">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full w-max ${
            model.status === 'Loaded' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-300'
            }`}>
            {model.status}{model.loadedOnGpuIds.length > 0 ? ` on GPU ${model.loadedOnGpuIds.join(', ')}` : ''}
            </span>
            <div className="relative">
                {model.status === 'Loaded' ? (
                     <button
                        onClick={() => onUnload(model.id)}
                        className='px-4 py-2 rounded-md text-sm font-medium transition-colors bg-red-500/80 hover:bg-red-500 text-white'
                    >
                        Unload
                    </button>
                ) : (
                    <button
                        onClick={() => setIsGpuSelectorOpen(!isGpuSelectorOpen)}
                        className='px-4 py-2 rounded-md text-sm font-medium transition-colors bg-sky-600 hover:bg-sky-500 text-white'
                    >
                        Load
                    </button>
                )}
                {isGpuSelectorOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-10 p-2">
                        <p className="p-2 text-sm text-slate-300 border-b border-slate-600 mb-2">Select GPU(s) for layer splitting:</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {availableGpus.length > 0 ? availableGpus.map(gpu => (
                                <label key={gpu.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-600/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedGpus.has(gpu.id)}
                                        onChange={() => handleToggleGpu(gpu.id)}
                                        className="h-4 w-4 rounded bg-slate-800 border-slate-500 text-sky-500 focus:ring-sky-500"
                                    />
                                    <span className="text-sm text-slate-200">GPU {gpu.id} ({gpu.name})</span>
                                </label>
                            )) : <p className="text-xs text-slate-400 p-2">No available GPUs</p>}
                        </div>
                         <button onClick={handleConfirmLoad} disabled={selectedGpus.size === 0} className="w-full mt-2 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-green-600 hover:bg-green-500 text-white disabled:bg-slate-600 disabled:cursor-not-allowed">
                            Load on {selectedGpus.size} GPU(s)
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};


export const ModelManager: React.FC<{ 
    models: LLMModel[];
    gpus: GPU[];
    onLoadModel: (modelId: string, gpuIds: number[]) => void;
    onUnloadModel: (modelId: string) => void;
}> = ({ models, gpus, onLoadModel, onUnloadModel }) => {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-slate-100">Model Management</h1>
      <div className="space-y-4">
        {models.map(model => (
          <ModelListItem 
            key={model.id} 
            model={model} 
            onLoad={onLoadModel} 
            onUnload={onUnloadModel}
            availableGpus={gpus.filter(g => g.loadedModelId === null)} 
          />
        ))}
      </div>
    </div>
  );
};
