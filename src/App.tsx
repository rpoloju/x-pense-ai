/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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
  Calculator
} from "lucide-react";

import { Transaction, Budget } from "./types";
import { INITIAL_TRANSACTIONS, CATEGORIES } from "./data";
import { Dashboard } from "./components/Dashboard";
import { TransactionHistory } from "./components/TransactionHistory";
import { BudgetSettings } from "./components/BudgetSettings";
import { AIAdvisor } from "./components/AIAdvisor";
import { FinancialCalculators } from "./components/FinancialCalculators";
import { CategoryIcon } from "./components/CategoryIcon";
import { CURRENCIES, DEFAULT_EXCHANGE_RATES, convertAmount, formatCurrencyValue } from "./utils/currencyUtils";

export default function App() {
  // Tabs: 'dashboard' | 'transactions' | 'budget' | 'ai'
  const [activeTab, setActiveTab] = useState<string>("dashboard");
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

      const defaultCatBudgets = CATEGORIES.filter(c => c.id !== "Income" && c?.id !== "Other").map(c => ({
        category: c.id,
        limit: c.id === "Housing & Rent" ? 20000 
             : c.id === "Food & Dining" ? 12000 
             : c.id === "Shopping" ? 8000 
             : c.id === "Entertainment" ? 6000
             : c.id === "Transportation" ? 5000
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
          const defaultCatBudgets = CATEGORIES.filter(c => c.id !== "Income" && c?.id !== "Other").map(c => ({
            category: c.id,
            limit: 8000
          }));
          setCategoryBudgets(defaultCatBudgets);
        }
      } else {
        const defaultCatBudgets = CATEGORIES.filter(c => c.id !== "Income" && c?.id !== "Other").map(c => ({
          category: c.id,
          limit: 8000
        }));
        setCategoryBudgets(defaultCatBudgets);
        localStorage.setItem("aura_category_budgets", JSON.stringify(defaultCatBudgets));
      }
    }
  }, []);

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
  };

  const handleImportTransactions = (imported: Omit<Transaction, "id">[]) => {
    const timestamp = Date.now();
    const freshTxList: Transaction[] = imported.map((tx, idx) => ({
      ...tx,
      id: `tx-import-${timestamp}-${idx}-${Math.floor(Math.random() * 10000)}`
    }));
    const updated = [...freshTxList, ...transactions];
    syncTransactions(updated);
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    syncTransactions(updated);
    if (selectedTransaction?.id === id) {
      setSelectedTransaction(null);
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
    { id: "budget", label: "Budgets", icon: Sliders },
    { id: "calculators", label: "Calculators", icon: Calculator },
    { id: "ai", label: "AI Insights", icon: BrainCircuit, highlight: true }
  ];

  return (
    <div id="aura-app" className="bg-[#050505] min-h-screen text-white flex flex-col justify-between overflow-x-hidden font-sans select-none antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* FIXED GLASS NAVIGATION BAR */}
      <header className="sticky top-0 z-40 w-full bg-[#050505]/75 backdrop-blur-md border-b border-white/5 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spinSlower"></div>
            </div>
            <div>
              <span className="text-sm font-sans font-extrabold tracking-tight text-white leading-none block uppercase">X-PENSE AI</span>
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#00F5FF] block mt-1 leading-none uppercase">Enterprise Wallet</span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center bg-white/[0.03] p-1 border border-white/5 rounded-2xl relative">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                    isActive 
                      ? "text-white" 
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="nav-backdrop"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-white/5 rounded-xl border border-white/5 -z-10"
                    />
                  )}
                  <Icon className={`w-4 h-4 ${item.highlight ? 'text-cyan-455' : 'text-white/50'}`} />
                  {item.label}
                  {item.highlight && <Sparkles className="w-3 h-3 text-cyan-400 fill-cyan-400/20" />}
                </button>
              );
            })}
          </nav>

          {/* Currency switcher & User badge */}
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

            <div className="flex items-center gap-3">
              <span className="hidden lg:block text-[10px] font-mono tracking-wider font-bold text-white/40 uppercase">SYS SECURE LINK</span>
              <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-cyan-405 text-xs font-mono flex items-center gap-1.5 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5FF] animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5FF]" />
                ACTIVE
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE FLOATING MENU BAR */}
      <div className="md:hidden fixed bottom-6 inset-x-4 z-40 bg-zinc-950/90 border border-white/5 p-1.5 rounded-3xl backdrop-blur-lg shadow-2xl flex justify-around">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all cursor-pointer ${
                isActive ? "bg-white/5 text-cyan-405 border border-white/5" : "text-white/40 hover:text-white/60"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN LAYOUT CANVAS CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8 pb-24 md:pb-8 leading-relaxed">
        
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

            {activeTab === "budget" && (
              <BudgetSettings 
                monthlyBudget={monthlyBudget}
                categoryBudgets={categoryBudgets}
                transactions={transactions}
                displayCurrency={displayCurrency}
                exchangeRates={exchangeRates}
                onUpdateMonthlyBudget={handleUpdateMonthlyBudget}
                onUpdateCategoryBudget={handleUpdateCategoryBudget}
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
      <footer className="w-full bg-[#050505]/40 py-5 text-center border-t border-white/5 flex flex-col items-center justify-center gap-1">
        <p className="text-[10px] font-mono text-white/30 uppercase select-none leading-none tracking-wider">
          X-PENSE AI Wallet System • Enterprise Server Release v3.0.0
        </p>
        <p className="text-[9px] font-mono text-white/20 leading-none select-none">
          Strict sandbox node. Optimized relative to workspace root.
        </p>
      </footer>
    </div>
  );
}
