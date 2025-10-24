"""
FastAPI application for GGUF model inference with automatic setup.
"""

import logging
import time
import uuid
import asyncio
import sys
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, AsyncGenerator

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .config import settings, ensure_cache_dir
from .model_manager import model_manager, LLAMA_CPP_AVAILABLE
from .inference import InferenceEngine
from .schemas import (
    CompletionRequest,
    ChatCompletionRequest,
    CompletionResponse,
    CompletionChoice,
    ChatCompletionResponse,
    ChatCompletionChoice,
    ChatMessage,
    AvailableModels,
    ModelInfo,
    ErrorResponse,
)

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def ensure_dependencies():
    """Ensure all required dependencies are installed."""
    required = ['fastapi', 'uvicorn', 'pydantic', 'llama-cpp-python']
    
    for pkg in required:
        try:
            __import__(pkg.replace('-', '_'))
        except ImportError:
            logger.warning(f"Installing missing dependency: {pkg}")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])
            except Exception as e:
                logger.error(f"Failed to install {pkg}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage FastAPI lifecycle with automatic setup."""
    # Startup
    logger.info("🚀 Starting GGUF Inference Server")
    
    # Ensure dependencies
    ensure_dependencies()
    
    # Initialize directories
    ensure_cache_dir()
    
    # Verify models exist
    model_dir = Path(settings.model_path)
    if not model_dir.exists():
        logger.error(f"Model directory not found: {model_dir}")
    else:
        models = list(model_dir.glob("*.gguf"))
        if models:
            logger.info(f"✓ Found {len(models)} GGUF model(s)")
        else:
            logger.warning(f"⚠️ No GGUF models found in {model_dir}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down GGUF Inference Server")
    await model_manager.shutdown()


app = FastAPI(
    title="NexusLLM GGUF Inference Server",
    description="OpenAI-compatible API for GGUF model inference",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": time.time(),
        "llama_cpp_available": LLAMA_CPP_AVAILABLE,
    }


@app.get("/v1/models")
async def list_models() -> AvailableModels:
    """List available GGUF models."""
    try:
        model_dir = Path(settings.model_path)
        
        if not model_dir.exists():
            return AvailableModels(data=[])
        
        models = []
        for model_file in model_dir.glob("*.gguf"):
            stat = model_file.stat()
            models.append(
                ModelInfo(
                    name=model_file.name,
                    size_bytes=stat.st_size,
                    created=int(stat.st_mtime),
                )
            )
        
        logger.info(f"Found {len(models)} available models")
        return AvailableModels(data=models)
    
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/completions")
async def create_completion(request: CompletionRequest):
    """Create text completion from a prompt."""
    try:
        if not LLAMA_CPP_AVAILABLE:
            raise HTTPException(status_code=503, detail="llama-cpp-python not available")
        
        model_name = request.model or settings.default_model
        logger.info(f"Completion request: model={model_name}")
        
        model = await model_manager.load_model(model_name)
        
        token_count = await InferenceEngine.get_token_count(model, request.prompt)
        if token_count + request.max_tokens > settings.context_length:
            raise HTTPException(
                status_code=400,
                detail=f"Prompt exceeds context length",
            )
        
        request_id = str(uuid.uuid4())
        
        if request.stream:
            async def event_generator() -> AsyncGenerator[str, None]:
                try:
                    async for chunk in await InferenceEngine.generate_completion(
                        model=model,
                        prompt=request.prompt,
                        max_tokens=request.max_tokens,
                        temperature=request.temperature,
                        top_p=request.top_p,
                        top_k=request.top_k,
                        repeat_penalty=request.repeat_penalty,
                        stream=True,
                    ):
                        yield f"data: {chunk}\n\n"
                except Exception as e:
                    logger.error(f"Streaming error: {e}")
                    yield f"data: {{'error': '{str(e)}'}}\n\n"
            
            return StreamingResponse(event_generator(), media_type="text/event-stream")
        
        else:
            result = await InferenceEngine.generate_completion(
                model=model,
                prompt=request.prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                top_k=request.top_k,
                repeat_penalty=request.repeat_penalty,
                stream=False,
            )
            
            response = CompletionResponse(
                id=request_id,
                created=int(time.time()),
                model=model_name,
                choices=[
                    CompletionChoice(
                        index=0,
                        text=result["text"],
                        finish_reason="stop",
                    )
                ],
                usage={
                    "prompt_tokens": token_count,
                    "completion_tokens": result["tokens_used"],
                    "total_tokens": result["total_tokens"],
                },
            )
            
            return response
    
    except HTTPException:
        raise
    except FileNotFoundError as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Completion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    """Create chat completion from messages."""
    try:
        if not LLAMA_CPP_AVAILABLE:
            raise HTTPException(status_code=503, detail="llama-cpp-python not available")
        
        model_name = request.model or settings.default_model
        logger.info(f"Chat completion: model={model_name}, messages={len(request.messages)}")
        
        model = await model_manager.load_model(model_name)
        
        prompt = InferenceEngine.format_chat_prompt(
            [msg.model_dump() for msg in request.messages],
            model_name=model_name,
        )
        
        token_count = await InferenceEngine.get_token_count(model, prompt)
        if token_count + request.max_tokens > settings.context_length:
            raise HTTPException(status_code=400, detail="Messages exceed context length")
        
        request_id = str(uuid.uuid4())
        
        if request.stream:
            async def event_generator() -> AsyncGenerator[str, None]:
                try:
                    async for chunk in await InferenceEngine.generate_completion(
                        model=model,
                        prompt=prompt,
                        max_tokens=request.max_tokens,
                        temperature=request.temperature,
                        top_p=request.top_p,
                        top_k=request.top_k,
                        stream=True,
                    ):
                        token = chunk["token"]
                        yield f'data: {{"delta": {{"content": "{token}"}}, "index": 0}}\n\n'
                except Exception as e:
                    logger.error(f"Chat streaming error: {e}")
                    yield f"data: {{'error': '{str(e)}'}}\n\n"
            
            return StreamingResponse(event_generator(), media_type="text/event-stream")
        
        else:
            result = await InferenceEngine.generate_completion(
                model=model,
                prompt=prompt,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                top_k=request.top_k,
                stream=False,
            )
            
            response = ChatCompletionResponse(
                id=request_id,
                created=int(time.time()),
                model=model_name,
                choices=[
                    ChatCompletionChoice(
                        index=0,
                        message=ChatMessage(
                            role="assistant",
                            content=result["text"].strip(),
                        ),
                        finish_reason="stop",
                    )
                ],
                usage={
                    "prompt_tokens": token_count,
                    "completion_tokens": result["tokens_used"],
                    "total_tokens": result["total_tokens"],
                },
            )
            
            return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat completion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/models/{model_name}/unload")
async def unload_model(model_name: str):
    """Unload a specific model from memory."""
    try:
        await model_manager.unload_model(model_name)
        return {"status": "unloaded", "model": model_name, "timestamp": time.time()}
    except Exception as e:
        logger.error(f"Unload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/cache/clear")
async def clear_cache():
    """Clear all cached models and free resources."""
    try:
        await model_manager.cache.clear()
        return {"status": "cleared", "timestamp": time.time()}
    except Exception as e:
        logger.error(f"Cache clear error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/tokenize")
async def tokenize(text: str = Query(...), model: Optional[str] = Query(None)):
    """Tokenize text using the model's tokenizer."""
    try:
        model_name = model or settings.default_model
        loaded_model = await model_manager.load_model(model_name)
        token_count = await InferenceEngine.get_token_count(loaded_model, text)
        
        return {
            "model": model_name,
            "token_count": token_count,
            "text_length": len(text),
        }
    except Exception as e:
        logger.error(f"Tokenization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error={
                "message": exc.detail,
                "code": exc.status_code,
                "type": "http_error",
            }
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error={
                "message": "Internal server error",
                "code": 500,
                "type": "internal_error",
            }
        ).model_dump(),
    )


def main():
    """Start the GGUF inference server."""
    logger.info(f"Starting server on {settings.host}:{settings.port}")
    logger.info(f"Model directory: {settings.model_path}")
    logger.info(f"GPU layers: {settings.n_gpu_layers}")
    logger.info(f"CPU threads: {settings.n_threads}")
    
    uvicorn.run(
        "python_server.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
    )


if __name__ == "__main__":
    main()
