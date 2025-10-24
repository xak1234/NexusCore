"""
Configuration management for the GGUF inference server.

Handles environment variables, model paths, and runtime configuration
with support for both CPU and GPU builds.
"""

import os
from typing import Optional
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Server configuration loaded from environment variables and .env files."""

    # Server configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    # Model configuration
    model_path: str = "./models"  # Directory containing GGUF models
    default_model: str = "DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf"
    
    # GGUF inference settings
    n_gpu_layers: int = 0  # Set to > 0 for GPU acceleration (depends on your GPU VRAM)
    n_threads: int = 4  # CPU threads for inference
    context_length: int = 2048  # Maximum context window
    batch_size: int = 512  # Token batch size
    
    # Model loading strategy
    offload_layers: int = 0  # Number of layers to offload to GPU
    verbose: bool = False  # Enable llama-cpp-python logging
    
    # Caching configuration
    enable_cache: bool = True
    cache_dir: str = "./cache"
    max_cached_models: int = 2  # Maximum models to keep in memory simultaneously
    
    # Performance tuning
    max_workers: int = 4  # For concurrent requests
    request_timeout: int = 600  # Request timeout in seconds
    stream_chunk_size: int = 1  # Tokens per stream chunk (1 = real-time)
    
    # API configuration
    enable_metrics: bool = True
    cors_origins: list[str] = ["*"]  # Adjust for production security
    
    class Config:
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_model_path(model_name: str) -> Path:
    """
    Construct full path to a model file.
    
    Args:
        model_name: Name of the GGUF model file
        
    Returns:
        Path object pointing to the model file
        
    Raises:
        FileNotFoundError: If model file doesn't exist
    """
    model_file = Path(settings.model_path) / model_name
    
    if not model_file.exists():
        raise FileNotFoundError(f"Model file not found: {model_file}")
    
    return model_file


def ensure_cache_dir() -> Path:
    """Create cache directory if it doesn't exist and return its path."""
    cache_path = Path(settings.cache_dir)
    cache_path.mkdir(parents=True, exist_ok=True)
    return cache_path
