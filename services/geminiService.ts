import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Analyze a description to auto-categorize
export const autoCategorizeTransaction = async (description: string, expenseCategories: string[]) => {
  try {
    const modelId = "gemini-2.5-flash";
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
  try {
    if (!transactions.length) return [];
    
    // Limit context to last 50 transactions to save tokens/latency
    const recent = transactions.slice(0, 50).map(t => ({
      date: t.date,
      amount: t.amount,
      category: t.category,
      type: t.type
    }));

    const modelId = "gemini-2.5-flash";
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
  try {
    // Summarize data for the context
    const summary = transactions.map(t => 
      `${t.date.split('T')[0]}: ${t.type} of $${t.amount} for ${t.category} (${t.description})`
    ).join('\n');

    const modelId = "gemini-2.5-flash";
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