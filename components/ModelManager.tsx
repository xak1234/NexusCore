
import React from 'react';
import type { LLMModel, GPU } from '../types';

interface ModelListItemProps {
  model: LLMModel;
  onLoad: (modelId: string, gpuIds: number[]) => void;
  onUnload: (modelId: string) => void;
  availableGpus: GPU[];
}

const ModelListItem: React.FC<ModelListItemProps> = ({ model, onLoad, onUnload, availableGpus }) => {
    const handleLoad = () => {
        // Automatically use all available GPUs
        const allGpuIds = availableGpus.map(gpu => gpu.id);
        onLoad(model.id, allGpuIds.length > 0 ? allGpuIds : [0, 1]);
    };

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
            {model.status === 'Loaded' ? (
                <button
                    onClick={() => onUnload(model.id)}
                    className='px-4 py-2 rounded-md text-sm font-medium transition-colors bg-red-500/80 hover:bg-red-500 text-white'
                >
                    Unload
                </button>
            ) : (
                <button
                    onClick={handleLoad}
                    className='px-4 py-2 rounded-md text-sm font-medium transition-colors bg-sky-600 hover:bg-sky-500 text-white'
                >
                    Load (Both GPUs)
                </button>
            )}
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
            availableGpus={gpus} 
          />
        ))}
      </div>
    </div>
  );
};
