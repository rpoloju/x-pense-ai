/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wallet, 
  Sparkles, 
  LayoutDashboard, 
  BookOpen, 
  Sliders, 
  BrainCircuit, 
  X, 
  Clock, 
  Calendar, 
  AlertOctagon, 
  Trash2,
  Lock,
  Compass,
  ArrowRight,
  Calculator,
  Camera,
  Upload,
  ChevronDown,
  MessageSquare,
  Bell
} from "lucide-react";

import { Transaction, Budget } from "./types";
import { INITIAL_TRANSACTIONS, CATEGORIES } from "./data";
import { 
  auth, 
  isFirebaseConfigured, 
  backupTransactionsToCloud, 
  syncSingleTransactionToCloud,
  deleteSingleTransactionFromCloud
} from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Dashboard } from "./components/Dashboard";
import { TransactionHistory } from "./components/TransactionHistory";
import { BudgetSettings } from "./components/BudgetSettings";
import { AIAdvisor } from "./components/AIAdvisor";
import { FinancialCalculators } from "./components/FinancialCalculators";
import { SMSSyncHub } from "./components/SMSSyncHub";
import { NotificationCenter } from "./components/NotificationCenter";
import { CategoryIcon } from "./components/CategoryIcon";
import { CURRENCIES, DEFAULT_EXCHANGE_RATES, convertAmount, formatCurrencyValue } from "./utils/currencyUtils";

interface AvatarProps {
  src: string;
  name: string;
  className?: string;
}

function AvatarComponent({ src, name, className = "w-10 h-10" }: AvatarProps) {
  const initial = (name || "U").charAt(0).toUpperCase();

  if (src && (src.startsWith("data:image") || src.startsWith("http"))) {
    return (
      <div className={`relative rounded-full overflow-hidden border border-white/10 shrink-0 ${className}`}>
        <img src={src} className="w-full h-full object-cover" alt={name} referrerPolicy="no-referrer" />
      </div>
    );
  }

  // Determine preset style
  let grad = "from-cyan-400 to-blue-600";
  if (src === "preset-2") grad = "from-emerald-400 to-teal-600";
  else if (src === "preset-3") grad = "from-purple-500 to-rose-500";
  else if (src === "preset-4") grad = "from-amber-400 to-orange-500";

  return (
    <div className={`relative rounded-full flex items-center justify-center bg-gradient-to-tr ${grad} text-white font-mono font-black border border-white/20 shadow-lg shadow-cyan-500/10 shrink-0 ${className}`}>
      <span className="text-[40%] select-none tracking-tight">{initial}</span>
      {/* Dynamic Cyber Inner Glow Ring */}
      <div className="absolute inset-0.5 rounded-full border border-white/10 pointer-events-none" />
    </div>
  );
}

