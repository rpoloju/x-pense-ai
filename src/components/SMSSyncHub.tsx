import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Smartphone, 
  Upload, 
  ChevronRight, 
  Sparkles, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Database,
  ArrowDownLeft,
  ArrowUpRight,
  Info
} from "lucide-react";
import { Transaction } from "../types";
import { CATEGORIES } from "../data";
import { CategoryIcon } from "./CategoryIcon";
import { formatCurrencyValue, convertAmount } from "../utils/currencyUtils";

interface SMSSyncHubProps {
  transactions: Transaction[];
  displayCurrency: string;
  exchangeRates: Record<string, number>;
  onAddTransaction: (newTx: Omit<Transaction, "id">) => void;
  onSyncTransactions: (updated: Transaction[]) => void;
}

export function SMSSyncHub({
  transactions,
  displayCurrency,
  exchangeRates,
  onAddTransaction,
  onSyncTransactions
}: SMSSyncHubProps) {
  const [smsInput, setSmsInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [lastParsedTx, setLastParsedTx] = useState<{
    amount: number;
    type: "expense" | "income";
    seller: string;
    currency: string;
    suggestedCategory: string;
  } | null>(null);

  // Status/toast indicators
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Loaded custom mappings from localStorage
  const [sellerMappings, setSellerMappings] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem("aura_seller_categories");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const triggerToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Pre-configured simulated text messages
  const SIMULATED_SMS = [
    {
      label: "Starbucks Spent (HDFC)",
      text: "HDFC Bank Alert: UPI debited INR 380.00 to STARBUCKS COFFEE on 12-Jun-2026. Bal: INR 42350."
    },
    {
      label: "Salary Deposit (SBI)",
      text: "SBI Alert: Your Acct ending 0394 was credited for INR 145000.00 from CORP SALARY on 01-Jun-2026."
    },
    {
      label: "Amazon Shopping (ICICI)",
      text: "Your ICICI Credit Card was charged INR 4500.00 at AMAZON.IN on 11-Jun-2026. Thank you."
    },
    {
      label: "Uber Taxi (Amex USD)",
      text: "Amex Alert: Billed USD 45.00 at UBER TRIP on 10-Jun-2026."
    },
    {
      label: "Unknown New Brand (Acme)",
      text: "Alert: UPI debited INR 1800.00 at ACME CYBERSPORTS on 12-Jun-2026."
    },
    {
      label: "Netflix Subscription",
      text: "Transaction Alert: Billed INR 649.00 on card for NETFLIX MEMB."
    }
  ];

  // Robust Client-side Regex parsing engine (fallback)
  const parseSMSOffline = (text: string) => {
    const rawText = text.toLowerCase();
    
    // 1. Detect Type
    let type: "expense" | "income" = "expense";
    if (
      rawText.includes("credited") || 
      rawText.includes("received") || 
      rawText.includes("refund") || 
      rawText.includes("salary") || 
      rawText.includes("deposited") || 
      rawText.includes("added to")
    ) {
      type = "income";
    }

    // 2. Extract Amount
    let amount = 0;
    // Look for typical currency notations followed by numbers e.g. Rs. 380, ₹380, INR 380, $45
    const amountRegex = /(?:rs\.?|inr|₹|usd|\$|eur|€|gbp|£)\s*([\d,]+(?:\.\d{1,2})?)/i;
    const match = text.match(amountRegex);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ""));
    } else {
      // General standalone float pattern
      const standalonePattern = /\b\d+(?:,\d{3})*(?:\.\d{1,2})?\b/;
      const standMatch = text.match(standalonePattern);
      if (standMatch) {
        amount = parseFloat(standMatch[0].replace(/,/g, ""));
      }
    }

    // 3. Extract Currency
    let currency = "INR";
    if (rawText.includes("$") || rawText.includes("usd")) currency = "USD";
    else if (rawText.includes("€") || rawText.includes("eur")) currency = "EUR";
    else if (rawText.includes("£") || rawText.includes("gbp")) currency = "GBP";
    else if (rawText.includes("¥") || rawText.includes("jpy")) currency = "JPY";

    // 4. Extract Seller/Merchant
    let seller = "Unknown Merchant";
    const merchantPatterns = [
      /at\s+([A-Za-z0-9\.\-\s]+?)(?:\s+on|\s+via|\s+using|\s+date|\s+\.|\s*$)/i,
      /to\s+([A-Za-z0-9\.\-\s]+?)(?:\s+on|\s+via|\s+using|\s+date|\s+\.|\s*$)/i,
      /for\s+([A-Za-z0-9\.\-\s]+?)(?:\s+at|\s+on|\s+via|\s+using|\s+\.|\s*$)/i,
      /from\s+([A-Za-z0-9\.\-\s]+?)(?:\s+for|\s+at|\s+on|\s+via|\s+using|\s+\.|\s*$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const mMatch = text.match(pattern);
      if (mMatch && mMatch[1]) {
        const parsed = mMatch[1].trim();
        const cleaned = parsed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s{2,}/)[0];
        const words = cleaned.split(" ").slice(0, 3).join(" ");
        if (words && words.length > 2 && !["a", "the", "an", "your", "my", "our", "their", "is", "was"].includes(words.toLowerCase())) {
          seller = words;
          break;
        }
      }
    }

    // Try typical keyword scanning matching general popular merchants
    const popularSellers = [
      "starbucks", "netflix", "spotify", "amazon", "apple", "uber", "swiggy", "zomato", "crossfit", "walmart"
    ];
    for (const brand of popularSellers) {
      if (rawText.includes(brand)) {
        seller = brand.charAt(0).toUpperCase() + brand.slice(1);
        break;
      }
    }

    return { amount, type, seller, currency };
  };

  // Primary function to process parsing
  const handleParseSMS = async (textToParse = smsInput) => {
    const trimmed = textToParse.trim();
    if (!trimmed) {
      setParseError("Please provide an SMS text message to inspect.");
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setLastParsedTx(null);

    try {
      // 1. Attempt Server-side AI parse
      const response = await fetch("/api/sms/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsText: trimmed })
      });

      if (!response.ok) {
        throw new Error("AI Endpoint response failed. Falling back to default pattern parser.");
      }

      const extracted = await response.json();
      
      // Determine Suggested Category based on matching algorithm
      const suggestedCategory = determineCategory(extracted.seller, extracted.type);

      setLastParsedTx({
        amount: extracted.amount,
        type: extracted.type,
        seller: extracted.seller,
        currency: extracted.currency || "INR",
        suggestedCategory
      });

    } catch (e: any) {
      console.warn("Gemini SMS parsing failed, executing optimized regex engine:", e);
      
      // Offline fallback parsing
      const extracted = parseSMSOffline(trimmed);
      const suggestedCategory = determineCategory(extracted.seller, extracted.type);

      setLastParsedTx({
        amount: extracted.amount,
        type: extracted.type,
        seller: extracted.seller,
        currency: extracted.currency,
        suggestedCategory
      });
      
      triggerToast("AI offline, completed offline parsing fallback.", "info");
    } finally {
      setIsParsing(false);
    }
  };

  // Helper matching logic: identify category by seller name or previous entries
  const determineCategory = (seller: string, type: "expense" | "income"): string => {
    if (type === "income") return "Income";

    const normalizedSeller = seller.trim().toLowerCase();

    // 1. Check user custom-defined mapping learning index
    if (sellerMappings[normalizedSeller]) {
      return sellerMappings[normalizedSeller];
    }

    // 2. Check historic transactions context to learn what category they used
    for (const tx of transactions) {
      const txTitleLower = tx.title.toLowerCase();
      const txDescLower = (tx.description || "").toLowerCase();
      const isMatch = txTitleLower.includes(normalizedSeller) || txDescLower.includes(normalizedSeller);
      
      if (isMatch && tx.category && tx.category !== "Unknown") {
        return tx.category;
      }
    }

    // 3. Fallback matching rules against standard merchants
    if (/uber|grab|lyft|cab|taxi|train|rail|transit|metro/i.test(normalizedSeller)) return "Transportation";
    if (/starbucks|coffee|swiggy|zomato|pizza|burger|cafe|restaurant|din/i.test(normalizedSeller)) return "Food & Dining";
    if (/amazon|walmart|shopping|target|clothing|sephora|nike|store/i.test(normalizedSeller)) return "Shopping";
    if (/netflix|spotify|hulu|steam|disney|entertainment|theatre/i.test(normalizedSeller)) return "Entertainment";
    if (/rent|apartment|lease|electric|utility|water|gas/i.test(normalizedSeller)) return "Housing & Rent";
    if (/gym|crossfit|health|pharmacy|doctor|hospital|supplement/i.test(normalizedSeller)) return "Health & Gym";

    // 4. Default to Unknown if first encounter
    return "Unknown";
  };

  // Add parsed transaction directly to the ledger
  const handleConfirmAndAdd = () => {
    if (!lastParsedTx) return;

    onAddTransaction({
      title: `${lastParsedTx.seller} (SMS Auto)`,
      amount: lastParsedTx.amount,
      type: lastParsedTx.type,
      category: lastParsedTx.suggestedCategory,
      date: new Date().toISOString().split("T")[0],
      description: `Parsed automatically from smartphone security logs: "${smsInput.slice(0, 50)}${smsInput.length > 50 ? '...' : ''}"`,
      currency: lastParsedTx.currency,
      isRecurring: false
    });

    triggerToast(`Added transactional record: ${lastParsedTx.seller}`);
    setLastParsedTx(null);
    setSmsInput("");
  };

  // Category change mappings resolver
  const handleAssignCategory = (txId: string, sellerName: string, selectedCategory: string) => {
    const normalizedSeller = sellerName.replace(/\(\s*SMS\s*Auto\s*\)/gi, "").trim().toLowerCase();
    
    // Save mapping custom indexed
    const updatedMappings = {
      ...sellerMappings,
      [normalizedSeller]: selectedCategory
    };
    setSellerMappings(updatedMappings);
    localStorage.setItem("aura_seller_categories", JSON.stringify(updatedMappings));

    // Batch update ALL 'Unknown' transactions that feature this merchant name to the chosen category
    const updatedTransactionsList = transactions.map((t) => {
      // Matches both direct exact or if details contain seller of interest & category is Unknown
      const isMatchingMerchant = t.title.toLowerCase().includes(normalizedSeller);
      if (isMatchingMerchant && t.category === "Unknown") {
        return {
          ...t,
          category: selectedCategory
        };
      }
      // Or matches active transaction specifically
      if (t.id === txId) {
        return {
          ...t,
          category: selectedCategory
        };
      }
      return t;
    });

    onSyncTransactions(updatedTransactionsList);
    triggerToast(`Mapped all "${sellerName}" transactions to ${selectedCategory}!`);
  };

  // Unresolved 'Unknown' transactions list computation
  const unresolvedTransactions = transactions.filter(t => t.category === "Unknown");

  return (
    <div className="space-y-6">
      
      {/* Dynamic Slide Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-24 right-4 md:right-8 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-mono font-bold ${
              toastMessage.type === "success" 
                ? "bg-emerald-950/95 border-emerald-500/25 text-emerald-400"
                : "bg-cyan-950/95 border-cyan-500/25 text-cyan-400"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Core Left Column: SMS Paste Terminal & Extraction */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.02]">
              <Smartphone className="w-32 h-32" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400">
                <MessageSquare className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-[#00F5FF]/80 uppercase tracking-widest block">TELECOMMUNICATIONS PORTAL</span>
                <h2 className="text-xl font-sans font-extrabold text-white">SMS Cash Posting Extract</h2>
              </div>
            </div>

            <p className="text-xs text-white/55 font-sans leading-relaxed mb-6">
              Paste transactional SMS receipts (bank alerts, card charges, UPI alerts) into the security terminal below. Aura will dynamically isolate values, credit/debit indicators, and target sellers.
            </p>

            {/* Paste Terminal Field */}
            <div className="space-y-3">
              <label className="text-[9.5px] font-mono text-white/35 uppercase tracking-wide block">Raw Mobile SMS Input Terminal</label>
              <textarea
                value={smsInput}
                onChange={(e) => setSmsInput(e.target.value)}
                placeholder="e.g., Billed INR 350.00 at STARBUCKS COFFEE on HDFC credit card..."
                rows={4}
                className="w-full bg-[#050505]/60 hover:bg-[#050505]/80 focus:bg-black/90 p-4 border border-white/5 hover:border-white/10 focus:border-cyan-500/30 rounded-2xl text-xs font-mono text-cyan-400 placeholder-white/20 focus:outline-none transition-all leading-relaxed focus:ring-1 focus:ring-cyan-500/10 custom-scrollbar"
              />

              <div className="flex justify-between items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setSmsInput("")}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-mono text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Clear Terminal
                </button>

                <button
                  onClick={() => handleParseSMS()}
                  disabled={isParsing || !smsInput.trim()}
                  className="px-6 py-2.5 rounded-2xl bg-[#00F5FF]/10 hover:bg-[#00F5FF]/20 text-cyan-400 border border-cyan-500/15 disabled:bg-white/[0.02] disabled:text-white/20 disabled:border-transparent text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>PARSING SECURITY STREAM...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>EXHAUSTIVE SMS PARSE</span>
                    </>
                  )}
                </button>
              </div>

              {parseError && (
                <div className="mt-3 p-3.5 bg-red-500/10 border border-red-500/15 rounded-xl text-[11px] font-mono text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>

            {/* Simulated Live Feed Triggers */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <span className="text-[9px] font-mono font-black text-white/40 uppercase tracking-widest block mb-3">SIMULATE REAL-TIME INCOMING SMS INBOX</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SIMULATED_SMS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSmsInput(sample.text);
                      handleParseSMS(sample.text);
                      triggerToast(`Simulated reception: ${sample.label}`, "info");
                    }}
                    className="p-2.5 bg-white/[0.015] hover:bg-cyan-500/[0.04] border border-white/5 hover:border-cyan-500/20 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] font-sans font-bold text-white/70 group-hover:text-cyan-400 block truncate">{sample.label}</span>
                    <span className="text-[8px] font-mono text-white/30 truncate block mt-0.5">{sample.text}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Interactive Parsing Confirmer Outcome */}
          <AnimatePresence>
            {lastParsedTx && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-gradient-to-br from-cyan-950/15 to-blue-950/5 border border-cyan-500/20 backdrop-blur-2xl rounded-3xl p-6 relative overflow-hidden"
              >
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-[#00F5FF] uppercase tracking-wider bg-cyan-950/40 border border-cyan-500/25 px-2 py-0.5 rounded-md">SMS RESOLVED</span>
                    <h3 className="text-md font-sans font-black text-white mt-2">Incoming Posting Confirmer</h3>
                  </div>
                  <XIsButton onClick={() => setLastParsedTx(null)} />
                </div>

                {/* Display Block Details */}
                <div className="p-4 bg-[#050505]/40 rounded-2xl border border-white/5 space-y-4 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Isolated Seller</span>
                    <span className="text-xs font-mono font-bold text-white uppercase bg-white/5 px-2.5 py-1 rounded-lg">
                      {lastParsedTx.seller}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Posting Value</span>
                    <span className={`text-lg font-mono font-bold ${lastParsedTx.type === "expense" ? "text-white" : "text-cyan-400"}`}>
                      {lastParsedTx.type === "expense" ? "-" : "+"}
                      {formatCurrencyValue(lastParsedTx.amount, lastParsedTx.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Account flow direction</span>
                    <span className="text-[10px] font-mono font-bold flex items-center gap-1">
                      {lastParsedTx.type === "expense" ? (
                        <>
                          <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-rose-400 uppercase">Debited Outflow</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-400 uppercase">Credited Inflow</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Learned Category</span>
                    {lastParsedTx.suggestedCategory === "Unknown" ? (
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 font-black flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        <span>FIRST ENCOUNTER (UNKNOWN)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-sans text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{lastParsedTx.suggestedCategory}</span>
                      </span>
                    )}
                  </div>
                </div>

                {lastParsedTx.suggestedCategory === "Unknown" && (
                  <p className="text-[11px] font-sans text-rose-400/80 leading-relaxed mb-4 flex items-start gap-1.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                    <Info className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>The seller <strong>"{lastParsedTx.seller}"</strong> has never appeared before. Aura has flagged it temporarily under <strong>"Unknown / Uncategorized"</strong>. You can safely add it and assign a persistent category directly in the classifier on the right!</span>
                  </p>
                )}

                {/* Confirm additions controls */}
                <button
                  onClick={handleConfirmAndAdd}
                  className="w-full py-3.5 bg-[#00F5FF] hover:bg-[#00F5FF]/90 text-[#050505] rounded-2xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4.5 h-4.5" />
                  <span>AUTHORIZE AND LOG RECORD</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Right Column: Unresolved Transactions Classifier & Learned index */}
        <div className="col-span-1 lg:col-span-5 space-y-6">

          {/* Unresolved List Applier */}
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl rounded-3xl p-6 relative">
            <div className="absolute top-4 right-4 text-rose-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </div>

            <h3 className="text-md font-sans font-bold text-white mb-1.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Unresolved Classifications</span>
            </h3>
            
            <p className="text-xs text-white/45 font-sans leading-relaxed mb-4">
              Here are transactions Aura has marked as <span className="text-rose-400 font-bold">Unknown</span>. Assigning a category here teaches the learning system how to file future postings automatically.
            </p>

            <div className="space-y-3 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {unresolvedTransactions.length === 0 ? (
                <div className="py-12 text-center bg-[#050505]/30 rounded-2xl border border-dashed border-white/5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/35 mx-auto mb-2.5" />
                  <p className="text-xs font-mono text-white/30 uppercase">ALL SMS WELL CLASSIFIED</p>
                  <p className="text-[10px] text-white/20 mt-1">Learner index maps out all sellers correctly.</p>
                </div>
              ) : (
                unresolvedTransactions.map((tx) => {
                  const cleanedTitleName = tx.title.replace(/\(\s*SMS\s*Auto\s*\)/gi, "").trim();
                  return (
                    <div 
                      key={tx.id}
                      className="p-3.5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-2xl transition-all space-y-3 animate-fadeIn"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-sans font-black text-white leading-snug">{cleanedTitleName}</p>
                          <span className="text-[8.5px] font-mono text-white/45 mt-0.5 block">{tx.date} • {tx.id.split("-")[2]}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#F43F5E]">
                          -{formatCurrencyValue(tx.amount, tx.currency)}
                        </span>
                      </div>

                      {/* Dropdown Options Category mapping selector */}
                      <div className="relative pt-1">
                        <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest block mb-1">CHOOSE PERSISTENT CATEGORY</label>
                        <select
                          onChange={(e) => handleAssignCategory(tx.id, cleanedTitleName, e.target.value)}
                          defaultValue=""
                          className="w-full bg-[#050505] p-2 border border-rose-500/15 rounded-xl text-[10.5px] font-mono text-rose-400 cursor-pointer focus:outline-none focus:border-cyan-500/50 hover:bg-black/80 transition-all font-bold"
                        >
                          <option value="" disabled>--- SELECT CATEGORY ---</option>
                          {CATEGORIES.filter(c => c.id !== "Unknown" && !c.isIncome).map((c) => (
                            <option key={c.id} value={c.id} className="bg-[#050505] text-white">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active learned system mapping index */}
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl rounded-3xl p-6 relative">
            <h3 className="text-xs font-mono font-black text-white/45 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Learner Database Index</span>
            </h3>

            <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
              {Object.keys(sellerMappings).length === 0 ? (
                <p className="text-[10px] font-mono text-white/20 uppercase py-2 leading-normal">
                  Index empty. Map an unknown merchant category above to initiate training.
                </p>
              ) : (
                Object.entries(sellerMappings).map(([seller, catId]) => {
                  const spec = CATEGORIES.find(c => c.id === catId);
                  return (
                    <div 
                      key={seller}
                      className="flex justify-between items-center gap-4 py-1.5 px-2.5 bg-[#050505]/40 rounded-xl border border-white/[0.02]"
                    >
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase truncate leading-none">{seller}</span>
                      <span 
                        className="text-[9px] font-sans font-bold px-2 py-0.5 rounded border leading-none flex items-center gap-1"
                        style={{ color: spec?.color, borderColor: spec ? `${spec.color}25` : "transparent", backgroundColor: spec ? `${spec.color}10` : "transparent" }}
                      >
                        <CategoryIcon name={spec?.icon || "HelpCircle"} className="w-2.5 h-2.5" />
                        <span>{spec?.name}</span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

// Compact X button sub component
function XIsButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/50 hover:text-white transition-all cursor-pointer"
    >
      <XIcon className="w-3.5 h-3.5" />
    </button>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
