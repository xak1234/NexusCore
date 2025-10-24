import React, { useState } from 'react';
import { ChevronDownIcon, CheckIcon, CopyIcon } from './Icons';
import type { IntegrityCheckResult } from '../services/integrityCheck';

interface ErrorDetailsProps {
  result: IntegrityCheckResult;
  onDismiss: () => void;
}

export const ErrorDetails: React.FC<ErrorDetailsProps> = ({ result, onDismiss }) => {
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  const getFullErrorReport = () => {
    const report = {
      timestamp: new Date(result.timestamp).toISOString(),
      success: result.success,
      summary: result.summary,
      checks: Object.entries(result.checks).map(([name, check]) => ({
        name,
        passed: check.passed,
        duration: `${check.duration.toFixed(2)}ms`,
        message: check.message,
        details: check.details,
      })),
    };
    return formatJson(report);
  };

  const checkEntries = Object.entries(result.checks);
  const failedChecks = checkEntries.filter(([_, check]) => !check.passed);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-red-500/30 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/20 to-red-800/20 border-b border-red-500/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-red-400">Integrity Check Failed</h2>
            <p className="text-sm text-slate-400">
              {result.summary.passedChecks}/{result.summary.totalChecks} checks passed
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Summary Section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Error Summary</h3>
              <button
                onClick={() =>
                  copyToClipboard(
                    result.summary.errors.join('\n'),
                    'summary'
                  )
                }
                className="flex items-center gap-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                {copiedSection === 'summary' ? (
                  <>
                    <CheckIcon className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <div className="space-y-2">
              {result.summary.errors.length > 0 ? (
                result.summary.errors.map((error, i) => (
                  <div
                    key={i}
                    className="text-sm text-red-300 bg-red-950/20 border border-red-800/30 rounded px-3 py-2"
                  >
                    • {error}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">No errors</div>
              )}
            </div>
          </div>

          {/* Warnings Section */}
          {result.summary.warnings.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-yellow-400">Warnings</h3>
                <button
                  onClick={() =>
                    copyToClipboard(
                      result.summary.warnings.join('\n'),
                      'warnings'
                    )
                  }
                  className="flex items-center gap-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  {copiedSection === 'warnings' ? (
                    <>
                      <CheckIcon className="w-3 h-3" /> Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-2">
                {result.summary.warnings.map((warning, i) => (
                  <div
                    key={i}
                    className="text-sm text-yellow-300 bg-yellow-950/20 border border-yellow-800/30 rounded px-3 py-2"
                  >
                    ⚠ {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Checks Details */}
          {failedChecks.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
              <h3 className="font-semibold text-white mb-3">Failed Checks</h3>
              <div className="space-y-2">
                {failedChecks.map(([checkName, check]) => (
                  <div
                    key={checkName}
                    className="bg-slate-700/50 border border-slate-600 rounded"
                  >
                    <button
                      onClick={() =>
                        setExpandedCheck(
                          expandedCheck === checkName ? null : checkName
                        )
                      }
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-600/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-left">
                        <ChevronDownIcon
                          className={`w-4 h-4 transition-transform ${
                            expandedCheck === checkName ? 'rotate-180' : ''
                          }`}
                        />
                        <span className="text-red-300">{checkName}</span>
                        <span className="text-xs text-slate-400">
                          ({check.duration.toFixed(2)}ms)
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(
                            JSON.stringify(
                              {
                                name: checkName,
                                message: check.message,
                                details: check.details,
                              },
                              null,
                              2
                            ),
                            checkName
                          );
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded transition-colors"
                      >
                        {copiedSection === checkName ? (
                          <>
                            <CheckIcon className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <CopyIcon className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </button>

                    {expandedCheck === checkName && (
                      <div className="border-t border-slate-600 p-3 bg-slate-800/30">
                        <p className="text-sm text-slate-300 mb-3">
                          {check.message}
                        </p>
                        {check.details && (
                          <pre className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 overflow-x-auto">
                            {formatJson(check.details)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Report */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Full Report (JSON)</h3>
              <button
                onClick={() =>
                  copyToClipboard(getFullErrorReport(), 'full-report')
                }
                className="flex items-center gap-2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                {copiedSection === 'full-report' ? (
                  <>
                    <CheckIcon className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 border border-slate-700 rounded p-3 text-xs text-slate-300 overflow-x-auto max-h-64">
              {getFullErrorReport()}
            </pre>
          </div>

          {/* Console Output Instructions */}
          <div className="bg-blue-950/30 border border-blue-700/50 rounded p-4">
            <h3 className="font-semibold text-blue-300 mb-2">Browser Console</h3>
            <p className="text-sm text-blue-200 mb-2">
              Open your browser's developer console to see detailed logs:
            </p>
            <ul className="text-xs text-blue-300 space-y-1 ml-4">
              <li>• Press <span className="font-mono bg-slate-900 px-1 rounded">F12</span> or right-click → Inspect</li>
              <li>• Click the <span className="font-mono bg-slate-900 px-1 rounded">Console</span> tab</li>
              <li>• Look for messages starting with <span className="font-mono bg-slate-900 px-1 rounded">[Integrity Check]</span></li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-800 border-t border-slate-700 px-6 py-3 flex justify-end gap-2">
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};
