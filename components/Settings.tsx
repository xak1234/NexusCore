
import React, { useState, useEffect } from 'react';
import { generateSystemPrompt } from '../services/geminiService';
import { SparklesIcon, FolderIcon } from './Icons';

export const Settings: React.FC = () => {
    const PROMPT_LOCAL_STORAGE_KEY = 'nexuscore-system-prompt';
    const PATH_LOCAL_STORAGE_KEY = 'nexuscore-model-path';

    const [systemPrompt, setSystemPrompt] = useState(() => {
        const savedPrompt = localStorage.getItem(PROMPT_LOCAL_STORAGE_KEY);
        return savedPrompt || "You are an elite coding assistant. Your goal is to provide accurate, efficient, and secure code. Follow these rules:\n1. Prioritize clarity and readability.\n2. Add comments for complex logic.\n3. If a user's request is ambiguous, ask for clarification.\n4. Do not generate code with known security vulnerabilities.";
    });
    const [promptDescription, setPromptDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [modelPath, setModelPath] = useState('');
    const [isPathSaved, setIsPathSaved] = useState(false);


    useEffect(() => {
        const savedPrompt = localStorage.getItem(PROMPT_LOCAL_STORAGE_KEY);
        if (savedPrompt) setSystemPrompt(savedPrompt);

        const savedPath = localStorage.getItem(PATH_LOCAL_STORAGE_KEY);
        if (savedPath) setModelPath(savedPath);
    }, []);

    useEffect(() => {
        localStorage.setItem(PROMPT_LOCAL_STORAGE_KEY, systemPrompt);
    }, [systemPrompt]);

    const handleGeneratePrompt = async () => {
        if (!promptDescription) return;
        setIsLoading(true);
        const newPrompt = await generateSystemPrompt(promptDescription);
        setSystemPrompt(newPrompt);
        setIsLoading(false);
    };

    const handleLoadPrompt = () => {
        const savedPrompt = localStorage.getItem(PROMPT_LOCAL_STORAGE_KEY);
        if (savedPrompt) {
            setSystemPrompt(savedPrompt);
        }
    };

    const handleSaveModelPath = () => {
        localStorage.setItem(PATH_LOCAL_STORAGE_KEY, modelPath);
        setIsPathSaved(true);
        setTimeout(() => setIsPathSaved(false), 2000);
    };


  return (
    <div className="p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-slate-100">Settings</h1>
      
      <div className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50">
        <h2 className="text-xl font-bold mb-4 text-slate-100">AI Requirement Parser Configuration</h2>
        <p className="text-sm text-slate-400 mb-4">
            This system prompt guides the behavior of the local coding models. It's the first instruction they see before processing any user request. The prompt is auto-saved.
        </p>

        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="system-prompt" className="block text-sm font-medium text-slate-300">
                    Current System Prompt
                </label>
                <button
                    onClick={handleLoadPrompt}
                    className="px-3 py-1 text-xs font-medium rounded-md transition-colors bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 hover:border-slate-500"
                >
                    Revert to Saved
                </button>
            </div>
            <textarea
                id="system-prompt"
                rows={8}
                className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-3 text-sm text-slate-200 font-mono focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
            />
        </div>

        <div className="border-t border-slate-700/50 pt-6">
            <h3 className="text-lg font-semibold mb-3 text-slate-200">Generate New Prompt with Gemini</h3>
            <p className="text-sm text-slate-400 mb-4">
                Describe the desired behavior for your AI assistant, and Gemini Pro will generate a detailed system prompt for you.
            </p>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="e.g., 'An assistant that always writes Python and explains its code like I'm five.'"
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-md p-3 text-sm text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                    value={promptDescription}
                    onChange={(e) => setPromptDescription(e.target.value)}
                />
            </div>
            <button
                onClick={handleGeneratePrompt}
                disabled={isLoading || !promptDescription}
                className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                <SparklesIcon className="w-5 h-5"/>
                <span>{isLoading ? 'Generating...' : 'Generate Prompt'}</span>
            </button>
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-lg p-6 border border-slate-700/50 mt-8">
        <div className="flex items-center space-x-3 mb-4">
            <FolderIcon className="w-6 h-6 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-100">Model Storage Location</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">
            Specify the default directory where your GGUF models are stored. The server will scan this location for available models.
        </p>
        <div className="flex items-center space-x-2">
            <input
                type="text"
                placeholder="/path/to/your/models"
                className="flex-grow bg-slate-900/70 border border-slate-600 rounded-md p-3 text-sm text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-mono"
                value={modelPath}
                onChange={(e) => setModelPath(e.target.value)}
            />
            <button
                onClick={handleSaveModelPath}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors w-28 ${
                    isPathSaved 
                    ? 'bg-green-600 text-white' 
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
            >
                {isPathSaved ? 'Saved!' : 'Save Path'}
            </button>
        </div>
      </div>

    </div>
  );
};
