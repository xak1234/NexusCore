import { spawn } from 'child_process';
import path from 'path';

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  threads?: number;
  gpuLayers?: number;
}

function resolveCliPath(): string {
  // Prefer explicit path; fall back to common names
  const cli = process.env.LLAMA_CLI_PATH || 'llama-cli';
  return cli;
}

async function runCli(args: string[], input?: string): Promise<string> {
  const bin = resolveCliPath();
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `llama-cli exited with ${code}`));
      resolve(stdout);
    });
  });
}

export async function completion(
  modelPath: string,
  prompt: string,
  opts: GenerateOptions = {}
): Promise<{ text: string; tokensPerSecond: number; totalTokens: number }> {
  const args: string[] = ['-m', modelPath, '-p', prompt];
  if (opts.maxTokens) args.push('-n', String(opts.maxTokens));
  if (opts.threads) args.push('-t', String(opts.threads));
  if (opts.gpuLayers !== undefined) args.push('-ngl', String(opts.gpuLayers));
  if (opts.temperature !== undefined) args.push('--temp', String(opts.temperature));

  const start = Date.now();
  const out = await runCli(args);
  const duration = (Date.now() - start) / 1000;
  const text = out.trim();
  const totalTokens = Math.max(1, Math.round(text.split(/\s+/).length));
  const tps = duration > 0 ? totalTokens / duration : 0;
  return { text, tokensPerSecond: tps, totalTokens };
}

export async function chatCompletion(
  modelPath: string,
  messages: Array<{ role: string; content: string }>,
  opts: GenerateOptions = {}
): Promise<{ content: string; tokensPerSecond: number; totalTokens: number }> {
  // Simple prompt assembly for chat style
  const prompt = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .concat('ASSISTANT:')
    .join('\n\n');
  const r = await completion(modelPath, prompt, opts);
  return { content: r.text, tokensPerSecond: r.tokensPerSecond, totalTokens: r.totalTokens };
}


