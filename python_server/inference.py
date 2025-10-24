"""
Inference engine for GGUF models.

Handles text generation, token management, streaming, and inference
parameter application for various generation strategies.
"""

import logging
import time
from typing import AsyncGenerator, Optional, Tuple
from llama_cpp import Llama

from .config import settings

logger = logging.getLogger(__name__)


class InferenceEngine:
    """
    Core inference engine for GGUF models.
    
    Manages text generation with configurable parameters including
    temperature, top-p sampling, and streaming capabilities.
    """
    
    @staticmethod
    async def generate_completion(
        model: Llama,
        prompt: str,
        max_tokens: int = 128,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 40,
        repeat_penalty: float = 1.1,
        stream: bool = False,
    ) -> dict:
        """
        Generate text completion from a prompt.
        
        This method performs inference with the specified parameters and
        returns either a complete response or a generator for streaming.
        
        Args:
            model: Loaded Llama model instance
            prompt: Input text prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0=deterministic, 2=very random)
            top_p: Nucleus sampling parameter (0-1)
            top_k: Top-K sampling (0=disabled)
            repeat_penalty: Penalty for repeated tokens (>1 = less repetition)
            stream: If True, yield tokens as they're generated
            
        Returns:
            Dictionary with generated text and metadata, or async generator if stream=True
        """
        start_time = time.time()
        
        logger.info(
            f"Starting completion generation: prompt_len={len(prompt)}, "
            f"max_tokens={max_tokens}, temp={temperature}, top_p={top_p}"
        )
        
        if stream:
            return InferenceEngine._stream_completion(
                model=model,
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                repeat_penalty=repeat_penalty,
            )
        else:
            # Non-streaming completion
            output = model(
                prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                repeat_penalty=repeat_penalty,
                stream=False,
            )
            
            elapsed = time.time() - start_time
            
            result = {
                "text": output["choices"][0]["text"],
                "tokens_used": output["usage"]["completion_tokens"],
                "total_tokens": output["usage"]["total_tokens"],
                "elapsed_seconds": elapsed,
                "tokens_per_second": output["usage"]["completion_tokens"] / elapsed if elapsed > 0 else 0,
            }
            
            logger.info(
                f"Completion finished: {result['tokens_used']} tokens in {elapsed:.2f}s "
                f"({result['tokens_per_second']:.2f} tok/s)"
            )
            
            return result
    
    @staticmethod
    async def _stream_completion(
        model: Llama,
        prompt: str,
        max_tokens: int,
        temperature: float,
        top_p: float,
        top_k: int,
        repeat_penalty: float,
    ) -> AsyncGenerator[dict, None]:
        """
        Generate text completion with streaming.
        
        Yields tokens as they're generated, enabling real-time
        responses and better UX for long outputs.
        
        Args:
            model: Loaded Llama model instance
            prompt: Input text prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling parameter
            top_k: Top-K sampling
            repeat_penalty: Repeat penalty
            
        Yields:
            Dictionary with streamed token data
        """
        start_time = time.time()
        tokens_generated = 0
        
        try:
            # Create streaming generator
            stream_output = model(
                prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                repeat_penalty=repeat_penalty,
                stream=True,
            )
            
            # Yield tokens as they arrive
            for chunk in stream_output:
                token_text = chunk["choices"][0]["text"]
                tokens_generated += 1
                
                yield {
                    "token": token_text,
                    "tokens_so_far": tokens_generated,
                    "timestamp": time.time(),
                }
            
            elapsed = time.time() - start_time
            logger.info(
                f"Stream completion finished: {tokens_generated} tokens in {elapsed:.2f}s "
                f"({tokens_generated / elapsed:.2f} tok/s)"
            )
        
        except Exception as e:
            logger.error(f"Streaming inference error: {e}")
            raise
    
    @staticmethod
    def format_chat_prompt(
        messages: list[dict],
        model_name: str = "llama",
    ) -> str:
        """
        Convert chat messages to a model-specific prompt format.
        
        This handles role-based formatting for multi-turn conversations.
        Format varies by model type; this is a generic implementation
        compatible with most instruction-tuned models.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model_name: Name of model for format selection
            
        Returns:
            Formatted prompt string
        """
        prompt_parts = []
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            # Generic chat format (adjust for specific models)
            if role == "system":
                prompt_parts.append(f"System: {content}\n")
            elif role == "user":
                prompt_parts.append(f"User: {content}\n")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}\n")
        
        # Add prompt marker for next response
        prompt_parts.append("Assistant:")
        
        return "\n".join(prompt_parts)
    
    @staticmethod
    async def get_token_count(
        model: Llama,
        text: str,
    ) -> int:
        """
        Count tokens in a text without generating output.
        
        Useful for pre-checking if text fits within context window.
        
        Args:
            model: Loaded Llama model instance
            text: Text to tokenize
            
        Returns:
            Number of tokens in the text
        """
        try:
            tokens = model.tokenize(text.encode())
            return len(tokens)
        except Exception as e:
            logger.error(f"Token counting error: {e}")
            raise
