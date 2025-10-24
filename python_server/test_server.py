"""
Test script for GGUF inference server.

This script provides examples and integration tests for the FastAPI server.
Run with: python -m python_server.test_server

Requirements:
- Server running on localhost:8000
- At least one GGUF model in the models/ directory
"""

import asyncio
import httpx
import json
import time
from typing import Optional, AsyncGenerator


# Server configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 60


class GGUFServerClient:
    """Client for testing the GGUF inference server."""
    
    def __init__(self, base_url: str = BASE_URL, timeout: int = TIMEOUT):
        """Initialize the client."""
        self.base_url = base_url
        self.timeout = timeout
    
    async def health_check(self) -> dict:
        """Check server health."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/health",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
    
    async def list_models(self) -> dict:
        """List available models."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/v1/models",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
    
    async def completions(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 100,
        temperature: float = 0.7,
        top_p: float = 0.9,
        stream: bool = False,
    ) -> dict:
        """Generate text completion."""
        payload = {
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
            "stream": stream,
        }
        
        if model:
            payload["model"] = model
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/completions",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
    
    async def chat_completions(
        self,
        messages: list,
        model: Optional[str] = None,
        max_tokens: int = 100,
        temperature: float = 0.7,
        stream: bool = False,
    ) -> dict:
        """Generate chat completion."""
        payload = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream,
        }
        
        if model:
            payload["model"] = model
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
    
    async def tokenize(
        self,
        text: str,
        model: Optional[str] = None,
    ) -> dict:
        """Count tokens in text."""
        params = {"text": text}
        if model:
            params["model"] = model
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/tokenize",
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
    
    async def stream_completions(
        self,
        prompt: str,
        max_tokens: int = 100,
        model: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        """Stream text completion."""
        payload = {
            "prompt": prompt,
            "max_tokens": max_tokens,
            "stream": True,
        }
        
        if model:
            payload["model"] = model
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/v1/completions",
                json=payload,
                timeout=self.timeout,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data:
                            try:
                                yield json.loads(data)
                            except json.JSONDecodeError:
                                pass


async def main():
    """Run comprehensive tests."""
    client = GGUFServerClient()
    
    print("=" * 80)
    print("NexusLLM GGUF Inference Server - Test Suite")
    print("=" * 80)
    
    # Test 1: Health Check
    print("\n1. Testing server health...")
    try:
        health = await client.health_check()
        print(f"   ✓ Server is healthy: {health}")
    except Exception as e:
        print(f"   ✗ Health check failed: {e}")
        return
    
    # Test 2: List Models
    print("\n2. Listing available models...")
    try:
        models_response = await client.list_models()
        models = models_response.get("data", [])
        if models:
            print(f"   ✓ Found {len(models)} model(s):")
            for model in models:
                size_mb = model["size_bytes"] / (1024 * 1024)
                print(f"     - {model['name']} ({size_mb:.1f} MB)")
        else:
            print("   ! No models found in model directory")
            return
    except Exception as e:
        print(f"   ✗ Failed to list models: {e}")
        return
    
    # Use first available model
    model_name = models[0]["name"]
    print(f"\n   Using model: {model_name}")
    
    # Test 3: Tokenization
    print("\n3. Testing tokenization...")
    test_text = "Hello, world! This is a test."
    try:
        token_result = await client.tokenize(test_text, model=model_name)
        print(f"   ✓ Text tokenized successfully")
        print(f"     Text: '{test_text}'")
        print(f"     Tokens: {token_result['token_count']}")
        print(f"     Text length: {token_result['text_length']} chars")
    except Exception as e:
        print(f"   ✗ Tokenization failed: {e}")
    
    # Test 4: Text Completion (non-streaming)
    print("\n4. Testing text completion (non-streaming)...")
    prompt = "The purpose of artificial intelligence is to"
    try:
        start_time = time.time()
        result = await client.completions(
            prompt=prompt,
            model=model_name,
            max_tokens=50,
            temperature=0.7,
        )
        elapsed = time.time() - start_time
        
        choice = result["choices"][0]
        print(f"   ✓ Completion generated successfully")
        print(f"     Prompt: {prompt}")
        print(f"     Response: {choice['text']}")
        print(f"     Tokens used: {result['usage']['completion_tokens']}")
        print(f"     Time: {elapsed:.2f}s")
    except Exception as e:
        print(f"   ✗ Completion failed: {e}")
    
    # Test 5: Text Completion (streaming)
    print("\n5. Testing text completion (streaming)...")
    prompt = "In the future, machine learning will"
    try:
        print(f"   Prompt: {prompt}")
        print("   Response: ", end="", flush=True)
        
        token_count = 0
        start_time = time.time()
        
        async for chunk in await client.stream_completions(
            prompt=prompt,
            max_tokens=50,
            model=model_name,
        ):
            if "token" in chunk:
                print(chunk["token"], end="", flush=True)
                token_count += 1
        
        elapsed = time.time() - start_time
        print(f"\n   ✓ Stream completed")
        print(f"     Tokens: {token_count}")
        print(f"     Time: {elapsed:.2f}s")
    except Exception as e:
        print(f"\n   ✗ Streaming failed: {e}")
    
    # Test 6: Chat Completion
    print("\n6. Testing chat completion...")
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is 2+2?"},
    ]
    
    try:
        start_time = time.time()
        result = await client.chat_completions(
            messages=messages,
            model=model_name,
            max_tokens=50,
            temperature=0.7,
        )
        elapsed = time.time() - start_time
        
        choice = result["choices"][0]
        message = choice["message"]
        print(f"   ✓ Chat completion generated successfully")
        print(f"     Assistant: {message['content']}")
        print(f"     Tokens used: {result['usage']['completion_tokens']}")
        print(f"     Time: {elapsed:.2f}s")
    except Exception as e:
        print(f"   ✗ Chat completion failed: {e}")
    
    print("\n" + "=" * 80)
    print("Test suite completed!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
