
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LogEntry } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. Gemini features will not work.");
}

let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

export const analyzeLogEntry = async (log: LogEntry): Promise<string> => {
  if (!genAI) {
    return "Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env.local file.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      Analyze the following LLM interaction log entry and provide a concise analysis.
      Focus on potential issues, inefficiencies, or interesting aspects of the exchange.
      If there's an error, suggest a possible cause.

      **Log Entry:**
      - **Timestamp:** ${log.timestamp}
      - **Source:** ${log.source}
      - **Status:** ${log.status}
      - **Performance:** ${log.tokensPerSecond.toFixed(2)} tokens/sec
      
      **Prompt:**
      \`\`\`
      ${log.prompt}
      \`\`\`

      **Response:**
      \`\`\`
      ${log.response}
      \`\`\`

      **Your Analysis:**
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Error analyzing log entry:", error);
    return `Failed to analyze log entry: ${error.message}. Please check your Gemini API key.`;
  }
};

export const generateSystemPrompt = async (description: string): Promise<string> => {
  if (!genAI) {
    return "Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env.local file.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
      Based on the following high-level description, generate a comprehensive and effective system prompt for a large language model that assists with coding.
      The system prompt should be clear, concise, and structured to guide the model's behavior accurately.

      **Description:**
      "${description}"

      **Generated System Prompt:**
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Error generating system prompt:", error);
    return `Failed to generate system prompt: ${error.message}. Please check your Gemini API key and ensure you have access to the Pro model.`;
  }
};
