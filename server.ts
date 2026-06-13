import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header per guidelines
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Please configure it in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API: Suggestions to better manage expenses using AI
app.post("/api/ai/suggestions", async (req, res) => {
  try {
    const { transactions, monthlyBudget, totalExpense, totalIncome, displayCurrency = "INR" } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "Missing API Key",
        message: "Gemini API key is not configured in the AI Studio Secrets panel. Please navigate to Settings > Secrets to add GEMINI_API_KEY."
      });
    }

    const ai = getGeminiClient();

    // Prepare content query for Gemini
    const prompt = `
      You are an elite, human-centered, personal financial coach. Analyze the user's spending data and budget:
      - Monthly Budget Limit: ${monthlyBudget} (${displayCurrency})
      - Total Expenses this month: ${totalExpense} (${displayCurrency})
      - Total Income this month: ${totalIncome} (${displayCurrency})
      - Recent Transactions: ${JSON.stringify(transactions || [])}
      - Dashboard Active Display Currency: ${displayCurrency}

      Provide fully custom, actionable, visual financial insights and tips.
      Note: The user's active display currency is ${displayCurrency}. All summary sentences, insights and responses must reference values in ${displayCurrency} properly (e.g. using ₹ for INR).
      For estimatedSavings in challenge tips, supply the value in equivalent USD currency values so the client-side helper can dynamically convert and scale it to the user's favorite display currency.
      Return the output strictly in the requested JSON structure. Keep responses punchy, extremely encouraging, and actionable. Do not use generic rules. Refer to specific transactions if notable (e.g. coffee shop visits, subscription amounts).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an ultimate, next-gen personal AI financial advisor. You provide sharp, creative, positive financial analytics, custom savings projections, and actionable challenges rather than dry textbook warnings.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "burnRateStatus", "burnRateExplanation", "categoryInsights", "actionableTips", "savingsProjection"],
          properties: {
            summary: {
              type: Type.STRING,
              description: "A summary of the user's general spending trends, acknowledging positive aspects or highlighting primary issues."
            },
            burnRateStatus: {
              type: Type.STRING,
              description: "Assess spending speed: 'excellent', 'satisfactory', 'warning', or 'critical'."
            },
            burnRateExplanation: {
              type: Type.STRING,
              description: "Brief visual explanation of why this burn rate status was chosen (e.g., 'Spending 20% faster than typical monthly benchmarks')."
            },
            categoryInsights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["category", "insight", "severity"],
                properties: {
                  category: { type: Type.STRING },
                  insight: { type: Type.STRING, description: "Personalized critique about spending in this category." },
                  severity: { type: Type.STRING, description: "Severity of spending in this category: 'info', 'warning', or 'optimal'" }
                }
              },
              description: "Key observations for individual categories."
            },
            actionableTips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["title", "description", "estimatedSavings", "challengeDays"],
                properties: {
                  title: { type: Type.STRING, description: "A catchy, fun name for the budget savings challenge, like 'The Soy Milk Squeeze' or 'Subscription Audit Spark'." },
                  description: { type: Type.STRING, description: "Specific instructions on what to cut or pause." },
                  estimatedSavings: { type: Type.NUMBER, description: "Estimated financial savings if completed successfully as a number." },
                  challengeDays: { type: Type.NUMBER, description: "How many days the user should undertake this challenge." }
                }
              },
              description: "Personalized micro-challenges to save money."
            },
            savingsProjection: {
              type: Type.STRING,
              description: "Fun projection of how much they could save over 6 months with custom suggestions."
            }
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text received from Gemini");
    }

    const suggestions = JSON.parse(response.text.trim());
    return res.json(suggestions);
  } catch (error: any) {
    console.error("Error in AI suggestions API:", error);
    return res.status(500).json({
      error: "AI Generation Failed",
      message: error.message || "An error occurred while communicating with the AI service."
    });
  }
});

// API: Natural Language AI Financial Chatbot
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, transactionsContext, monthlyBudget, displayCurrency = "INR" } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "Missing API Key",
        message: "Gemini API key is not configured in the AI Studio Secrets panel. Please navigate to Settings > Secrets."
      });
    }

    const ai = getGeminiClient();

    // Prepare system prompt containing user's financial profile
    const systemContext = `
      You are 'Aura', a next-generation personal financial AI advisor with excellent design taste, warm demeanor, and extremely crisp financial advice.
      User's Current Profile:
      - Monthly Budget limit: ${monthlyBudget || 1000} (${displayCurrency})
      - Real-time transactions: ${JSON.stringify(transactionsContext || [])}
      - Dashboard Active Display Currency: ${displayCurrency}
      
      Always stay in character. Be positive, direct, clear, and don't make up transactions they don't have. Ensure your formatting uses Markdown tables or line-breaks elegantly where numbers or budgets are discussed.
      Speak natively in terms of the user's active display currency: ${displayCurrency}, translating budget indicators where relevant, and use localized currency symbols (like ₹ for INR, $ for USD, € for EUR, £ for GBP) in your replies. Avoid dry corporate jargon.
    `;

    // Merge and alternate contents to ensure it starts with 'user' and alternates strictly
    const contents: any[] = [];
    let expectedRole = "user"; // First message must be 'user'
    
    if (messages && Array.isArray(messages)) {
      for (const msg of messages) {
        const currentRole = msg.role === "assistant" ? "model" : "user";
        if (currentRole === expectedRole) {
          contents.push({
            role: currentRole,
            parts: [{ text: msg.content }]
          });
          expectedRole = expectedRole === "user" ? "model" : "user";
        } else if (contents.length > 0) {
          // Same role consecutively, append to the last message of the same role
          const lastMsg = contents[contents.length - 1];
          if (lastMsg.parts && lastMsg.parts[0] && msg.content) {
            lastMsg.parts[0].text += "\n" + msg.content;
          }
        }
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemContext
      }
    });

    return res.json({ reply: response.text || "I am processing your numbers, could you ask me that again?" });
  } catch (error: any) {
    console.error("Error in AI Chat API:", error);
    return res.status(500).json({
      error: "AI Chat Failed",
      message: error.message || "An error occurred while generating a response."
    });
  }
});

// API: SMS Transaction AI Parser
app.post("/api/sms/parse", async (req, res) => {
  try {
    const { smsText } = req.body;
    if (!smsText || typeof smsText !== "string") {
      return res.status(400).json({
        error: "Missing fields",
        message: "smsText body parameter is required"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "Missing API Key",
        message: "Gemini API key is not configured in the AI Studio Secrets panel. Please navigate to Settings > Secrets to enable real-time SMS Parsing."
      });
    }

    const ai = getGeminiClient();

    const prompt = `
      You are a precise, financial transaction extractor. Analyze the following SMS text and extract transaction details:
      "${smsText}"

      Output attributes to extract:
      1. amount: A float/double representing the transacted numerical quantity. (e.g. 350, 145000, 12.50). Remove commas.
      2. type: Either "expense" (if money was debited, spent, paid, charged, withdrawn, transferred to someone) or "income" (if money was credited, received, deposited, refunded, salary).
      3. seller: The brief clean name of the merchant, product/service, bank, or person (e.g. "Swiggy", "Netflix", "Amazon", "Starbucks", "Uber", "Employer"). If undefined, return the primary organization/person of the transaction. Keep it under 20 characters.
      4. currency: The 3-letter currency code (e.g. INR, USD, EUR, GBP, JPY). If not stated, assume "INR".

      You MUST respond strictly in the requested JSON structure. No outer explanation.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["amount", "type", "seller", "currency"],
          properties: {
            amount: { type: Type.NUMBER, description: "numerical amount" },
            type: { type: Type.STRING, enum: ["expense", "income"] },
            seller: { type: Type.STRING, description: "clean merchant/seller name" },
            currency: { type: Type.STRING, description: "3-letter currency abbreviation" }
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini SMS parser");
    }

    const extracted = JSON.parse(response.text.trim());
    return res.json(extracted);
  } catch (error: any) {
    console.error("Error in AI SMS Parser API:", error);
    return res.status(500).json({
      error: "AI SMS Parse Failed",
      message: error.message || "An error occurred while parsing the SMS message."
    });
  }
});

// Vite middleware & static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
