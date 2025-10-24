
import React, { useState, useEffect, useMemo } from 'react';
import type { GPU, LLMModel } from '../types';
import { CpuChipIcon, GlobeAltIcon, BoltIcon, UsersIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);
const LAYOUT_STORAGE_KEY = 'nexuscore-dashboard-layout';
const DOCKED_WIDGETS_KEY = 'nexuscore-dashboard-docked';
const LAYOUT_VERSION_KEY = 'nexuscore-dashboard-layout-version';
const LAYOUT_VERSION = '7';


const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; }> = ({ icon, title, value }) => (
    <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50 flex items-center space-x-2">
        <div className="bg-slate-700/50 p-1.5 rounded-full flex-shrink-0">
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 truncate">{title}</p>
            <p className="text-base font-bold text-slate-100 truncate">{value}</p>
        </div>
    </div>
);

const GPUCard: React.FC<{ gpu: GPU, modelName: string | null }> = ({ gpu, modelName }) => {
  const utilColor = gpu.utilization > 80 ? 'bg-red-500' : gpu.utilization > 50 ? 'bg-yellow-500' : 'bg-green-500';
  const memColor = (gpu.memoryUsed / gpu.memoryTotal) * 100 > 80 ? 'text-red-400' : (gpu.memoryUsed / gpu.memoryTotal) * 100 > 50 ? 'text-yellow-400' : 'text-green-400';
  const tempColor = gpu.temperature > 80 ? 'bg-red-500/80 text-white' : gpu.temperature > 60 ? 'bg-yellow-500/80 text-slate-900 font-bold' : 'bg-sky-500/80 text-white';
  
  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 flex flex-col justify-between hover:border-sky-500/50 transition-colors duration-200">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-sm text-slate-100 truncate">{`GPU ${gpu.id}: ${gpu.name}`}</h3>
          <span className={`text-xs font-mono px-1 py-0.5 rounded transition-colors duration-300 ${tempColor}`}>
            {gpu.temperature}°C
          </span>
        </div>
        <div className="mb-3 h-8 flex items-center bg-slate-900/50 rounded px-2 border border-slate-700/50">
            <CpuChipIcon className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0"/>
            {modelName ? (
                <span className="text-sm font-medium text-sky-400 truncate" title={modelName}>{modelName}</span>
            ) : (
                <span className="text-sm text-slate-500">Idle</span>
            )}
        </div>
      </div>
      <div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Util</span>
              <span className="text-slate-300">{gpu.utilization.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div className={utilColor + " h-1.5 rounded-full transition-all duration-300"} style={{ width: `${gpu.utilization}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Mem</span>
              <span className={memColor}>{gpu.memoryUsed.toFixed(1)} / {gpu.memoryTotal} GB</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(gpu.memoryUsed / gpu.memoryTotal) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const defaultLayouts = {
  lg: [
    { i: 'stats', x: 0, y: 0, w: 12, h: 4, isResizable: false, minH: 4, maxH: 4 },
    { i: 'gpu-status', x: 0, y: 4, w: 6, h: 6, minH: 4, minW: 4 },
    { i: 'gpu-chart', x: 6, y: 4, w: 6, h: 6, minH: 4, minW: 4 },
    { i: 'tps-chart', x: 0, y: 10, w: 12, h: 5, minH: 4, minW: 4 },
  ],
  md: [
    { i: 'stats', x: 0, y: 0, w: 10, h: 2, isResizable: false, minH: 2, maxH: 2 },
    { i: 'gpu-status', x: 0, y: 2, w: 10, h: 5, minH: 4, minW: 6 },
    { i: 'gpu-chart', x: 0, y: 7, w: 5, h: 5, minH: 4, minW: 4 },
    { i: 'tps-chart', x: 5, y: 7, w: 5, h: 5, minH: 4, minW: 4 },
  ],
  sm: [
    { i: 'stats', x: 0, y: 0, w: 6, h: 2, isResizable: false, minH: 2, maxH: 2 },
    { i: 'gpu-status', x: 0, y: 2, w: 6, h: 5, minH: 4, minW: 4 },
    { i: 'gpu-chart', x: 0, y: 7, w: 6, h: 5, minH: 4, minW: 4 },
    { i: 'tps-chart', x: 0, y: 12, w: 6, h: 5, minH: 4, minW: 4 },
  ],
  xs: [
    { i: 'stats', x: 0, y: 0, w: 4, h: 2, isResizable: false, minH: 2, maxH: 2 },
    { i: 'gpu-status', x: 0, y: 2, w: 4, h: 5, minH: 4, minW: 4 },
    { i: 'gpu-chart', x: 0, y: 7, w: 4, h: 5, minH: 4, minW: 4 },
    { i: 'tps-chart', x: 0, y: 12, w: 4, h: 5, minH: 4, minW: 4 },
  ],
  xxs: [
    { i: 'stats', x: 0, y: 0, w: 2, h: 2, isResizable: false, minH: 2, maxH: 2 },
    { i: 'gpu-status', x: 0, y: 2, w: 2, h: 5, minH: 4, minW: 2 },
    { i: 'gpu-chart', x: 0, y: 7, w: 2, h: 5, minH: 4, minW: 2 },
    { i: 'tps-chart', x: 0, y: 12, w: 2, h: 5, minH: 4, minW: 2 },
  ],
};

const getInitialLayout = () => {
    const requiredKeys = new Set(['stats', 'gpu-chart', 'tps-chart', 'gpu-status']);
    try {
        const savedVersion = localStorage.getItem(LAYOUT_VERSION_KEY);
        const savedLayouts = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (!savedLayouts || savedVersion !== LAYOUT_VERSION) {
            // Reset stored layout if missing or version mismatch
            localStorage.setItem(LAYOUT_VERSION_KEY, LAYOUT_VERSION);
            localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(defaultLayouts));
            return defaultLayouts;
        }
        const parsed = JSON.parse(savedLayouts);
        // Validate that all required widgets exist in each breakpoint
        for (const bp in parsed) {
            const keys = new Set(parsed[bp].map((item: any) => item.i));
            for (const key of requiredKeys) {
                if (!keys.has(key)) {
                    // Invalid layout -> reset
                    localStorage.setItem(LAYOUT_VERSION_KEY, LAYOUT_VERSION);
                    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(defaultLayouts));
                    return defaultLayouts;
                }
            }
        }
        return parsed;
    } catch (error) {
        return defaultLayouts;
    }
};

const getInitialDockedWidgets = (): Set<string> => {
    try {
        const saved = localStorage.getItem(DOCKED_WIDGETS_KEY);
        return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
        return new Set();
    }
};

export const Dashboard: React.FC<{
  gpus: GPU[];
  models: LLMModel[];
  tps: number;
  rpm: number;
  connections: number;
  gpuChartData: any[];
  tpsChartData: any[];
  serverEndpoint?: string;
  memoryData?: any[];
}> = ({ gpus, models, tps, rpm, connections, gpuChartData, tpsChartData, serverEndpoint = 'localhost:8080', memoryData = [] }) => {
  const [layouts, setLayouts] = useState(getInitialLayout());
  const [dockedWidgets, setDockedWidgets] = useState(getInitialDockedWidgets());

  const onLayoutChange = (layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
  };
  
  const handleToggleDock = (widgetId: string) => {
    const newDocked = new Set(dockedWidgets);
    if (newDocked.has(widgetId)) {
        newDocked.delete(widgetId);
    } else {
        newDocked.add(widgetId);
    }
    setDockedWidgets(newDocked);
    localStorage.setItem(DOCKED_WIDGETS_KEY, JSON.stringify(Array.from(newDocked)));
  };

  const transformedLayouts = useMemo(() => {
    const newLayouts = JSON.parse(JSON.stringify(layouts));
    for (const bp in newLayouts) {
        newLayouts[bp] = newLayouts[bp].map((item: any) => {
            if (dockedWidgets.has(item.i)) {
                return { ...item, h: 1, isResizable: false, isDraggable: false };
            }
            // Ensure `isResizable` is explicitly set, otherwise it might become non-resizable
            // if a widget with the same key on another breakpoint has it set to false.
            if (item.i === 'stats') return {...item, isResizable: false};
            return { ...item, isResizable: true };
        });
    }
    return newLayouts;
  }, [layouts, dockedWidgets]);

  const getModelName = (modelId: string | null) => {
    if (!modelId) return null;
    return models.find(m => m.id === modelId)?.name || 'Unknown Model';
  };

  const renderWidgetHeader = (title: string, widgetId: string) => (
    <div className="drag-handle cursor-move flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold text-slate-100">{title}</h2>
      <button onClick={() => handleToggleDock(widgetId)} className="text-slate-400 hover:text-sky-400 transition-colors p-1">
        {dockedWidgets.has(widgetId) ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronUpIcon className="w-5 h-5" />}
      </button>
    </div>
  );

  return (
    <div className="p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-slate-100">Server Dashboard</h1>
      
      <ResponsiveGridLayout 
        className="layout" 
        layouts={transformedLayouts}
        onLayoutChange={onLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={40}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        autoSize
        useCSSTransforms
        measureBeforeMount={false}
        draggableHandle=".drag-handle"
      >
        <div key="stats" className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50 flex flex-col">
           {renderWidgetHeader('Server Status', 'stats')}
           {!dockedWidgets.has('stats') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <StatCard icon={<GlobeAltIcon className="w-5 h-5 text-sky-400"/>} title="Server Endpoint" value={serverEndpoint} />
                <StatCard icon={<BoltIcon className="w-5 h-5 text-yellow-400"/>} title="Tokens / Sec" value={tps.toFixed(1)} />
            </div>
           )}
        </div>

        <div key="gpu-chart" className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50 flex flex-col">
            {renderWidgetHeader('Overall GPU Usage (%)', 'gpu-chart')}
            {!dockedWidgets.has('gpu-chart') && (
              <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gpuChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs><linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} />
                    <YAxis stroke="#9ca3af" tick={{fontSize: 12}}/>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: '#475569' }} />
                    <Area type="monotone" dataKey="usage" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorUsage)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
        </div>

        <div key="tps-chart" className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50 flex flex-col">
            {renderWidgetHeader('Tokens per Second (Live)', 'tps-chart')}
            {!dockedWidgets.has('tps-chart') && (
              <div className="flex-grow">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={tpsChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <defs><linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#facc15" stopOpacity={0.8}/><stop offset="95%" stopColor="#facc15" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} />
                          <YAxis stroke="#9ca3af" domain={[0, 'dataMax + 50']} tick={{fontSize: 12}} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: '#475569' }}/>
                          <Area type="monotone" dataKey="tps" stroke="#facc15" strokeWidth={2} fillOpacity={1} fill="url(#colorTps)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
            )}
        </div>

        <div key="gpu-status" className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50 flex flex-col">
            {renderWidgetHeader('GPU Status', 'gpu-status')}
            {!dockedWidgets.has('gpu-status') && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-2 flex-grow">
                  {gpus.map(gpu => (
                      <GPUCard key={gpu.id} gpu={gpu} modelName={getModelName(gpu.loadedModelId)} />
                  ))}
              </div>
            )}
        </div>

      </ResponsiveGridLayout>
    </div>
  );
};
