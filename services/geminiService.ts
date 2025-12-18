
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Rate Limiting Logic ---
const MAX_REQUESTS_PER_HOUR = 50;
const RATE_LIMIT_KEY = 'wm_ai_rate_limit';

const checkRateLimit = (): boolean => {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    let history: number[] = raw ? JSON.parse(raw) : [];
    
    // Filter out timestamps older than 1 hour
    history = history.filter(time => now - time < oneHour);
    
    if (history.length >= MAX_REQUESTS_PER_HOUR) {
      console.warn("AI Rate limit exceeded");
      return false;
    }
    
    // Add current request
    history.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(history));
    return true;
  } catch (e) {
    return true; // Fail open if storage errors
  }
};

// Helper: Convert File to Base64 for Gemini
const fileToGenerativePart = async (file: File) => {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
};

// Smart Import: Analyze Image/PDF
export const analyzeFinancialDocument = async (file: File, availableCategories: string[]) => {
    if (!checkRateLimit()) throw new Error("Rate limit exceeded");

    try {
        const filePart = await fileToGenerativePart(file);
        
        const categoriesStr = availableCategories.join(", ");
        // Using gemini-3-flash-preview for multimodal extraction as per guidelines
        const modelId = "gemini-3-flash-preview"; 
        
        const prompt = `
        Analyze this financial document (receipt, invoice, or bank statement). 
        Extract the key transaction details.
        
        For the following fields, provide the extracted value AND a confidence score (0.0 to 1.0) reflecting legibility and certainty.
        
        1. Amount (number).
        2. Description (Vendor/Payee name).
        3. Date (ISO YYYY-MM-DD).
        4. Category (infer from list: [${categoriesStr}] or use "Other").
        5. Reference ID (Invoice Number, Transaction ID, Receipt Number).
        
        Also extract:
        6. Type ('income' or 'expense').
        7. Payment Method.
        8. Overall document confidence.
        
        If a field is missing or unreadable, return null for the value and 0 for confidence.
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    filePart,
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        amount: { type: Type.NUMBER },
                        amountConfidence: { type: Type.NUMBER },
                        
                        description: { type: Type.STRING },
                        descriptionConfidence: { type: Type.NUMBER },
                        
                        date: { type: Type.STRING },
                        dateConfidence: { type: Type.NUMBER },
                        
                        category: { type: Type.STRING },
                        categoryConfidence: { type: Type.NUMBER },
                        
                        referenceId: { type: Type.STRING },
                        referenceIdConfidence: { type: Type.NUMBER },
                        
                        type: { type: Type.STRING, enum: ["income", "expense"] },
                        paymentMethod: { type: Type.STRING },
                        confidence: { type: Type.NUMBER } // Overall confidence
                    }
                }
            }
        });

        if (!response.text) return null;
        return JSON.parse(response.text);

    } catch (error) {
        console.error("Gemini Document Analysis Error:", error);
        return null;
    }
};

// Analyze a description to auto-categorize
export const autoCategorizeTransaction = async (description: string, expenseCategories: string[]) => {
  if (!checkRateLimit()) return null;

  try {
    // Using gemini-3-flash-preview for basic text tasks
    const modelId = "gemini-3-flash-preview";
    const categoriesString = expenseCategories.join(", ");
    
    const prompt = `Analyze this transaction description: "${description}". 
    Predict the most likely category from this specific list: [${categoriesString}].
    If it doesn't fit well, use "Other".
    Also predict the transaction type (income or expense), and a likely payment method.
    Predict a short "reason" for spending.
    Determine if it is likely a recurring transaction.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["income", "expense"] },
            paymentMethod: { type: Type.STRING },
            reason: { type: Type.STRING },
            isRecurringLikely: { type: Type.BOOLEAN }
          }
        }
      }
    });
    
    if (!response.text) {
      console.warn("Gemini returned empty text for auto-categorize");
      return null;
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Auto-Categorize Error:", error);
    return null;
  }
};

// Generate insights based on recent history
export const generateFinancialInsights = async (transactions: Transaction[]) => {
  if (!checkRateLimit()) return [];

  try {
    if (!transactions.length) return [];
    
    // Limit context to last 50 transactions to save tokens/latency
    const recent = transactions.slice(0, 50).map(t => ({
      date: t.date,
      amount: t.amount,
      category: t.category,
      type: t.type
    }));

    // Using gemini-3-flash-preview for analysis tasks
    const modelId = "gemini-3-flash-preview";
    const prompt = `You are a financial advisor. Analyze these recent transactions: ${JSON.stringify(recent)}.
    Provide 3 short, actionable insights or observations. 
    1. A spending trend.
    2. A specific category alert or praise.
    3. A brief saving recommendation.
    Keep them concise (under 20 words each).`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["warning", "tip", "praise", "neutral"] },
              message: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Insights Error", error);
    return [];
  }
};

// Natural Language Search / Chat
export const chatWithData = async (query: string, transactions: Transaction[]) => {
  if (!checkRateLimit()) return "Rate limit exceeded. Please try again later.";

  try {
    // Summarize data for the context
    const summary = transactions.map(t => 
      `${t.date.split('T')[0]}: ${t.type} of $${t.amount} for ${t.category} (${t.description})`
    ).join('\n');

    // Using gemini-3-flash-preview for chat-based extraction and reasoning
    const modelId = "gemini-3-flash-preview";
    const prompt = `Context: User's financial transaction history:\n${summary}\n\nUser Question: "${query}"\n\n
    Answer the user's question accurately based on the data provided. 
    If calculating totals, be precise. 
    If the answer isn't in the data, say so. 
    Keep the tone helpful and professional.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error", error);
    return "I'm having trouble analyzing your data right now. Please try again later.";
  }
};
