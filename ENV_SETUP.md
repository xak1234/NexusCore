# Environment Setup Instructions

## Required Environment Variables

This application requires certain environment variables to be configured. Follow these steps:

### 1. Create `.env.local` file

Copy the `.env.example` file and rename it to `.env.local` in the root directory:

```bash
cp .env.example .env.local
```

### 2. Configure Your API Keys

Edit `.env.local` and add your actual values:

#### Gemini API Key (Required for AI Features)

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

```
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> **Note**: The API key stored in memory (ID: 9589390) appears to be an OpenAI key. You'll need a **Google Gemini API key** instead. Get it from: https://makersuite.google.com/app/apikey

#### Backend Configuration

```
VITE_API_URL=http://localhost:8080/api
PORT=8080
MODEL_PATH=./models
```

### 3. Security Notes

- Never commit `.env.local` to version control (it's already in `.gitignore`)
- Keep your API keys private
- Use different keys for development and production

### 4. Optional: Model Storage

Create a `models` directory in the project root to store your GGUF model files:

```bash
mkdir models
```

Place your `.gguf` model files in this directory, and they will be automatically discovered by the server.

## Example `.env.local` File

```env
# Gemini API Key
VITE_GEMINI_API_KEY=AIzaSyA_example_key_replace_with_yours

# Backend API
VITE_API_URL=http://localhost:8080/api

# Server Config
PORT=8080
MODEL_PATH=./models
```

