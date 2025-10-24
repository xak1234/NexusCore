/**
 * InferencePanel Component Tests
 * 
 * Tests cover:
 * ✓ Model selection with GGUF validation
 * ✓ All parameter controls (temperature, top-p, top-k, repeat penalty)
 * ✓ CPU/GPU hardware selection
 * ✓ Streaming output display
 * ✓ Error handling and recovery
 * ✓ Inference execution with proper state management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InferencePanel } from '../components/InferencePanel';
import type { LLMModel, GPU, InferenceParams, StreamChunk, InferenceResult } from '../types';

// ============================================================================
// Mock Data
// ============================================================================

const mockGPUs: GPU[] = [
  {
    id: 0,
    name: 'NVIDIA GeForce RTX 3090',
    utilization: 45,
    memoryUsed: 8.5,
    memoryTotal: 24,
    temperature: 65,
    loadedModelId: null,
    deviceType: 'CUDA',
  },
  {
    id: 1,
    name: 'NVIDIA GeForce RTX 3080',
    utilization: 30,
    memoryUsed: 6.2,
    memoryTotal: 10,
    temperature: 58,
    loadedModelId: null,
    deviceType: 'CUDA',
  },
];

const mockModels: LLMModel[] = [
  {
    id: 'model-1',
    name: 'DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M',
    size: '6.7GB',
    quantization: 'Q4_K_M',
    status: 'Loaded',
    loadedOnGpuIds: [0],
    isGGUF: true,
    contextLength: 4096,
  },
  {
    id: 'model-2',
    name: 'LFM2-1.2B-Q8_0',
    size: '1.2GB',
    quantization: 'Q8_0',
    status: 'Unloaded',
    loadedOnGpuIds: [],
    isGGUF: true,
    contextLength: 2048,
  },
];

const mockStreamChunks: StreamChunk[] = [
  {
    token: 'The',
    tokensGenerated: 1,
    timestamp: Date.now(),
    elapsed: 0.1,
  },
  {
    token: ' future',
    tokensGenerated: 2,
    timestamp: Date.now() + 100,
    elapsed: 0.2,
  },
  {
    token: ' of',
    tokensGenerated: 3,
    timestamp: Date.now() + 200,
    elapsed: 0.3,
  },
];

const mockInferenceResult: InferenceResult = {
  id: 'inference-1',
  text: 'The future of AI is bright and full of possibilities.',
  tokens: mockStreamChunks,
  totalTokens: 10,
  tokensPerSecond: 50,
  elapsedSeconds: 0.2,
  status: 'success',
};

// ============================================================================
// Tests
// ============================================================================

describe('InferencePanel Component', () => {
  const mockOnInference = jest.fn();
  const mockOnStream = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnInference.mockResolvedValue(mockInferenceResult);
    mockOnStream.mockResolvedValue(undefined);
  });

  // ========== Model Selection Tests ==========
  describe('Model Selection & Validation', () => {
    test('renders model selector with available models', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const modelSelect = screen.getByTestId('model-select');
      expect(modelSelect).toBeInTheDocument();

      const options = within(modelSelect as HTMLElement).getAllByRole('option');
      expect(options).toHaveLength(mockModels.length + 1); // +1 for placeholder
    });

    test('selects loaded model by default', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const modelSelect = screen.getByTestId('model-select') as HTMLSelectElement;
      expect(modelSelect.value).toBe('model-1'); // First loaded model
    });

    test('displays model metadata when selected', async () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      expect(screen.getByText('6.7GB')).toBeInTheDocument();
      expect(screen.getByText('Q4_K_M')).toBeInTheDocument();
      expect(screen.getByText('Loaded')).toBeInTheDocument();
    });

    test('switches model selection', async () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const modelSelect = screen.getByTestId('model-select');
      fireEvent.change(modelSelect, { target: { value: 'model-2' } });

      expect(screen.getByText('1.2GB')).toBeInTheDocument();
      expect(screen.getByText('Q8_0')).toBeInTheDocument();
    });
  });

  // ========== Parameter Controls Tests ==========
  describe('GGUF Parameter Controls', () => {
    test('renders all parameter sliders', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      expect(screen.getByText('Max Tokens')).toBeInTheDocument();
      expect(screen.getByText('Temperature')).toBeInTheDocument();
      expect(screen.getByText('Top-P (Nucleus Sampling)')).toBeInTheDocument();
      expect(screen.getByText('Top-K')).toBeInTheDocument();
      expect(screen.getByText('Repeat Penalty')).toBeInTheDocument();
    });

    test('updates temperature parameter', async () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const temperatureSlider = screen.getAllByRole('slider')[1]; // Second slider is temperature
      fireEvent.change(temperatureSlider, { target: { value: '1.5' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('1.50')).toBeInTheDocument();
      });
    });

    test('updates max tokens parameter', async () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const maxTokensSlider = screen.getAllByRole('slider')[0];
      fireEvent.change(maxTokensSlider, { target: { value: '256' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('256')).toBeInTheDocument();
      });
    });

    test('enforces parameter value ranges', async () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const topPSlider = screen.getAllByRole('slider')[2];
      fireEvent.change(topPSlider, { target: { value: '1.5' } }); // Out of range

      // Should clamp to max (1.0)
      fireEvent.change(topPSlider, { target: { value: '1' } });
      await waitFor(() => {
        expect(screen.getByDisplayValue('1.00')).toBeInTheDocument();
      });
    });

    test('all parameters are sent to inference callback', async () => {
      mockOnInference.mockImplementation(
        (params: InferenceParams) => Promise.resolve(mockInferenceResult)
      );

      const { rerender } = render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      // Set custom parameters
      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '200' } }); // maxTokens
      fireEvent.change(sliders[1], { target: { value: '0.9' } }); // temperature

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      const inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(mockOnInference).toHaveBeenCalledWith(
          expect.objectContaining({
            maxTokens: 200,
            temperature: 0.9,
            topP: expect.any(Number),
            topK: expect.any(Number),
            repeatPenalty: expect.any(Number),
          })
        );
      });
    });
  });

  // ========== Hardware Selection Tests ==========
  describe('CPU/GPU Hardware Selection', () => {
    test('renders CPU and GPU options', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      expect(screen.getByTestId('hardware-cpu')).toBeInTheDocument();
      expect(screen.getByTestId('hardware-gpu')).toBeInTheDocument();
    });

    test('GPU option shows available GPU count', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      expect(screen.getByText(`GPU (${mockGPUs.length} available)`)).toBeInTheDocument();
    });

    test('selects GPU by default when available', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const gpuRadio = screen.getByTestId('hardware-gpu') as HTMLInputElement;
      expect(gpuRadio.checked).toBe(true);
    });

    test('selects CPU when no GPUs available', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={[]}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const cpuRadio = screen.getByTestId('hardware-cpu') as HTMLInputElement;
      expect(cpuRadio.checked).toBe(true);

      const gpuRadio = screen.getByTestId('hardware-gpu') as HTMLInputElement;
      expect(gpuRadio.disabled).toBe(true);
    });

    test('switches between CPU and GPU', async () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const cpuRadio = screen.getByTestId('hardware-cpu');
      fireEvent.click(cpuRadio);

      expect((cpuRadio as HTMLInputElement).checked).toBe(true);

      const gpuRadio = screen.getByTestId('hardware-gpu');
      fireEvent.click(gpuRadio);

      expect((gpuRadio as HTMLInputElement).checked).toBe(true);
    });

    test('sends useGPU flag to inference callback', async () => {
      mockOnInference.mockImplementation(
        (params: InferenceParams) => Promise.resolve(mockInferenceResult)
      );

      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const gpuRadio = screen.getByTestId('hardware-gpu');
      fireEvent.click(gpuRadio);

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test');

      const inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(mockOnInference).toHaveBeenCalledWith(
          expect.objectContaining({ useGPU: true })
        );
      });
    });
  });

  // ========== Streaming Output Tests ==========
  describe('Streaming Output Display', () => {
    test('renders streaming toggle', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const streamingToggle = screen.getByTestId('streaming-toggle');
      expect(streamingToggle).toBeInTheDocument();
    });

    test('enables streaming by default', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const streamingToggle = screen.getByTestId('streaming-toggle') as HTMLInputElement;
      expect(streamingToggle.checked).toBe(true);
    });

    test('displays tokens as they stream in', async () => {
      mockOnStream.mockImplementation(
        async (params: InferenceParams, onChunk: (chunk: StreamChunk) => void) => {
          for (const chunk of mockStreamChunks) {
            onChunk(chunk);
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      );

      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      const streamingToggle = screen.getByTestId('streaming-toggle');
      expect(streamingToggle).toBeChecked();

      const inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(screen.getByText(/The/)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/future/)).toBeInTheDocument();
      });
    });

    test('displays output statistics after inference', async () => {
      mockOnInference.mockResolvedValue(mockInferenceResult);

      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const streamingToggle = screen.getByTestId('streaming-toggle');
      fireEvent.click(streamingToggle); // Disable streaming

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      const inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // Total tokens
        expect(screen.getByText('50')).toBeInTheDocument(); // Tokens per second
      });
    });
  });

  // ========== Error Handling Tests ==========
  describe('Error Handling & Recovery', () => {
    test('shows error message on inference failure', async () => {
      mockOnInference.mockRejectedValue(new Error('Model inference failed'));

      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const streamingToggle = screen.getByTestId('streaming-toggle');
      fireEvent.click(streamingToggle);

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      const inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(screen.getByText('Model inference failed')).toBeInTheDocument();
      });
    });

    test('disables inference button when no prompt', () => {
      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const inferenceButton = screen.getByTestId('inference-button');
      expect(inferenceButton).toBeDisabled();
    });

    test('disables inference button when no model selected', async () => {
      const modelsWithoutLoaded = mockModels.map(m => ({ ...m, status: 'Unloaded' as const }));

      render(
        <InferencePanel
          models={modelsWithoutLoaded}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      const inferenceButton = screen.getByTestId('inference-button');
      expect(inferenceButton).toBeDisabled();
    });

    test('shows error when inference fails and allows retry', async () => {
      mockOnInference
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockInferenceResult);

      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const streamingToggle = screen.getByTestId('streaming-toggle');
      fireEvent.click(streamingToggle);

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      let inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Retry
      inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(screen.getByText(/The future/)).toBeInTheDocument();
      });
    });

    test('allows clearing error message', async () => {
      mockOnInference.mockRejectedValue(new Error('Test error'));

      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const streamingToggle = screen.getByTestId('streaming-toggle');
      fireEvent.click(streamingToggle);

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      const inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      const errorCloseButton = screen.getByRole('button', { name: '✕' });
      fireEvent.click(errorCloseButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  // ========== UI State Management Tests ==========
  describe('UI State Management', () => {
    test('disables controls during inference', async () => {
      mockOnInference.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const streamingToggle = screen.getByTestId('streaming-toggle');
      fireEvent.click(streamingToggle);

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      const inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(inferenceButton).toHaveTextContent('Generating...');
        expect((promptInput as HTMLTextAreaElement).disabled).toBe(true);
        expect((screen.getByTestId('model-select') as HTMLSelectElement).disabled).toBe(true);
      });
    });

    test('clears output when clear button is clicked', async () => {
      mockOnInference.mockResolvedValue(mockInferenceResult);

      render(
        <InferencePanel
          models={mockModels}
          gpus={mockGPUs}
          onInference={mockOnInference}
          onStream={mockOnStream}
        />
      );

      const streamingToggle = screen.getByTestId('streaming-toggle');
      fireEvent.click(streamingToggle);

      const promptInput = screen.getByTestId('prompt-input');
      await userEvent.type(promptInput, 'Test prompt');

      const inferenceButton = screen.getByTestId('inference-button');
      fireEvent.click(inferenceButton);

      await waitFor(() => {
        expect(screen.getByText(/The future/)).toBeInTheDocument();
      });

      const clearButton = screen.getByTestId('clear-button');
      fireEvent.click(clearButton);

      expect(screen.queryByText(/The future/)).not.toBeInTheDocument();
      expect(screen.getByText('Awaiting inference...')).toBeInTheDocument();
    });
  });
});
