"""
Request and response schemas for OpenAI-compatible API.

Defines Pydantic models for API contracts, ensuring type safety
and automatic validation/documentation.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CompletionRequest(BaseModel):
    """
    Text completion request schema (OpenAI-compatible).
    
    Supports configurable generation parameters for fine-tuning
    model behavior during inference.
    """
    
    prompt: str = Field(
        ...,
        description="Input text prompt for generation"
    )
    
    model: Optional[str] = Field(
        None,
        description="Model name (if None, uses default)"
    )
    
    max_tokens: int = Field(
        128,
        ge=1,
        le=4096,
        description="Maximum tokens to generate"
    )
    
    temperature: float = Field(
        0.7,
        ge=0.0,
        le=2.0,
        description="Sampling temperature (0=deterministic, 1=random)"
    )
    
    top_p: float = Field(
        0.9,
        ge=0.0,
        le=1.0,
        description="Nucleus sampling parameter"
    )
    
    top_k: int = Field(
        40,
        ge=0,
        description="Top-K sampling parameter"
    )
    
    repeat_penalty: float = Field(
        1.1,
        ge=1.0,
        description="Repeat penalty to avoid redundant tokens"
    )
    
    stream: bool = Field(
        False,
        description="Enable streaming response"
    )


class ChatMessage(BaseModel):
    """Single message in a conversation."""
    role: str = Field(..., description="Message role: system, user, or assistant")
    content: str = Field(..., description="Message content")


class ChatCompletionRequest(BaseModel):
    """
    Chat completion request schema (OpenAI-compatible).
    
    Supports multi-turn conversations with role-based message handling.
    """
    
    messages: List[ChatMessage] = Field(
        ...,
        description="Conversation history"
    )
    
    model: Optional[str] = Field(
        None,
        description="Model name (if None, uses default)"
    )
    
    max_tokens: int = Field(
        128,
        ge=1,
        le=4096,
        description="Maximum tokens to generate"
    )
    
    temperature: float = Field(
        0.7,
        ge=0.0,
        le=2.0,
        description="Sampling temperature"
    )
    
    top_p: float = Field(
        0.9,
        ge=0.0,
        le=1.0,
        description="Nucleus sampling parameter"
    )
    
    top_k: int = Field(
        40,
        ge=0,
        description="Top-K sampling"
    )
    
    stream: bool = Field(
        False,
        description="Enable streaming response"
    )


class CompletionChoice(BaseModel):
    """Single completion choice in response."""
    index: int
    text: str
    finish_reason: str


class CompletionResponse(BaseModel):
    """
    Text completion response schema.
    
    Returns generated text with metadata about completion.
    """
    
    id: str = Field(..., description="Unique request ID")
    object: str = Field(default="text_completion", description="Object type")
    created: int = Field(..., description="Unix timestamp")
    model: str = Field(..., description="Model used")
    choices: List[CompletionChoice] = Field(..., description="Generated completions")
    usage: Dict[str, int] = Field(..., description="Token usage statistics")


class ChatCompletionChoice(BaseModel):
    """Single chat completion choice."""
    index: int
    message: ChatMessage
    finish_reason: str


class ChatCompletionResponse(BaseModel):
    """
    Chat completion response schema.
    
    Returns assistant message with conversation metadata.
    """
    
    id: str = Field(..., description="Unique request ID")
    object: str = Field(default="chat.completion", description="Object type")
    created: int = Field(..., description="Unix timestamp")
    model: str = Field(..., description="Model used")
    choices: List[ChatCompletionChoice] = Field(..., description="Generated choices")
    usage: Dict[str, int] = Field(..., description="Token usage statistics")


class StreamedCompletion(BaseModel):
    """Single chunk in a streamed completion."""
    id: str
    object: str = "text_completion.chunk"
    created: int
    model: str
    choices: List[Dict[str, Any]]


class ModelInfo(BaseModel):
    """Information about an available model."""
    name: str
    size_bytes: int
    type: str = "gguf"
    created: int


class AvailableModels(BaseModel):
    """Response listing available models."""
    object: str = "list"
    data: List[ModelInfo]


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: Dict[str, Any] = Field(
        ...,
        description="Error details"
    )
