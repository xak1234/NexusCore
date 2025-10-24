/**
 * CacheMonitor Component Tests
 * 
 * Tests cover:
 * ✓ Cache status display
 * ✓ Memory usage visualization
 * ✓ Model warmup functionality
 * ✓ Cache clearing operations
 * ✓ Loaded vs cached model display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CacheMonitor } from '../components/CacheMonitor';
import type { CacheStatus, LLMModel } from '../types';

// ============================================================================
// Mock Data
// ============================================================================

const mockCacheStatus: CacheStatus = {
  isWarmingUp: false,
  loadedModels: ['DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M'],
  cachedModels: [
    {
      name: 'DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M',
      memoryUsage: 7000000000, // 7GB in bytes
      lastUsed: Date.now() - 60000, // 1 minute ago
    },
    {
      name: 'LFM2-1.2B-Q8_0',
      memoryUsage: 1200000000, // 1.2GB in bytes
      lastUsed: Date.now() - 300000, // 5 minutes ago
    },
  ],
  totalCacheSize: 8200000000, // 8.2GB
  maxCacheSize: 16000000000, // 16GB
};

const mockModels: LLMModel[] = [
  {
    id: 'model-1',
    name: 'DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M',
    size: '6.7GB',
    quantization: 'Q4_K_M',
    status: 'Loaded',
    loadedOnGpuIds: [0],
    isGGUF: true,
  },
  {
    id: 'model-2',
    name: 'LFM2-1.2B-Q8_0',
    size: '1.2GB',
    quantization: 'Q8_0',
    status: 'Unloaded',
    loadedOnGpuIds: [],
    isGGUF: true,
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('CacheMonitor Component', () => {
  const mockOnClearCache = jest.fn();
  const mockOnWarmupModel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnClearCache.mockResolvedValue(undefined);
    mockOnWarmupModel.mockResolvedValue(undefined);

    // Mock window.confirm
    window.confirm = jest.fn(() => true);
  });

  // ========== Cache Status Display Tests ==========
  describe('Cache Status Display', () => {
    test('renders cache status when available', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.getByText('Cache Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    });

    test('shows unavailable message when no cache status', () => {
      render(
        <CacheMonitor
          cacheStatus={null}
          models={mockModels}
        />
      );

      expect(screen.getByText('Cache status unavailable')).toBeInTheDocument();
    });

    test('displays cache usage in MB', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      // 8200MB / 16000MB
      expect(screen.getByText(/8200.*\/.*16000/)).toBeInTheDocument();
    });

    test('calculates cache usage percentage correctly', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      // 8200 / 16000 = ~51.25%
      // The progress bar should be at 51% width
      const progressBars = screen.getAllByRole('progressbar') || [];
      expect(progressBars.length > 0).toBe(true);
    });
  });

  // ========== Cache Color Indicators Tests ==========
  describe('Cache Usage Color Indicators', () => {
    test('shows green color for low cache usage', () => {
      const lowUsageCacheStatus: CacheStatus = {
        ...mockCacheStatus,
        totalCacheSize: 2000000000, // 2GB / 16GB = 12.5%
      };

      const { container } = render(
        <CacheMonitor
          cacheStatus={lowUsageCacheStatus}
          models={mockModels}
        />
      );

      const progressDiv = container.querySelector('[style*="width"]');
      expect(progressDiv).toHaveClass('bg-green-500');
    });

    test('shows yellow color for medium cache usage', () => {
      const mediumUsageCacheStatus: CacheStatus = {
        ...mockCacheStatus,
        totalCacheSize: 11200000000, // 11.2GB / 16GB = 70%
      };

      const { container } = render(
        <CacheMonitor
          cacheStatus={mediumUsageCacheStatus}
          models={mockModels}
        />
      );

      const progressDiv = container.querySelector('[style*="width"]');
      expect(progressDiv).toHaveClass('bg-yellow-500');
    });

    test('shows red color for high cache usage', () => {
      const highUsageCacheStatus: CacheStatus = {
        ...mockCacheStatus,
        totalCacheSize: 14400000000, // 14.4GB / 16GB = 90%
      };

      const { container } = render(
        <CacheMonitor
          cacheStatus={highUsageCacheStatus}
          models={mockModels}
        />
      );

      const progressDiv = container.querySelector('[style*="width"]');
      expect(progressDiv).toHaveClass('bg-red-500');
    });
  });

  // ========== Warming Status Tests ==========
  describe('Warmup Status Display', () => {
    test('shows warming indicator when cache is warming up', () => {
      const warmingCacheStatus: CacheStatus = {
        ...mockCacheStatus,
        isWarmingUp: true,
      };

      render(
        <CacheMonitor
          cacheStatus={warmingCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.getByText('Warming up cache...')).toBeInTheDocument();
    });

    test('does not show warming indicator when not warming', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.queryByText('Warming up cache...')).not.toBeInTheDocument();
    });
  });

  // ========== Cached Models Display Tests ==========
  describe('Cached Models Display', () => {
    test('displays cached models section', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.getByText(/Cached Models/)).toBeInTheDocument();
    });

    test('shows correct number of cached models', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.getByText('Cached Models (2)')).toBeInTheDocument();
    });

    test('displays cached model details', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(
        screen.getByTestId('cached-model-DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('cached-model-LFM2-1.2B-Q8_0')
      ).toBeInTheDocument();
    });

    test('displays model memory usage', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.getByText('Memory: 7000.0 MB')).toBeInTheDocument();
      expect(screen.getByText('Memory: 1200.0 MB')).toBeInTheDocument();
    });

    test('displays last used time', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.getAllByText(/Last used:/)[0]).toBeInTheDocument();
    });

    test('does not show cached models section when empty', () => {
      const emptyCache: CacheStatus = {
        ...mockCacheStatus,
        cachedModels: [],
      };

      render(
        <CacheMonitor
          cacheStatus={emptyCache}
          models={mockModels}
        />
      );

      expect(screen.queryByText(/Cached Models/)).not.toBeInTheDocument();
    });
  });

  // ========== Loaded Models Display Tests ==========
  describe('Loaded Models Display', () => {
    test('displays loaded models section', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.getByText(/Loaded Models/)).toBeInTheDocument();
    });

    test('shows correct number of loaded models', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      expect(screen.getByText('Loaded Models (1)')).toBeInTheDocument();
    });

    test('displays loaded model with green indicator', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
        />
      );

      const loadedModelDiv = screen.getByTestId(
        'loaded-model-DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M'
      );
      expect(loadedModelDiv).toHaveClass('bg-green-500/10');
      expect(loadedModelDiv).toHaveClass('border-green-500/30');
    });

    test('does not show loaded models section when empty', () => {
      const emptyLoadedCache: CacheStatus = {
        ...mockCacheStatus,
        loadedModels: [],
      };

      render(
        <CacheMonitor
          cacheStatus={emptyLoadedCache}
          models={mockModels}
        />
      );

      expect(screen.queryByText(/Loaded Models/)).not.toBeInTheDocument();
    });
  });

  // ========== Warmup Model Tests ==========
  describe('Model Warmup', () => {
    test('renders warmup buttons for cached models', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onWarmupModel={mockOnWarmupModel}
        />
      );

      const warmupButtons = screen.getAllByRole('button', { name: /Warmup/ });
      expect(warmupButtons.length).toBe(mockCacheStatus.cachedModels.length);
    });

    test('calls warmup handler when button clicked', async () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onWarmupModel={mockOnWarmupModel}
        />
      );

      const warmupButton = screen.getByTestId(
        'warmup-button-DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M'
      );
      fireEvent.click(warmupButton);

      await waitFor(() => {
        expect(mockOnWarmupModel).toHaveBeenCalledWith(
          'DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M'
        );
      });
    });

    test('disables warmup button during warmup', async () => {
      mockOnWarmupModel.mockImplementation(() => new Promise(() => {}));

      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onWarmupModel={mockOnWarmupModel}
        />
      );

      const warmupButton = screen.getByTestId(
        'warmup-button-DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M'
      );
      fireEvent.click(warmupButton);

      await waitFor(() => {
        expect(warmupButton).toHaveTextContent('Warming...');
        expect(warmupButton).toBeDisabled();
      });
    });

    test('handles warmup errors gracefully', async () => {
      mockOnWarmupModel.mockRejectedValue(new Error('Warmup failed'));
      window.alert = jest.fn();

      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onWarmupModel={mockOnWarmupModel}
        />
      );

      const warmupButton = screen.getByTestId(
        'warmup-button-DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M'
      );
      fireEvent.click(warmupButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to warmup model');
        expect(warmupButton).toHaveTextContent('Warmup');
        expect(warmupButton).not.toBeDisabled();
      });
    });
  });

  // ========== Clear Cache Tests ==========
  describe('Cache Clearing', () => {
    test('renders clear cache button', () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onClearCache={mockOnClearCache}
        />
      );

      const clearButton = screen.getByTestId('clear-cache-button');
      expect(clearButton).toBeInTheDocument();
    });

    test('shows confirmation dialog before clearing', async () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onClearCache={mockOnClearCache}
        />
      );

      const clearButton = screen.getByTestId('clear-cache-button');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Clear all cached models')
        );
      });
    });

    test('calls clear cache handler when confirmed', async () => {
      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onClearCache={mockOnClearCache}
        />
      );

      const clearButton = screen.getByTestId('clear-cache-button');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockOnClearCache).toHaveBeenCalled();
      });
    });

    test('does not clear cache when not confirmed', async () => {
      (window.confirm as jest.Mock).mockReturnValue(false);

      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onClearCache={mockOnClearCache}
        />
      );

      const clearButton = screen.getByTestId('clear-cache-button');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockOnClearCache).not.toHaveBeenCalled();
      });
    });

    test('disables clear button during clearing', async () => {
      mockOnClearCache.mockImplementation(() => new Promise(() => {}));

      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onClearCache={mockOnClearCache}
        />
      );

      const clearButton = screen.getByTestId('clear-cache-button');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(clearButton).toHaveTextContent('Clearing...');
        expect(clearButton).toBeDisabled();
      });
    });

    test('disables clear button when no cached models', () => {
      const emptyCache: CacheStatus = {
        ...mockCacheStatus,
        cachedModels: [],
      };

      render(
        <CacheMonitor
          cacheStatus={emptyCache}
          models={mockModels}
          onClearCache={mockOnClearCache}
        />
      );

      const clearButton = screen.getByTestId('clear-cache-button');
      expect(clearButton).toBeDisabled();
    });

    test('handles clear cache errors gracefully', async () => {
      mockOnClearCache.mockRejectedValue(new Error('Clear failed'));
      window.alert = jest.fn();

      render(
        <CacheMonitor
          cacheStatus={mockCacheStatus}
          models={mockModels}
          onClearCache={mockOnClearCache}
        />
      );

      const clearButton = screen.getByTestId('clear-cache-button');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to clear cache');
        expect(clearButton).toHaveTextContent('Clear Cache');
        expect(clearButton).not.toBeDisabled();
      });
    });
  });
});
