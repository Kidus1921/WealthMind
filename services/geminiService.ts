
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIInsight } from "../types.ts";

// --- Rate Limiting Logic ---
const MAX_REQUESTS_PER_HOUR = 50;
const RATE_LIMIT_KEY = 'wm_ai_rate_limit';

const checkRateLimit = (): boolean => {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    let history: number[] = raw ? JSON.parse(raw) : [];
    history = history.filter(time => now - time < oneHour);
    
    if (history.length >= MAX_REQUESTS_PER_HOUR) return false;
    
    history.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(history));
    return true;
  } catch (e) { return true; }
};

export const generateSessionTitle = async (firstMessage: string) => {
  if (!checkRateLimit()) return "New Conversation";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a 2-4 word title for a financial chat starting with: "${firstMessage}". Return only the plain text title without quotes.`,
    });
    return response.text?.trim() || "New Conversation";
  } catch (error) { return "New Conversation"; }
};

export const chatWithData = async (
  query: string, 
  transactions: Transaction[], 
  history: {role: string, content: string}[],
  currency: string = '$'
) => {
  if (!checkRateLimit()) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // 1. Build financial context summary
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let monthInc = 0;
    let monthExp = 0;
    let totalBorrowed = 0;
    let totalLent = 0;

    transactions.forEach(t => {
      const d = new Date(t.date);
      const isThisMonth = d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      
      if (t.type === 'loan') {
        if (t.loanType === 'borrowed') totalBorrowed += t.amount;
        else totalLent += t.amount;
      } else if (t.category === 'Loan Repayment') {
        if (t.type === 'expense') totalBorrowed -= t.amount;
        else totalLent -= t.amount;
      }

      if (isThisMonth) {
        if (t.type === 'income') monthInc += t.amount;
        else if (t.type === 'expense') monthExp += t.amount;
      }
    });

    const context = `
CURRENT MONTH: ${monthInc} income, ${monthExp} expenses.
LOANS: You owe ${totalBorrowed}, Others owe you ${totalLent}.
DATA: ${transactions.slice(0, 30).map(t => `${t.date.split('T')[0]}: ${t.description} (${currency}${t.amount})`).join('; ')}
    `;

    const chatHistoryContext = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');

    const prompt = `You are WealthMind, an advanced financial companion. 
LOAN LOGIC: Principal is debt (not income/expense). Interest paid is expense.
STRICT RULE: Only use provided user data. If unknown, say so.
FORMAT: Plain conversational answer. No emojis.

FINANCIAL CONTEXT:
${context}

PREVIOUS MESSAGES:
${chatHistoryContext}

USER QUESTION: "${query}"

Return JSON:
{
  "answer": "Clear, friendly, professional response.",
  "insights": [
    { "type": "warning|tip|praise|neutral", "message": "Specific, actionable 1-sentence insight." }
  ]
}`;

    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["warning", "tip", "praise", "neutral"] },
                  message: { type: Type.STRING }
                },
                required: ["type", "message"]
              }
            }
          },
          required: ["answer", "insights"]
        }
      }
    });

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

export const autoCategorizeTransaction = async (description: string, expenseCategories: string[]) => {
  if (!checkRateLimit()) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const categoriesString = expenseCategories.join(", ");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze: "${description}". Predict category from: [${categoriesString}].`,
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
    return JSON.parse(response.text || "null");
  } catch (error) { return null; }
};

export const generateFinancialInsights = async (transactions: Transaction[]) => {
  if (!checkRateLimit() || !transactions.length) return [];
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const recent = transactions.slice(0, 30).map(t => ({
      date: t.date, amount: t.amount, category: t.category, type: t.type
    }));
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 2-3 actionable insights for: ${JSON.stringify(recent)}.`,
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
  } catch (error) { return []; }
};

export const analyzeFinancialDocument = async (file: File, availableCategories: string[]) => {
    if (!checkRateLimit()) throw new Error("Rate limit exceeded");
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const filePart = await fileToGenerativePart(file);
        const categoriesStr = availableCategories.join(", ");
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [filePart, { text: `Extract data (amount, date, desc, category from [${categoriesStr}])` }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        amount: { type: Type.NUMBER },
                        description: { type: Type.STRING },
                        date: { type: Type.STRING },
                        category: { type: Type.STRING },
                        referenceId: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["income", "expense"] },
                        paymentMethod: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || "null");
    } catch (error) { return null; }
};

const fileToGenerativePart = async (file: File) => {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({ inlineData: { data: base64String, mimeType: file.type } });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
};
