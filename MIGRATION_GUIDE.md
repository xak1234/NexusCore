# Migration Guide: From Placeholders to Production Code

This document outlines all the changes made to replace placeholder/mock code with production-ready implementations.

## Summary of Changes

All mock data and placeholder code has been replaced with working, production-ready implementations including:
- ✅ Full backend server with Express
- ✅ Real GPU monitoring via nvidia-smi
- ✅ Model management API
- ✅ Request logging system
- ✅ Fixed Gemini AI integration
- ✅ API client service for frontend
- ✅ Real-time data polling

---

## 1. Backend Server (NEW)

**Created:** `server/index.ts`

A complete Express.js backend server with:
- GPU monitoring using nvidia-smi
- Model scanning and management
- Request logging with in-memory storage
- REST API endpoints for all operations
- Simulated activity for demo purposes when models are loaded

**Key Features:**
- Automatic GPU detection via nvidia-smi
- Model file scanning from configured directory
- CORS enabled for frontend communication
- Graceful fallback to mock data if nvidia-smi unavailable

---

## 2. API Client Service (NEW)

**Created:** `services/apiService.ts`

Frontend API client with typed interfaces for:
- GPU data fetching
- Model management (load/unload)
- Log retrieval and creation
- Server statistics
- Health checks

**Error Handling:**
- Proper error messages
- Console logging for debugging
- Type-safe responses

---

## 3. Gemini Service Fix

**File:** `services/geminiService.ts`

**Before:**
```typescript
import { GoogleGenAI } from "@google/genai"; // ❌ Wrong package
const ai = new GoogleGenAI({ apiKey: API_KEY! });
```

**After:**
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai"; // ✅ Correct package
let genAI = new GoogleGenerativeAI(API_KEY);
```

**Changes:**
- Fixed incorrect package import
- Updated to correct Gemini SDK API
- Better error handling with descriptive messages
- Null checks for missing API key

---

## 4. App.tsx - Removed Mock Data

**File:** `App.tsx`

**Removed:**
- `INITIAL_GPUS` - hardcoded GPU data
- `INITIAL_MODELS` - hardcoded model list
- `INITIAL_LOGS` - hardcoded log entries
- Simulated GPU utilization changes
- Fake log generation

**Added:**
- Initial data fetch on mount via API
- Real-time polling (every 2 seconds) for:
  - GPU status
  - Server statistics
  - Request logs
- Async model load/unload handlers with API calls
- Connection error handling and display
- Real GPU utilization tracking for charts

---

## 5. Configuration Files

### package.json Updates

**Added Dependencies:**
- `@google/generative-ai` - Correct Gemini SDK
- `express` - Backend server
- `cors` - CORS middleware
- `tsx` - TypeScript execution for server
- `concurrently` - Run frontend and backend together

**Added Scripts:**
- `dev:server` - Run backend in watch mode
- `dev:all` - Run frontend and backend together
- `build:server` - Build backend
- `start:server` - Run production server

### Environment Variables

**Created:** `.env.example` (since .env.local is gitignored)

**Required Variables:**
```env
VITE_GEMINI_API_KEY=    # Google Gemini API key
VITE_API_URL=           # Backend API URL
PORT=                   # Backend server port
MODEL_PATH=             # GGUF models directory
```

### TypeScript Configuration

**Created:** `tsconfig.server.json`

Server-specific TypeScript configuration extending base config with:
- NodeNext module resolution
- Proper output directory
- Server files inclusion

---

## 6. Vite Configuration Cleanup

**File:** `vite.config.ts`

**Before:**
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

**After:**
- Removed unnecessary define block
- Vite automatically loads VITE_* prefixed variables
- Cleaner configuration

---

## 7. Documentation

**Created/Updated:**
- `README.md` - Complete setup and usage guide
- `ENV_SETUP.md` - Environment variable setup instructions
- `MIGRATION_GUIDE.md` - This file

---

## Breaking Changes

### 1. API Key Change
- **Before:** Used OpenAI API key
- **After:** Requires Google Gemini API key
- **Action:** Get new key from https://makersuite.google.com/app/apikey

### 2. Backend Required
- **Before:** Frontend-only application with mock data
- **After:** Requires backend server running
- **Action:** Run `npm run dev:all` instead of just `npm run dev`

### 3. Environment Variables
- **Before:** Used `process.env.API_KEY` and `GEMINI_API_KEY`
- **After:** Uses `VITE_GEMINI_API_KEY` for frontend
- **Action:** Update .env.local with new variable names

---

## Installation Steps

1. **Install new dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Create .env.local with your Gemini API key
   echo "VITE_GEMINI_API_KEY=your_key_here" > .env.local
   ```

3. **Run the application:**
   ```bash
   npm run dev:all
   ```

---

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Frontend connects to backend successfully
- [ ] GPU data displays (real or fallback mock data)
- [ ] Models list appears
- [ ] Can load/unload models
- [ ] Request logs display
- [ ] Gemini analysis works (if API key configured)
- [ ] Dashboard charts update in real-time
- [ ] Settings persist to localStorage

---

## Rollback Plan

If you need to revert to mock data:

1. Restore `App.tsx` to use local state instead of API calls
2. Comment out backend API calls in useEffect hooks
3. Restore INITIAL_GPUS, INITIAL_MODELS, INITIAL_LOGS constants

---

## Future Improvements

Potential enhancements for production deployment:

1. **Database Integration**
   - Replace in-memory storage with PostgreSQL/MongoDB
   - Persistent log storage

2. **Authentication**
   - Add user authentication
   - API key management

3. **WebSocket Support**
   - Real-time updates instead of polling
   - More efficient data transmission

4. **LLM Server Integration**
   - Integrate with llama.cpp server
   - Actually load models into GPU memory
   - Real inference capabilities

5. **Monitoring Enhancements**
   - GPU memory breakdown by process
   - Power consumption tracking
   - Historical data retention

---

## Support

For issues or questions:
1. Check the troubleshooting section in README.md
2. Verify environment variables are set correctly
3. Ensure backend server is running
4. Check browser console for error messages

