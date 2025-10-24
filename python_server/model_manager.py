"""
Model Manager for GGUF models.

Handles model loading, unloading, caching, and lifecycle management
with efficient memory usage and GPU acceleration support.
"""

import asyncio
import logging
import os
import sys
from typing import Optional, Dict, Any
from pathlib import Path
from collections import OrderedDict

logger = logging.getLogger(__name__)

# Try to import Llama with fallback handling
try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    logger.warning("llama-cpp-python not installed. Installing...")
    try:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "llama-cpp-python", "-q"])
        from llama_cpp import Llama
        LLAMA_CPP_AVAILABLE = True
    except Exception as e:
        logger.error(f"Failed to install llama-cpp-python: {e}")

from .config import settings, get_model_path, ensure_cache_dir


class ModelCache:
    """
    LRU (Least Recently Used) cache for loaded GGUF models.
    
    Keeps frequently used models in memory and automatically evicts
    least-used models when the cache reaches capacity to manage memory efficiently.
    """
    
    def __init__(self, max_size: int = 2):
        """
        Initialize the model cache.
        
        Args:
            max_size: Maximum number of models to keep loaded simultaneously
        """
        self.max_size = max_size
        self.cache: OrderedDict[str, Llama] = OrderedDict()
        self.access_count: Dict[str, int] = {}
        self.lock = asyncio.Lock()
    
    async def get(self, model_name: str) -> Optional[Llama]:
        """
        Retrieve a model from cache, updating access statistics.
        
        Args:
            model_name: Name of the model to retrieve
            
        Returns:
            Llama model instance or None if not in cache
        """
        async with self.lock:
            if model_name in self.cache:
                self.cache.move_to_end(model_name)
                self.access_count[model_name] = self.access_count.get(model_name, 0) + 1
                logger.debug(f"Model cache hit: {model_name}")
                return self.cache[model_name]
            
            return None
    
    async def put(self, model_name: str, model: Llama) -> None:
        """
        Add or update a model in the cache.
        
        Args:
            model_name: Name of the model
            model: Llama model instance
        """
        async with self.lock:
            if model_name in self.cache:
                self.cache.move_to_end(model_name)
            else:
                if len(self.cache) >= self.max_size:
                    removed_model, removed_instance = self.cache.popitem(last=False)
                    logger.info(f"Evicting model from cache: {removed_model}")
                    try:
                        del removed_instance
                    except Exception as e:
                        logger.warning(f"Error cleaning up evicted model: {e}")
                
                self.cache[model_name] = model
                self.access_count[model_name] = 1
            
            logger.debug(f"Model added to cache: {model_name}")
    
    async def clear(self) -> None:
        """Clear all models from cache and free resources."""
        async with self.lock:
            for model_name, model_instance in self.cache.items():
                try:
                    del model_instance
                except Exception as e:
                    logger.warning(f"Error cleaning up model {model_name}: {e}")
            
            self.cache.clear()
            self.access_count.clear()
            logger.info("Model cache cleared")


class ModelManager:
    """
    Manages the lifecycle of GGUF models with robust error handling.
    """
    
    def __init__(self):
        """Initialize the model manager with cache."""
        self.cache = ModelCache(max_size=settings.max_cached_models)
        self.loading_locks: Dict[str, asyncio.Lock] = {}
        logger.info(f"ModelManager initialized with cache size: {settings.max_cached_models}")
    
    async def load_model(self, model_name: str) -> Llama:
        """
        Load a GGUF model with robust error handling.
        """
        if not LLAMA_CPP_AVAILABLE:
            raise RuntimeError("llama-cpp-python is not available")
        
        cached_model = await self.cache.get(model_name)
        if cached_model is not None:
            logger.info(f"Using cached model: {model_name}")
            return cached_model
        
        if model_name not in self.loading_locks:
            self.loading_locks[model_name] = asyncio.Lock()
        
        async with self.loading_locks[model_name]:
            cached_model = await self.cache.get(model_name)
            if cached_model is not None:
                return cached_model
            
            logger.info(f"Loading model from disk: {model_name}")
            model_path = get_model_path(model_name)
            
            try:
                model = Llama(
                    model_path=str(model_path),
                    n_gpu_layers=settings.n_gpu_layers,
                    n_ctx=settings.context_length,
                    n_threads=settings.n_threads,
                    n_batch=settings.batch_size,
                    verbose=settings.verbose,
                    use_mlock=True,
                    use_mmap=True,
                )
                
                logger.info(f"Model loaded successfully: {model_name}")
                await self.cache.put(model_name, model)
                return model
            
            except Exception as e:
                logger.error(f"Failed to load model {model_name}: {e}", exc_info=True)
                raise RuntimeError(f"Model loading failed: {str(e)}") from e
    
    async def unload_model(self, model_name: str) -> None:
        """Unload a specific model from cache."""
        logger.info(f"Unloading model: {model_name}")
        async with self.cache.lock:
            if model_name in self.cache.cache:
                model_instance = self.cache.cache.pop(model_name)
                try:
                    del model_instance
                except Exception as e:
                    logger.warning(f"Error unloading model {model_name}: {e}")
    
    async def shutdown(self) -> None:
        """Gracefully shutdown the model manager."""
        logger.info("Shutting down ModelManager")
        await self.cache.clear()


model_manager = ModelManager()
