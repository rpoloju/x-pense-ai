import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BrainCircuit, 
  Sparkles, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  HelpCircle, 
  ShieldAlert,
  ChevronRight,
  Info,
  Sliders
} from "lucide-react";
import { Transaction, ChatMessage, AISuggestions } from "../types";
import { convertAmount, formatCurrencyValue } from "../utils/currencyUtils";

interface AIAdvisorProps {
  transactions: Transaction[];
  monthlyBudget: number;
  displayCurrency: string;
  exchangeRates: Record<string, number>;
}

export function AIAdvisor({ transactions, monthlyBudget, displayCurrency, exchangeRates }: AIAdvisorProps) {
  // AI Suggestions reports
  const [report, setReport] = useState<AISuggestions | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  // Chatbot states
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am Aura, your next-generation AI financial coach. I have indexed your accounts and transactions contextually. How can I help you adjust your budgets, analyze subscription leaks, or save more effectively today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [chatError, setChatError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatTyping]);

  // Compute stats to send to Gemini
  const statsSummary = useMemoStats(transactions, displayCurrency, exchangeRates);

  // Run the Cognitive AI Analysis
  const runCognitiveReport = async () => {
    setIsGeneratingReport(true);
    setReportError("");
    try {
      const response = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions,
          monthlyBudget,
          totalExpense: statsSummary.expense,
          totalIncome: statsSummary.income,
          displayCurrency
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Suggestions failed to generate");
      }
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || "Could not generate AI report. Make sure your API Key is specified in Settings > Secrets.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Run the cognitive report automatically on initial load if none exists
  useEffect(() => {
    if (!report && !isGeneratingReport && transactions.length > 0) {
      runCognitiveReport();
    }
  }, [transactions]);

  // Send message to financial chatbot
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatTyping) return;

    setChatError("");
    const userMessageText = chatInput.trim();
    setChatInput("");

    // Append user message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsChatTyping(true);

    try {
      // Keep only last 10 messages to optimize prompt size
      const recentHistory = updatedMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: recentHistory,
          transactionsContext: transactions,
          monthlyBudget,
          displayCurrency
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "AI reply failed");
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Aura is currently disconnected from the server. Check your Gemini API Secrets configuration.");
    } finally {
      setIsChatTyping(false);
    }
  };

  // Quick suggestion clicks for chat bot
  const executeQuickQuestion = (question: string) => {
    setChatInput(question);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      
      {/* LEFT: COGNITIVE FINANCIAL SCAN REPORT */}
      <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
        
        {/* REPORT TRIGGER CARD */}
        <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-cyan-400">
                <BrainCircuit className="w-5.5 h-5.5 text-cyan-300 animate-pulseSlower" />
              </span>
              <div>
                <h3 className="text-md font-sans font-bold text-white leading-tight">Insight Generator</h3>
                <p className="text-[10px] text-white/40 font-mono">COGNITIVE ACCOUNT SCREENER</p>
              </div>
            </div>

            <button 
              onClick={runCognitiveReport}
              disabled={isGeneratingReport}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono font-bold text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white/50 ${isGeneratingReport ? 'animate-spin' : ''}`} />
              RE-RUN SCAN
            </button>
          </div>

          {/* Render error if loading or missing credentials */}
          {reportError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-rose-450 uppercase tracking-wide font-sans">Report Connection Interrupted</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{reportError}</p>
              </div>
            </div>
          )}

          {/* Report scanning animation */}
          {isGeneratingReport && (
            <div className="py-16 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                <div className="absolute inset-0 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">Scanning transactions ledger...</h4>
                <p className="text-[10px] text-white/40 font-sans">Consulting Gemini 3.5 Flash for strategic advice</p>
              </div>
            </div>
          )}

          {/* Report summary content */}
          {!isGeneratingReport && report && (
            <div className="space-y-5 animate-fadeIn">
              {/* General Summary Statement */}
              <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
                <p className="text-xs text-white/80 leading-relaxed font-sans relative z-10 italic">
                  "{report.summary}"
                </p>
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
              </div>

              {/* Burn tempo speedometer indicator */}
              <div className="flex items-center justify-between p-4 bg-[#0c0c0c]/40 border border-white/5 rounded-2xl">
                <div>
                  <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest font-bold">Burn Mode tempo</span>
                  <div className="text-md font-sans font-bold text-white capitalize mt-0.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      report.burnRateStatus === "excellent" ? "bg-cyan-400 shadow-lg shadow-cyan-400/50" :
                      report.burnRateStatus === "satisfactory" ? "bg-cyan-400" :
                      report.burnRateStatus === "warning" ? "bg-amber-400 animate-pulse" :
                      "bg-rose-500 animate-pulse"
                    }`} />
                    {report.burnRateStatus} Spending speed
                  </div>
                </div>
                <p className="text-[11px] font-mono text-white/40 max-w-[200px] text-right font-medium leading-relaxed">
                  {report.burnRateExplanation}
                </p>
              </div>

              {/* Segmented Category Alarms */}
              {report.categoryInsights && report.categoryInsights.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold uppercase text-white/30 mb-1">Target Account Area Alarms</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {report.categoryInsights.map((insight, idx) => {
                      return (
                        <div key={idx} className="p-3 bg-[#0c0c0c]/40 border border-white/5 rounded-2xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-sans font-bold text-white">{insight.category}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold leading-none capitalize ${
                              insight.severity === "optimal" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 animate-pulse" :
                              insight.severity === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" :
                              "bg-white/5 text-white/70 border border-white/10"
                            }`}>
                              {insight.severity}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/40 leading-snug font-sans">{insight.insight}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isGeneratingReport && !report && !reportError && (
            <div className="py-12 text-center">
              <BrainCircuit className="w-8 h-8 text-white/20 mx-auto mb-2 animate-pulse" />
              <button 
                onClick={runCognitiveReport}
                className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold uppercase transition shadow-md cursor-pointer tracking-wider"
              >
                COMPILE FIRST REPORT
              </button>
            </div>
          )}
        </div>

        {/* PERSONAL BUDGET MICRO CHALLENGES */}
        {!isGeneratingReport && report && report.actionableTips && report.actionableTips.length > 0 && (
          <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-cyan-400">
              <Sparkles className="w-5 h-5 text-cyan-300 animate-pulseSlower" />
              <div>
                <h3 className="text-sm font-sans font-bold text-white select-none">AI Recommendations</h3>
                <p className="text-[9px] text-white/40 font-mono select-none">TACTICAL MICRO CHALLENGES</p>
              </div>
            </div>

            <div className="space-y-3">
              {report.actionableTips.map((tip, idx) => {
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-[#0c0c0c]/40 hover:bg-white/[0.01] border border-white/5 transition-colors flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        {tip.title}
                        <span className="text-[9px] font-sans font-bold bg-cyan-500/10 py-0.5 px-2 rounded-full border border-cyan-500/20 text-cyan-400">
                          {tip.challengeDays} Day Trial
                        </span>
                      </h4>
                      <p className="text-[11px] text-white/40 leading-relaxed font-sans">{tip.description}</p>
                    </div>

                    <div className="text-right shrink-0 bg-cyan-500/5 hover:bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/10">
                      <span className="block text-[9px] text-[#00F5FF] font-mono font-bold">SAVINGS TARGET</span>
                      <span className="text-sm font-mono font-bold text-[#00F5FF]">{formatCurrencyValue(convertAmount(tip.estimatedSavings, "USD", displayCurrency, exchangeRates), displayCurrency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-[#0c0c0c]/40 border border-white/5 px-4 py-3.5 rounded-2xl flex justify-between items-center">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest font-bold">Compound Forecast</span>
              <span className="text-[11px] text-white/60 font-medium text-right font-sans leading-relaxed max-w-[260px]">{report.savingsProjection}</span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: CONVERSATIONAL ASSISTANT ('AURA') */}
      <div className="lg:col-span-5 bg-white/[0.03] rounded-[32px] border border-white/5 shadow-xl flex flex-col justify-between overflow-hidden h-full min-h-[580px]">
        
        {/* Terminal Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" />
            <div className="text-left font-mono">
              <span className="text-xs font-bold text-white tracking-wide block leading-none">Aura-V2 Pilot</span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase">Online & Synced</span>
            </div>
          </div>
          
          <span className="text-[10px] font-mono font-bold text-white/30 tracking-wider">CONTEXT ALIGNED</span>
        </div>

        {/* Message Log Grid */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[400px] bg-black/10 custom-scrollbar flex flex-col">
          {messages.map((msg) => {
            const isBot = msg.role === "assistant";
            return (
              <div 
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${isBot ? "self-start items-start" : "self-end items-end"}`}
              >
                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  isBot 
                    ? "bg-[#0c0c0c]/90 border border-white/5 text-white/90 rounded-tl-none font-sans" 
                    : "bg-white/10 text-white border border-white/5 rounded-tr-none font-sans shadow-md"
                }`}>
                  {msg.content}
                </div>
                <span className="text-[9px] font-mono text-white/30 mt-1 uppercase font-bold">{msg.timestamp}</span>
              </div>
            );
          })}

          {isChatTyping && (
            <div className="flex flex-col max-w-[80%] self-start items-start">
              <div className="p-4 bg-[#0c0c0c]/90 border border-white/5 text-cyan-400 rounded-2xl rounded-tl-none flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          {chatError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/15 text-rose-400 text-[10px] rounded-xl font-bold font-mono">
              * Aura Sync error: {chatError}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input form controls */}
        <div className="p-4 border-t border-white/5 bg-black/40 space-y-3">
          {/* Suggestion tags if chat history is short */}
          {messages.length < 3 && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold text-white/30 block uppercase select-none">SUGGESTED SEED QUERIES</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Am I spending too fast?",
                  "Analyze my subscription costs",
                  "Suggest a savings routine"
                ].map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => executeQuickQuestion(q)}
                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-white/80 rounded-lg font-mono font-bold transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text"
              placeholder="Ask Aura about your accounts, expenses, ratios..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-black border border-white/5 focus:border-cyan-400/40 focus:outline-none focus:ring-0 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/30 transition-colors"
            />
            <button 
              type="submit"
              disabled={isChatTyping || !chatInput.trim()}
              className="p-3 bg-[#00F5FF] text-black hover:bg-cyan-400 rounded-2xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
            >
              <Send className="w-4 h-4 text-black" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Custom hook to format stats nicely for the component
function useMemoStats(transactions: Transaction[], displayCurrency: string, exchangeRates: Record<string, number>) {
  return React.useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      const amt = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
      if (t.type === "income") income += amt;
      else expense += amt;
    });
    return { income, expense };
  }, [transactions, displayCurrency, exchangeRates]);
}