export default function App() {
  // Tabs: 'dashboard' | 'transactions' | 'budget' | 'ai'
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("aura_user_name") || "Ravi";
  });
  const [profilePic, setProfilePic] = useState<string>(() => {
    return localStorage.getItem("aura_profile_pic") || "preset-1";
  });
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setProfilePic(base64);
        localStorage.setItem("aura_profile_pic", base64);
      };
      reader.readAsDataURL(file);
    }
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(60000); // 60,000 INR default
  const [categoryBudgets, setCategoryBudgets] = useState<Budget[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    return localStorage.getItem("aura_display_currency") || "INR";
  });

  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("aura_exchange_rates");
      return stored ? JSON.parse(stored) : DEFAULT_EXCHANGE_RATES;
    } catch {
      return DEFAULT_EXCHANGE_RATES;
    }
  });

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("aura_read_notification_ids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const unreadNotifCount = useMemo(() => {
    let count = 0;
    const isDaily = localStorage.getItem("aura_notif_daily_enabled") !== "false";
    const isWeekly = localStorage.getItem("aura_notif_weekly_enabled") !== "false";
    const isMonthly = localStorage.getItem("aura_notif_monthly_enabled") !== "false";

    const isRead = (id: string) => readNotifIds.includes(id);

    if (isDaily && !isRead("daily-summary-active")) count++;
    if (isWeekly && !isRead("weekly-summary-active")) count++;
    if (isMonthly && !isRead("monthly-summary-active")) count++;

    const thresholdExpense = Number(localStorage.getItem("aura_notif_threshold_expense") || "5000");
    const thresholdIncome = Number(localStorage.getItem("aura_notif_threshold_income") || "10000");

    transactions.forEach(t => {
      const amt = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
      if (t.type === "expense" && amt >= thresholdExpense && !isRead(`alert-expense-${t.id}`)) {
        count++;
      }
      if (t.type === "income" && amt >= thresholdIncome && !isRead(`alert-income-${t.id}`)) {
        count++;
      }
    });

    return count;
  }, [transactions, displayCurrency, exchangeRates, readNotifIds]);

  // Dynamic live exchange rate retrieval from a reliable, open endpoint (base currency: INR)
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/INR")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.result === "success" && data.rates) {
          const freshRates: Record<string, number> = {
            INR: 1.0,
            USD: data.rates.USD || 0.0119,
            EUR: data.rates.EUR || 0.0111,
            GBP: data.rates.GBP || 0.0093,
            JPY: data.rates.JPY || 1.87
          };
          setExchangeRates(freshRates);
          localStorage.setItem("aura_exchange_rates", JSON.stringify(freshRates));
        }
      })
      .catch((err) => {
        console.warn("Live exchange rate lookup offline, using embedded resilient fallbacks.", err);
      });
  }, []);

  // Initial local state synchronization
  useEffect(() => {
    // Check if display currency or default budget was ever initialized
    const isFirstRun = !localStorage.getItem("aura_display_currency");
    if (isFirstRun) {
      localStorage.setItem("aura_display_currency", "INR");
      localStorage.setItem("aura_monthly_budget", "60000");
      setMonthlyBudget(60000);

      const defaultCatBudgets = CATEGORIES.filter(c => !c.isIncome && c?.id !== "Other" && c?.id !== "Unknown").map(c => ({
        category: c.id,
        limit: c.id === "Housing & Rent" ? 20000 
             : c.id === "Food & Dining" ? 12000 
             : c.id === "Shopping" ? 8000 
             : c.id === "Entertainment" ? 6000
             : c.id === "Transportation" ? 5000
             : c.id === "GROCERY" ? 8000
             : 4000
      }));
      setCategoryBudgets(defaultCatBudgets);
      localStorage.setItem("aura_category_budgets", JSON.stringify(defaultCatBudgets));
    }

    // 1. Transactions loading
    const storedTx = localStorage.getItem("aura_transactions");
    if (storedTx) {
      try {
        setTransactions(JSON.parse(storedTx));
      } catch (e) {
        setTransactions(INITIAL_TRANSACTIONS);
      }
    } else {
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.setItem("aura_transactions", JSON.stringify(INITIAL_TRANSACTIONS));
    }

    // 2. Budget limits loading
    if (!isFirstRun) {
      const storedBudget = localStorage.getItem("aura_monthly_budget");
      if (storedBudget) {
        setMonthlyBudget(parseFloat(storedBudget) || 60000);
      } else {
        localStorage.setItem("aura_monthly_budget", "60000");
      }

      // 3. Category Budgets loading
      const storedCatBudgets = localStorage.getItem("aura_category_budgets");
      if (storedCatBudgets) {
        try {
          setCategoryBudgets(JSON.parse(storedCatBudgets));
        } catch (e) {
          const defaultCatBudgets = CATEGORIES.filter(c => !c.isIncome && c?.id !== "Other" && c?.id !== "Unknown").map(c => ({
            category: c.id,
            limit: 8000
          }));
          setCategoryBudgets(defaultCatBudgets);
        }
      } else {
        const defaultCatBudgets = CATEGORIES.filter(c => !c.isIncome && c?.id !== "Other" && c?.id !== "Unknown").map(c => ({
          category: c.id,
          limit: 8000
        }));
        setCategoryBudgets(defaultCatBudgets);
        localStorage.setItem("aura_category_budgets", JSON.stringify(defaultCatBudgets));
      }
    }
  }, []);

  // Listen to Google Auth State Changes
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        if (user.displayName) {
          setUserName(user.displayName);
          localStorage.setItem("aura_user_name", user.displayName);
        }
        if (user.photoURL) {
          setProfilePic(user.photoURL);
          localStorage.setItem("aura_profile_pic", user.photoURL);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2 AM Daily Automatic Cloud Backup Sync
  useEffect(() => {
    if (!auth) return;
    const checkAndSyncAt2AM = () => {
      const user = auth.currentUser;
      if (!user) return;
      
      const now = new Date();
      if (now.getHours() === 2) {
        const dateStr = now.toDateString();
        const lastSyncDate = localStorage.getItem("aura_last_2am_sync_date");
        if (lastSyncDate !== dateStr) {
          console.log("Auto-backup triggered at 2:00 AM.");
          backupTransactionsToCloud(user.uid, transactions)
            .then(() => {
              localStorage.setItem("aura_last_2am_sync_date", dateStr);
              console.log("2AM cloud backup succeeded.");
            })
            .catch(err => {
              console.error("2AM cloud backup failed:", err);
            });
        }
      }
    };

    checkAndSyncAt2AM();
    const interval = setInterval(checkAndSyncAt2AM, 60000);
    return () => clearInterval(interval);
  }, [transactions]);

  // Update localStorage helper
  const syncTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    localStorage.setItem("aura_transactions", JSON.stringify(updated));
  };

  const handleUpdateDisplayCurrency = (currencyCode: string) => {
    setDisplayCurrency(currencyCode);
    localStorage.setItem("aura_display_currency", currencyCode);
  };

  // State handlers
  const handleAddTransaction = (newTx: Omit<Transaction, "id">) => {
    const freshTx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`
    };
    const updated = [freshTx, ...transactions];
    syncTransactions(updated);

    const user = auth?.currentUser;
    if (user) {
      syncSingleTransactionToCloud(user.uid, freshTx).catch(err => console.error("Cloud insert failed:", err));
    }
  };

  const handleImportTransactions = (imported: Omit<Transaction, "id">[]) => {
    const timestamp = Date.now();
    const freshTxList: Transaction[] = imported.map((tx, idx) => ({
      ...tx,
      id: `tx-import-${timestamp}-${idx}-${Math.floor(Math.random() * 10000)}`
    }));
    const updated = [...freshTxList, ...transactions];
    syncTransactions(updated);

    const user = auth?.currentUser;
    if (user) {
      backupTransactionsToCloud(user.uid, updated).catch(err => console.error("Cloud batch sync failed:", err));
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    syncTransactions(updated);
    if (selectedTransaction?.id === id) {
      setSelectedTransaction(null);
    }

    const user = auth?.currentUser;
    if (user) {
      deleteSingleTransactionFromCloud(user.uid, id).catch(err => console.error("Cloud delete failed:", err));
    }
  };

  const handleUpdateMonthlyBudget = (limit: number) => {
    setMonthlyBudget(limit);
    localStorage.setItem("aura_monthly_budget", String(limit));
  };

  const handleUpdateCategoryBudget = (category: string, limit: number) => {
    const updated = categoryBudgets.map(b => b.category === category ? { ...b, limit } : b);
    setCategoryBudgets(updated);
    localStorage.setItem("aura_category_budgets", JSON.stringify(updated));
  };

  // Navigations mapping
  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: BookOpen },
    { id: "sms-sync", label: "SMS Sync", icon: MessageSquare },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "budget", label: "Budgets", icon: Sliders },
    { id: "calculators", label: "Calculators", icon: Calculator },
    { id: "ai", label: "AI Insights", icon: BrainCircuit, highlight: true }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div id="aura-app" className="bg-[#050505] min-h-screen text-white flex flex-col justify-between overflow-x-hidden font-sans select-none antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div
            key="welcome-pane"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-4 overflow-hidden"
          >
            {/* AMBIENT CYBER RING BACKGROUND */}
            <div className="absolute inset-0 bg-[#050505] opacity-90" />
            <div className="absolute top-[-25%] left-[-10%] w-[600px] h-[600px] bg-cyan-500/[0.04] rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-[140px] pointer-events-none" />

            <div className="relative flex flex-col items-center max-w-md w-full text-center px-6 py-10 bg-white/[0.015] border border-white/5 backdrop-blur-2xl rounded-[32px] shadow-2xl">
              {/* Spinning Ring Graphic */}
              <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
                  className="absolute inset-0 rounded-full border border-dashed border-cyan-500/20"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
                  className="absolute w-40 h-40 rounded-full border border-dashed border-cyan-400/10"
                />
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-500/8 to-blue-500/4 blur-lg"
                />
                
                {/* Embedded dynamic spark dot to represent quantum transition */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute inset-1 pointer-events-none"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00F5FF]/80 shadow-[0_0_12px_#00F5FF] absolute top-0 left-1/2 -translate-x-1/2" />
                </motion.div>

                {/* Profile Picture inside Spinning Ring on Welcome Screen */}
                <div className="relative group/avatar z-10">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                  >
                    <AvatarComponent src={profilePic} name={userName} className="w-24 h-24" />
                  </motion.div>
                </div>
              </div>

              {/* Text content & Inputs */}
              <div className="space-y-4 mb-8">
                <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest block">SECURITY PROTOCOL VERIFIED</span>
                
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-sans font-extrabold tracking-tight text-white leading-tight">
                    {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{userName}</span>
                  </h1>
                  
                  {/* Custom Name input box */}
                  <div className="flex justify-center items-center gap-2 mt-1 bg-white/[0.015] border border-white/5 rounded-xl px-2.5 py-1 w-fit mx-auto">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">SECURE NAME:</span>
                    <input
                      type="text"
                      id="name-input"
                      value={userName}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 16);
                        setUserName(val || "Ravi");
                        localStorage.setItem("aura_user_name", val || "Ravi");
                      }}
                      className="bg-transparent text-xs text-cyan-400 font-mono font-bold focus:outline-none w-20 border-b border-transparent focus:border-cyan-400 transition-all text-center select-all"
                      placeholder="Ravi"
                    />
                  </div>

                  {/* Preset Avatar Selection Row */}
                  <div className="flex items-center justify-center gap-2 mt-3 p-1 bg-white/[0.01] border border-white/5 rounded-xl w-fit mx-auto pr-2 pl-2">
                    <span className="text-[8px] font-mono text-white/35 uppercase tracking-widest pr-1">AVATAR PRESETS:</span>
                    <div className="flex items-center gap-1.5">
                      {["preset-1", "preset-2", "preset-3", "preset-4"].map((presetId) => {
                        let presetGrad = "from-cyan-400 to-blue-600";
                        if (presetId === "preset-2") presetGrad = "from-emerald-400 to-teal-600";
                        if (presetId === "preset-3") presetGrad = "from-purple-500 to-rose-500";
                        if (presetId === "preset-4") presetGrad = "from-amber-400 to-orange-500";
                        
                        const isSelected = profilePic === presetId;
                        return (
                          <button
                            key={presetId}
                            onClick={() => {
                              setProfilePic(presetId);
                              localStorage.setItem("aura_profile_pic", presetId);
                            }}
                            className={`w-4.5 h-4.5 rounded-full bg-gradient-to-tr ${presetGrad} border transition-all cursor-pointer relative flex items-center justify-center ${
                              isSelected ? "border-cyan-400 scale-110 ring-2 ring-cyan-400/20" : "border-white/15 hover:scale-105"
                            }`}
                          >
                            {isSelected && <div className="w-1 h-1 rounded-full bg-white select-none pointer-events-none" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-white/50 font-sans max-w-xs mx-auto leading-relaxed">
                  Unlock access to real-time currency conversions, AI budget forecasts, interactive widgets, and financial models.
                </p>
              </div>

              {/* Proceed CTA button */}
              <motion.button
                id="enter-dashboard"
                whileHover={{ scale: 1.015, boxShadow: "0 0 20px rgba(6, 182, 212, 0.25)" }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setShowWelcome(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-cyan-500/10 cursor-pointer relative group overflow-hidden border border-white/10"
              >
                GET INSIDE DASHBOARD
                <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1.5 transition-transform" />
              </motion.button>

              {/* High-fidelity parameters columns */}
              <div className="grid grid-cols-3 gap-3 w-full mt-7 pt-5 border-t border-white/5 text-center">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-mono text-white/30 block uppercase">SYNCED RECORDS</span>
                  <span className="text-[9.5px] font-mono text-cyan-400 font-bold uppercase">{transactions.length} Posts</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-mono text-white/30 block uppercase">CORE REGIME</span>
                  <span className="text-[9.5px] font-mono text-emerald-400 font-bold uppercase">SECURED</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-mono text-white/30 block uppercase">AI ENGINE</span>
                  <span className="text-[9.5px] font-mono text-blue-400 font-bold uppercase">ONLINE</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-app-main"
            initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0)" }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="flex-1 flex flex-col justify-between w-full relative"
          >
            {/* FIXED GLASS NAVIGATION BAR */}
            <header className="sticky top-0 z-40 w-full bg-[#050505]/75 backdrop-blur-md border-b border-b-white/5 px-4 py-3 md:px-8">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                
                {/* Logo brand & Current View Indicator */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center cursor-pointer" onClick={() => setShowWelcome(true)}>
                    <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spinSlower"></div>
                  </div>
                  <div>
                    <span className="text-sm font-sans font-extrabold tracking-tight text-white leading-none block uppercase">X-PENSE AI</span>
                    <span className="text-[9px] font-mono font-bold tracking-widest text-[#00F5FF] block mt-1 leading-none uppercase">Enterprise Wallet</span>
                  </div>
                  <div className="hidden sm:flex items-center pl-3 border-l border-white/10 ml-1">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-[9.5px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      {activeTab === "dashboard" && "Dashboard Portal"}
                      {activeTab === "transactions" && "Cash Posting Ledger"}
                      {activeTab === "sms-sync" && "SMS Linked Ledger"}
                      {activeTab === "notifications" && "Auditing Alerts"}
                      {activeTab === "budget" && "Limits & Controls"}
                      {activeTab === "calculators" && "Financial Suite"}
                      {activeTab === "ai" && "Advisor Deep Engine"}
                    </span>
                  </div>
                </div>

                {/* Currency switcher, Active system state, and Profile dropdown portal */}
                <div className="flex items-center gap-4">
                  <div className="relative" id="currency-switcher">
                    <select
                      value={displayCurrency}
                      onChange={(e) => handleUpdateDisplayCurrency(e.target.value)}
                      className="bg-[#0c0c0c] border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-mono font-bold uppercase text-[#00F5FF]/90 focus:text-white hover:text-white focus:outline-none focus:border-[#00F5FF]/40 transition-all cursor-pointer appearance-none pr-7 relative"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300F5FF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 6px center",
                        backgroundSize: "12px"
                      }}
                    >
                      {CURRENCIES.map((cur) => (
                        <option key={cur.code} value={cur.code} className="bg-black text-white text-[11px] font-mono">
                          {cur.code} ({cur.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-mono text-[#00F5FF]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F5FF] animate-ping" />
                    <span>SECURE NODE</span>
                  </div>

                  {/* Dynamic Alert Notification Bell */}
                  <div className="relative" id="notifications-bell">
                    <button
                      onClick={() => setActiveTab("notifications")}
                      className={`p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border transition-all cursor-pointer relative flex items-center justify-center ${
                        activeTab === "notifications" ? "border-cyan-400 text-cyan-400" : "border-white/5 text-white/70 hover:text-white"
                      }`}
                      title="Auditing Notifications Feed"
                    >
                      <Bell className="w-4 h-4 text-cyan-400" />
                      {unreadNotifCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 text-[8px] text-black font-mono font-bold rounded-full flex items-center justify-center animate-pulse">
                          {unreadNotifCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Profile Dropdown Container */}
                  <div className="relative" id="profile-dropdown-container">
                    <button
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-all border border-white/5 hover:border-white/15 cursor-pointer text-left focus:outline-none"
                    >
                      <AvatarComponent src={profilePic} name={userName} className="w-8 h-8" />
                      <div className="hidden sm:block pr-1">
                        <span className="text-[8px] font-mono text-[#00F5FF] font-bold block uppercase tracking-wider leading-none">SYS ACCOUNT</span>
                        <span className="text-xs font-sans font-extrabold text-white leading-none block mt-0.5">{userName}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-white/50 mr-1 hidden sm:block" />
                    </button>

                    <AnimatePresence>
                      {isProfileDropdownOpen && (
                        <>
                          {/* Dropdown Backdrop to close on outer click */}
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={() => setIsProfileDropdownOpen(false)}
                          />
                          
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2.5 w-68 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5"
                          >
                            {/* Profile Header Block */}
                            <div className="p-4 bg-white/[0.02] flex items-center gap-3">
                              <div className="relative group/avatar cursor-pointer">
                                <AvatarComponent src={profilePic} name={userName} className="w-12 h-12" />
                                {/* Small camera overlay on hover */}
                                <label htmlFor="dropdown-avatar-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                                  <Camera className="w-4 h-4 text-cyan-400" />
                                </label>
                                <input 
                                  type="file" 
                                  id="dropdown-avatar-upload" 
                                  accept="image/*" 
                                  onChange={(e) => {
                                    handleFileChange(e);
                                    setIsProfileDropdownOpen(false);
                                  }} 
                                  className="hidden" 
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-sans font-extrabold text-white truncate leading-tight">{userName}</p>
                                <p className="text-[9px] font-mono text-[#00F5FF] tracking-wider uppercase mt-0.5 truncate select-all">polojuraviteja@gmail.com</p>
                                
                                {/* Edit secure name input */}
                                <div className="mt-1.5 flex items-center gap-1">
                                  <span className="text-[8px] font-mono text-white/30 uppercase">EDIT:</span>
                                  <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => {
                                      const val = e.target.value.slice(0, 16);
                                      setUserName(val || "Ravi");
                                      localStorage.setItem("aura_user_name", val || "Ravi");
                                    }}
                                    className="bg-transparent text-[10px] text-cyan-400 border-b border-white/10 pb-0.5 font-mono focus:outline-none focus:border-cyan-400 w-24 px-0.5"
                                    placeholder="Update name"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Preset Avatar Selection Row */}
                            <div className="py-2.5 px-4 bg-white/[0.01]">
                              <span className="text-[8px] font-mono text-white/35 uppercase tracking-widest block mb-1.5">AVATAR PRESETS</span>
                              <div className="flex items-center gap-1.5">
                                {["preset-1", "preset-2", "preset-3", "preset-4"].map((presetId) => {
                                  let presetGrad = "from-cyan-400 to-blue-600";
                                  if (presetId === "preset-2") presetGrad = "from-emerald-400 to-teal-600";
                                  if (presetId === "preset-3") presetGrad = "from-purple-500 to-rose-500";
                                  if (presetId === "preset-4") presetGrad = "from-amber-400 to-orange-500";
                                  
                                  const isSelected = profilePic === presetId;
                                  return (
                                    <button
                                      key={presetId}
                                      onClick={() => {
                                        setProfilePic(presetId);
                                        localStorage.setItem("aura_profile_pic", presetId);
                                      }}
                                      className={`w-5.5 h-5.5 rounded-full bg-gradient-to-tr ${presetGrad} border transition-all cursor-pointer relative flex items-center justify-center ${
                                        isSelected ? "border-cyan-400 scale-105" : "border-white/15 hover:scale-105"
                                      }`}
                                    >
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </button>
                                  );
                                })}
                                
                                {/* Upload photo icon trigger */}
                                <label htmlFor="dropdown-avatar-upload-trigger" className="w-5.5 h-5.5 rounded-full border border-dashed border-white/20 hover:border-white/40 flex items-center justify-center transition-all cursor-pointer bg-white/[0.02]">
                                  <Upload className="w-2.5 h-2.5 text-white/50 hover:text-white" />
                                </label>
                                <input 
                                  type="file" 
                                  id="dropdown-avatar-upload-trigger" 
                                  accept="image/*" 
                                  onChange={(e) => {
                                    handleFileChange(e);
                                    setIsProfileDropdownOpen(false);
                                  }} 
                                  className="hidden" 
                                />
                              </div>
                            </div>

                            {/* Dropdown Navigation Menu */}
                            <div className="p-1.5 space-y-0.5">
                              <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest block px-2.5 py-1">NAVIGATION PORTALS</span>
                              {navigationItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => {
                                      setActiveTab(item.id);
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-between cursor-pointer group ${
                                      isActive 
                                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" 
                                        : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400 animate-pulse' : 'text-white/40 group-hover:text-white/60'}`} />
                                      <span>{item.label}</span>
                                    </div>
                                    {isActive ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                    ) : item.highlight ? (
                                      <Sparkles className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500/10" />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Session Lockout */}
                            <div className="p-1.5">
                              <button
                                onClick={() => {
                                  setShowWelcome(true);
                                  setIsProfileDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-[9px] font-mono text-white/40 hover:text-[#00F5FF] hover:bg-[#00F5FF]/5 transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>LOCK SECURE REGIME</span>
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </header>

            {/* REMOVED Navigation Row & Mobile Floating navbar as requested - Tabs consolidated under dropdown */}

            {/* MAIN LAYOUT CANVAS CONTAINER */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8 md:pb-8 leading-relaxed">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(2px)" }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                >
                  {activeTab === "dashboard" && (
                    <Dashboard 
                      transactions={transactions} 
                      monthlyBudget={monthlyBudget} 
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
                      onNavigateToTab={(tab) => setActiveTab(tab)}
                      onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                    />
                  )}
                  
                  {activeTab === "transactions" && (
                    <TransactionHistory 
                      transactions={transactions}
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
                      onAddTransaction={handleAddTransaction}
                      onDeleteTransaction={handleDeleteTransaction}
                      onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                      onImportTransactions={handleImportTransactions}
                    />
                  )}

                  {activeTab === "sms-sync" && (
                    <SMSSyncHub 
                      transactions={transactions}
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
                      onAddTransaction={handleAddTransaction}
                      onSyncTransactions={syncTransactions}
                    />
                  )}

                  {activeTab === "notifications" && (
                    <NotificationCenter 
                      transactions={transactions}
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
                      onAddTransaction={handleAddTransaction}
                      readNotifIds={readNotifIds}
                      setReadNotifIds={setReadNotifIds}
                    />
                  )}

                  {activeTab === "budget" && (
                    <BudgetSettings 
                      monthlyBudget={monthlyBudget}
                      categoryBudgets={categoryBudgets}
                      transactions={transactions}
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
                      onUpdateMonthlyBudget={handleUpdateMonthlyBudget}
                      onUpdateCategoryBudget={handleUpdateCategoryBudget}
                      firebaseUser={firebaseUser}
                      onSetTransactions={setTransactions}
                    />
                  )}

                  {activeTab === "ai" && (
                    <AIAdvisor 
                      transactions={transactions}
                      monthlyBudget={monthlyBudget}
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
                    />
                  )}

                  {activeTab === "calculators" && (
                    <FinancialCalculators 
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* THE FLYOUT FLY INSPECT PANEL FOR SELECTED TRANSACTION DETAILS */}
            <AnimatePresence>
              {selectedTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-end animate-fadeIn">
                  
                  {/* Dark fuzzy overlay backing */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedTransaction(null)}
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm cursor-pointer"
                  />

                  {/* Inspect sliding drawer */}
                  <motion.div 
                    initial={{ x: "100%", opacity: 0.9 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0.9 }}
                    transition={{ type: "spring", damping: 32, stiffness: 400 }}
                    className="relative w-full max-w-md h-full bg-[#0a0a0a] border-l border-white/5 shadow-2xl flex flex-col justify-between"
                  >
                    {/* Cover Top header */}
                    <div className="p-6 border-b border-white/5 bg-[#050505]/60 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-white/45 uppercase tracking-widest block mb-1">AUDIT INSPECT RECORD</span>
                        <h3 className="text-md font-sans font-bold text-white leading-none">Cash Posting Ledger</h3>
                      </div>
                      <button 
                        onClick={() => setSelectedTransaction(null)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Core detail summary */}
                    <div className="p-8 flex-1 space-y-6 overflow-y-auto">
                      <div className="text-center space-y-4">
                        <div className="inline-flex justify-center mb-1">
                          {(() => {
                            const spec = CATEGORIES.find(c => c.id === selectedTransaction.category) || CATEGORIES[CATEGORIES.length - 1];
                            return (
                              <div 
                                className="p-5 rounded-3xl border shadow-lg"
                                style={{ backgroundColor: `${spec.color}15`, borderColor: `${spec.color}25`, color: spec.color }}
                              >
                                <CategoryIcon name={spec.icon} className="w-8 h-8" />
                              </div>
                            );
                          })()}
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-lg font-sans font-bold text-white px-4 leading-snug">
                            {selectedTransaction.title}
                          </h2>
                          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                            {selectedTransaction.category} Channel
                          </span>
                        </div>

                        <div className="py-2 inline-block">
                          <span className={`text-4xl font-mono font-bold tracking-tight ${selectedTransaction.type === 'expense' ? 'text-white' : 'text-cyan-405'}`}>
                            {selectedTransaction.type === 'expense' ? "-" : "+"}
                            {formatCurrencyValue(selectedTransaction.amount, selectedTransaction.currency || "INR")}
                          </span>

                          {/* Show dynamic conversion estimate inside detailed view */}
                          {(selectedTransaction.currency || "INR").toUpperCase() !== displayCurrency.toUpperCase() && (
                            <span className="block text-xs font-mono font-bold text-[#00F5FF] mt-2 animate-fadeIn bg-cyan-950/25 border border-cyan-500/10 py-1.5 px-3 rounded-xl">
                              ≈ {selectedTransaction.type === 'expense' ? "-" : "+"}
                              {formatCurrencyValue(
                                convertAmount(
                                  selectedTransaction.amount,
                                  selectedTransaction.currency || "INR",
                                  displayCurrency,
                                  exchangeRates
                                ),
                                displayCurrency
                              )} ({displayCurrency})
                            </span>
                          )}

                          <span className="block text-[10px] text-white/40 font-mono uppercase mt-2">POSTED ACCOUNTING VALUE</span>
                        </div>
                      </div>

                      {/* Account parameters logs */}
                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <h4 className="text-[10px] font-mono uppercase font-bold text-white/40 leading-none mb-1">System parameters logs</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                            <span className="text-[9px] font-mono text-white/40 block uppercase">Posting Date</span>
                            <span className="text-xs text-white/80 font-medium font-sans flex items-center gap-1.5 mt-1 select-all">
                              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> 
                              {new Date(selectedTransaction.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>

                          <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                            <span className="text-[9px] font-mono text-white/40 block uppercase">Cycles Category</span>
                            <span className="text-xs text-white/85 font-medium font-sans flex items-center gap-1.5 mt-1">
                              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spinSlower" /> 
                              {selectedTransaction.isRecurring ? "Monthly Cycle" : "Single Event"}
                            </span>
                          </div>

                          <div className="col-span-2 p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                            <span className="text-[9px] font-mono text-white/40 block uppercase">Record Reference Hash</span>
                            <span className="text-[10.5px] text-cyan-400 font-mono tracking-tight block mt-1 overflow-x-auto custom-scrollbar select-all">
                              {selectedTransaction.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sub memo remarks description */}
                      {selectedTransaction.description && (
                        <div className="space-y-2 pt-4 border-t border-white/5">
                          <h4 className="text-[10px] font-mono uppercase font-bold text-white/45 leading-none">Supplemental remarks notes</h4>
                          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 text-xs text-white/70 leading-relaxed font-sans italic">
                            "{selectedTransaction.description}"
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete Posting controls and Actions */}
                    <div className="p-6 border-t border-white/5 bg-white/[0.01] space-y-2">
                      <button 
                        onClick={() => handleDeleteTransaction(selectedTransaction.id)}
                        className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/15 hover:bg-red-500 hover:text-white hover:border-transparent text-red-400 text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-2 shadow cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" /> ERASE AND DELETE POSTING
                      </button>
                      <p className="text-[9px] text-center text-white/30 font-mono">
                        * ERASURE IS PERMANENT • REMOVES ACCOUNT RATIO BALANCE CALCS
                      </p>
                    </div>

                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MINI FOOTER CREDITS INFO */}
            <footer className="w-full bg-[#050505]/40 py-5 text-center border-t border-white/5 flex flex-col items-center justify-center gap-1 mt-auto">
              <p className="text-[10px] font-mono text-white/30 uppercase select-none leading-none tracking-wider">
                X-PENSE AI Wallet System • Enterprise Server Release v3.0.0
              </p>
              <p className="text-[9px] font-mono text-white/20 leading-none select-none">
                Strict sandbox node. Optimized relative to workspace root.
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
