
import React, { useState } from 'react';
import type { LogEntry as LogEntryType } from '../types';
import { SparklesIcon } from './Icons';
import { analyzeLogEntry } from '../services/geminiService';

const LogEntry: React.FC<{ log: LogEntryType }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setAnalysis(null);
    const result = await analyzeLogEntry(log);
    setAnalysis(result);
    setIsLoading(false);
  };

  return (
    <div className="bg-slate-800/60 rounded-lg border border-slate-700/50 transition-all duration-300">
      <div className="p-4 cursor-pointer flex items-center justify-between" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-4">
          <span className={`text-sm font-mono ${log.status === 'Success' ? 'text-green-400' : 'text-red-400'}`}>
            {log.status.toUpperCase()}
          </span>
          <span className="text-sm text-slate-400">{log.timestamp}</span>
          <span className="text-sm font-medium px-2 py-1 bg-slate-700 rounded text-slate-300">{log.source}</span>
        </div>
        <div className="text-sm text-slate-400 font-mono">{log.tokensPerSecond.toFixed(1)} t/s</div>
      </div>
      {isExpanded && (
        <div className="p-4 border-t border-slate-700/50">
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-slate-200">Prompt:</h4>
            <pre className="text-sm bg-slate-900/50 p-3 rounded-md overflow-x-auto text-slate-300 whitespace-pre-wrap font-mono">
              {log.prompt}
            </pre>
          </div>
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-slate-200">Response:</h4>
            <pre className="text-sm bg-slate-900/50 p-3 rounded-md overflow-x-auto text-slate-300 whitespace-pre-wrap font-mono">
              {log.response}
            </pre>
          </div>
          <div className="mt-4">
            <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                <SparklesIcon className="w-5 h-5"/>
                <span>{isLoading ? 'Analyzing...' : 'Analyze with Gemini'}</span>
            </button>
            {analysis && (
                 <div className="mt-4 p-4 bg-slate-900/50 rounded-md border border-sky-500/30">
                    <h5 className="font-bold mb-2 text-sky-400">Gemini Analysis:</h5>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{analysis}</p>
                 </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export const RequestLog: React.FC<{ logs: LogEntryType[] }> = ({ logs }) => {
  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-slate-100 flex-shrink-0">Request Logs</h1>
      <div className="overflow-y-auto flex-grow space-y-3 pr-2">
        {logs.map(log => (
          <LogEntry key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
};
