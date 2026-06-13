import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  Sliders, 
  HelpCircle, 
  Save, 
  Settings2,
  Lock,
  Unlock,
  Sparkles,
  Trophy,
  AlertTriangle,
  Percent,
  CheckCircle2,
  ShieldClose,
  Cloud,
  Database,
  RefreshCw,
  LogOut,
  Check,
  ChevronRight
} from "lucide-react";
import { Transaction, Budget } from "../types";
import { CATEGORIES } from "../data";
import { CategoryIcon } from "./CategoryIcon";
import { convertAmount, formatCurrencyValue } from "../utils/currencyUtils";
import { 
  loginWithGoogle, 
  logoutUser, 
  isFirebaseConfigured, 
  backupTransactionsToCloud, 
  fetchTransactionsFromCloud 
} from "../lib/firebase";

interface BudgetSettingsProps {
  monthlyBudget: number;
  categoryBudgets: Budget[];
  transactions: Transaction[];
  displayCurrency: string;
  exchangeRates: Record<string, number>;
  onUpdateMonthlyBudget: (limit: number) => void;
  onUpdateCategoryBudget: (category: string, limit: number) => void;
  firebaseUser?: any;
  onSetTransactions?: (txs: Transaction[]) => void;
}

export function BudgetSettings({
  monthlyBudget,
  categoryBudgets,
  transactions,
  displayCurrency,
  exchangeRates,
  onUpdateMonthlyBudget,
  onUpdateCategoryBudget,
  firebaseUser,
  onSetTransactions
}: BudgetSettingsProps) {
  // Local edit states
  const [editingOverall, setEditingOverall] = useState(false);
  const [overallInput, setOverallInput] = useState(String(monthlyBudget));
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  React.useEffect(() => {
    setOverallInput(String(monthlyBudget));
  }, [monthlyBudget]);

  // Compute expenses grouped by category
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === "expense") {
        const amt = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
        grouped[t.category] = (grouped[t.category] || 0) + amt;
      }
    });
    return grouped;
  }, [transactions, displayCurrency, exchangeRates]);

  // Handle saving primary monthly budget limit
  const handleSaveOverall = () => {
    const val = parseFloat(overallInput);
    if (!isNaN(val) && val > 0) {
      onUpdateMonthlyBudget(val);
      setEditingOverall(false);
    }
  };

  // Determine achievement milestones based on transaction logic
  const achievements = useMemo(() => {
    const totalExpenses = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates), 0);

    const subscriptionSpend = transactions
      .filter(t => t.type === "expense" && t.category === "Entertainment")
      .reduce((sum, t) => sum + convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates), 0);

    const coffeeSpend = transactions
      .filter(t => t.type === "expense" && t.title.toLowerCase().includes("coffee"))
      .reduce((sum, t) => sum + convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates), 0);

    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates), 0);

    const coffeeLimit = convertAmount(20, "USD", displayCurrency, exchangeRates);
    const subscriptionLimit = convertAmount(44, "USD", displayCurrency, exchangeRates);
    const depositLimit = convertAmount(1500, "USD", displayCurrency, exchangeRates);

    return [
      {
        id: "ach-1",
        title: "Frugal Alchemist",
        description: "Spend strictly under 70% of your macro monthly budget limit.",
        status: totalExpenses < monthlyBudget * 0.7 ? "unlocked" : "locked",
        metric: `Spent: ${formatCurrencyValue(totalExpenses, displayCurrency)} / ${formatCurrencyValue(monthlyBudget * 0.7, displayCurrency)} max`,
        badgeColor: "from-amber-400 to-amber-600",
      },
      {
        id: "ach-2",
        title: "Brewing Purist",
        description: `Keep gourmet coffee store purchases below ${formatCurrencyValue(coffeeLimit, displayCurrency)} this month.`,
        status: coffeeSpend <= coffeeLimit ? "unlocked" : "locked",
        metric: `Spent: ${formatCurrencyValue(coffeeSpend, displayCurrency)} / ${formatCurrencyValue(coffeeLimit, displayCurrency)}`,
        badgeColor: "from-emerald-400 to-emerald-600",
      },
      {
        id: "ach-3",
        title: "Streaming Diet",
        description: `Trim monthly Entertainment subscriptions below ${formatCurrencyValue(subscriptionLimit, displayCurrency)}.`,
        status: subscriptionSpend < subscriptionLimit ? "unlocked" : "locked",
        metric: `Spent: ${formatCurrencyValue(subscriptionSpend, displayCurrency)} / ${formatCurrencyValue(subscriptionLimit, displayCurrency)}`,
        badgeColor: "from-blue-400 to-indigo-600",
      },
      {
        id: "ach-4",
        title: "Deposit Maximizer",
        description: `Earn more than ${formatCurrencyValue(depositLimit, displayCurrency)} total in monthly deposits.`,
        status: totalIncome >= depositLimit ? "unlocked" : "locked",
        metric: `Deposited: ${formatCurrencyValue(totalIncome, displayCurrency)} / ${formatCurrencyValue(depositLimit, displayCurrency)}`,
        badgeColor: "from-purple-400 to-pink-600"
      }
    ];
  }, [transactions, monthlyBudget, displayCurrency, exchangeRates]);

  const totalExpenseVolume = useMemo(() => {
    return transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates), 0);
  }, [transactions, displayCurrency, exchangeRates]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* LANDING CAP */}
      <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[32px]">
        <h2 className="text-xl md:text-2xl font-bold font-sans text-white mb-1">Limits Controls</h2>
        <p className="text-xs text-white/40">Establish ceiling safeguards, custom category limits, and track savings checkpoints</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT RIG: Overall limits and sliders */}
        <div className="lg:col-span-7 space-y-6">
          {/* Overall Macro Budget Card */}
          <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-3xl group-hover:bg-cyan-400/10 transition-all duration-500 animate-pulse" />
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block mb-1">CEILING BUDGET CAP</span>
                <h3 className="text-md font-sans font-bold text-white">Monthly Aggregate Limit</h3>
              </div>
              <button 
                onClick={() => {
                  if (editingOverall) handleSaveOverall();
                  else {
                    setOverallInput(String(monthlyBudget));
                    setEditingOverall(true);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono font-bold text-white transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
              >
                {editingOverall ? (
                  <>
                    <Save className="w-3.5 h-3.5 text-cyan-400" /> SAVE CAP
                  </>
                ) : (
                  <>
                    <Settings2 className="w-3.5 h-3.5 text-white/40" /> ADJUST
                  </>
                )}
              </button>
            </div>

            {editingOverall ? (
              <div className="space-y-3 py-2">
                <div className="flex gap-2">
                  <span className="text-[10.5px] font-mono text-[#00F5FF]/80 font-bold self-center px-1.5 bg-cyan-950/20 border border-cyan-500/10 rounded">{displayCurrency}</span>
                  <input 
                    type="number"
                    value={overallInput}
                    onChange={(e) => setOverallInput(e.target.value)}
                    className="flex-1 bg-black border border-white/5 focus:border-cyan-400/40 focus:outline-none rounded-xl px-3 py-2 text-md text-white font-mono font-bold"
                  />
                </div>
                <p className="text-[10px] text-cyan-350 font-mono">* Limits govern absolute dashboard alert metrics</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl font-light font-sans text-white tracking-tighter leading-none">
                  {formatCurrencyValue(monthlyBudget, displayCurrency)}
                  <span className="text-xs text-white/40 font-medium font-mono lowercase"> / month ceiling limit</span>
                </div>

                {/* Progress representing aggregated expenditures */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between font-mono text-[10px] uppercase text-white/40">
                    <span>Aggregated Expenditures</span>
                    <span>{Math.round((totalExpenseVolume / monthlyBudget) * 100)}% Saturation</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 leading-none">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        totalExpenseVolume > monthlyBudget ? "bg-rose-500" :
                        totalExpenseVolume > monthlyBudget * 0.8 ? "bg-amber-400" :
                        "bg-gradient-to-r from-cyan-400 to-blue-500"
                      }`}
                      style={{ width: `${Math.min(100, (totalExpenseVolume / monthlyBudget) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category Budgets controls list */}
          <div className="bg-white/[0.03] p-8 rounded-[32px] border border-white/5 space-y-4 shadow-lg">
            <div>
              <h3 className="text-md font-sans font-bold text-white">Segment Target Enforcer</h3>
              <p className="text-xs text-white/40">Manage spending bounds across individual category channels</p>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {CATEGORIES.filter(c => !c.isIncome && c.id !== "Other" && c.id !== "Unknown").map(cat => {
                const targetBudget = categoryBudgets.find(b => b.category === cat.id) || { category: cat.id, limit: 300 };
                const spent = expensesByCategory[cat.id] || 0;
                const ratio = Math.min(100, spent > 0 ? (spent / targetBudget.limit) * 100 : 0);

                let badgeText = "OPTIMAL";
                let badgeClass = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
                
                if (spent > targetBudget.limit) {
                  badgeText = "OVER CAP";
                  badgeClass = "bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse font-bold";
                } else if (spent > targetBudget.limit * 0.8) {
                  badgeText = "CRITICAL LIMIT";
                  badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                }

                return (
                  <div key={cat.id} className="p-4 rounded-2xl bg-[#0c0c0c]/40 border border-white/5 hover:border-white/10 transition-all space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-1.5 rounded-lg border text-white"
                          style={{ backgroundColor: `${cat.color}15`, borderColor: `${cat.color}25`, color: cat.color }}
                        >
                          <CategoryIcon name={cat.icon} className="w-4.5 h-4.5" />
                        </div>
                        <span className="text-xs font-sans font-bold text-white/80">{cat.name}</span>
                      </div>
                      
                      {/* Limit input */}
                      <div className="flex items-center gap-3">
                        <span className={badgeClass + " px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-bold"}>
                          {badgeText}
                        </span>
                        
                        <div className="flex items-center gap-1.5 bg-black border border-white/5 px-3 py-1.5 rounded-xl">
                          <span className="text-[10px] font-mono text-[#00F5FF] font-bold">{displayCurrency}</span>
                          <input 
                            type="number"
                            value={targetBudget.limit}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) {
                                onUpdateCategoryBudget(cat.id, val);
                              }
                            }}
                            className="bg-transparent text-xs font-mono font-bold text-white w-14 focus:outline-none focus:ring-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Progress slider bar showing target ratios */}
                    <div className="space-y-1">
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${ratio}%`,
                            backgroundColor: spent > targetBudget.limit ? "#EF4444" : spent > targetBudget.limit * 0.8 ? "#F59E0B" : cat.color 
                          }}
                        />
                      </div>
                      <div className="flex justify-between font-mono text-[9px] text-white/30 font-bold">
                        <span>Spent: {formatCurrencyValue(spent, displayCurrency)}</span>
                        <span>Bound: {formatCurrencyValue(targetBudget.limit, displayCurrency)} Cap</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT RIG: Gamified achievements & Milestones */}
        <div className="lg:col-span-5 bg-white/[0.03] p-6 rounded-[32px] border border-white/5 shadow-xl space-y-5">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <h3 className="text-md font-sans font-bold text-white">Savings Vault Badge</h3>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Automated Milestones</p>
            </div>
          </div>

          <p className="text-xs text-white/40 leading-relaxed">
            These rewards unlock dynamically based on your expenditures. Balance your ledgers to claim your digital trophy credentials.
          </p>

          <div className="space-y-3">
            {achievements.map((ach) => {
              const isUnlocked = ach.status === "unlocked";

              return (
                <div 
                  key={ach.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                    isUnlocked 
                      ? "bg-[#0c0c0c]/40 border-white/5 shadow-md scale-[1.01]" 
                      : "bg-[#0c0c0c]/10 border-white/5 opacity-30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="space-y-1">
                      <h4 className="text-sm font-sans font-bold text-white flex items-center gap-1.5">
                        {ach.title}
                        {isUnlocked && <Sparkles className="w-4 h-4 text-cyan-400" />}
                      </h4>
                      <p className="text-[11px] text-white/40 leading-snug">{ach.description}</p>
                    </div>

                    <div className={`p-2 rounded-xl shrink-0 border ${
                      isUnlocked 
                        ? `bg-[#00F5FF]/10 border-[#00F5FF]/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]` 
                        : "bg-white/5 border-white/5 text-white/20"
                    }`}>
                      {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-black/60 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest font-bold font-semibold">Progress</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{ach.metric}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CLOUD SECURE BACKUP VAULT PANEL */}
      <div className="bg-white/[0.03] border border-white/5 p-6 md:p-8 rounded-[32px] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#00F5FF]/10 to-blue-500/10 border border-[#00F5FF]/20 text-cyan-400">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold font-sans text-white flex items-center gap-2">
                Cloud Vault Ledger Sync
                <span className="text-[9px] font-mono tracking-widest uppercase bg-[#00F5FF]/10 border border-[#00F5FF]/20 text-cyan-400 px-2.5 py-0.5 rounded-full">
                  Google Accounts
                </span>
              </h3>
              <p className="text-xs text-white/40 mt-1 max-w-xl animate-fadeIn">
                Activate real-time Google user identity mapping, structured Firestore subcollection synchronization, daily 2:00 AM auto-sync checkouts, and historical restore capabilities matching across phone transformations.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex gap-2">
            {!isFirebaseConfigured && (
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/5 border border-amber-400/20 px-3 py-1.5 rounded-xl uppercase">
                ⚙️ Sandbox Simulated Mode
              </span>
            )}
            {firebaseUser ? (
              <div className="flex items-center gap-2 bg-black/60 border border-white/5 px-3 py-1.5 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Live Cloud Active
                </span>
              </div>
            ) : isFirebaseConfigured ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider">
                  Cloud Disconnected
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sync Action Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* USER CARD PROFILE PORTAL */}
          <div className="lg:col-span-5 bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
            {firebaseUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {firebaseUser.photoURL ? (
                    <img src={firebaseUser.photoURL} alt={firebaseUser.displayName || "Google User"} className="w-12 h-12 rounded-full border border-cyan-400/40" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 font-bold flex items-center justify-center text-white font-sans text-lg">
                      {(firebaseUser.displayName || firebaseUser.email || "G").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono text-cyan-400 font-bold block uppercase tracking-wider">Authenticated account</span>
                    <h4 className="text-md font-sans font-bold text-white leading-tight truncate">{firebaseUser.displayName || "Google User"}</h4>
                    <span className="text-xs text-white/45 font-mono truncate block select-all">{firebaseUser.email}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#0a0a0a] rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9.5px] font-mono font-bold text-[#00F5FF] uppercase block tracking-wider">Live auto-sync Status</span>
                  <p className="text-[11px] text-white/50 leading-relaxed font-sans">
                    Secure transaction backups are automatically initiated at 2:00 AM daily when app is active. Manual backups are archived below.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await logoutUser();
                      setSyncStatus("Session terminated.");
                    } catch (e: any) {
                      setSyncStatus(`Sign out failed: ${e.message}`);
                    }
                  }}
                  className="px-4 py-2 border border-white/10 hover:border-red-500/20 bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 text-xs font-mono font-bold rounded-xl transition-all uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Cloud Session</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 my-auto py-2">
                <div className="space-y-1">
                  <h4 className="text-[13px] font-mono font-bold text-white/80 uppercase">No Cloud Mapping Connected</h4>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Connect your account to establish a secure database backup channel and synchronize transactions immediately.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      setIsSyncing(true);
                      setSyncStatus("Opening Google authentication pipeline...");
                      if (!isFirebaseConfigured) {
                        // Sandbox simulation login
                        setTimeout(() => {
                          const fakeUser = {
                            uid: "sandbox-ravi-uid-123456",
                            displayName: "Poloju Raviteja",
                            email: "polojuraviteja@gmail.com",
                            photoURL: null
                          };
                          // Save mock backup
                          setSyncStatus("Connected via local simulation gateway successfully!");
                          setIsSyncing(false);
                          
                          // Save in localStorage for persistence
                          localStorage.setItem("fake_google_user", JSON.stringify(fakeUser));
                          window.location.reload(); // Quick refresh to load
                        }, 750);
                      } else {
                        await loginWithGoogle();
                        setSyncStatus("Successfully synchronized credentials with Firebase!");
                      }
                    } catch (err: any) {
                      console.error(err);
                      setSyncStatus(`Authentication handshake error: ${err.message}`);
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-350 hover:to-blue-450 border border-cyan-400/20 hover:border-cyan-400/40 text-black font-extrabold text-xs font-mono tracking-wider rounded-xl uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Database className="w-4 h-4 text-black" />
                  <span>Connect Google Account</span>
                </button>
              </div>
            )}
          </div>

          {/* BACKUP & RESTORE ACTIONS */}
          <div className="lg:col-span-7 bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-white/70 uppercase tracking-widest">Backup & Recovery Controls</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BACKUP BLOCK */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col justify-between space-y-2.5 hover:border-white/10 transition-all duration-300">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-[#00F5FF] font-bold block uppercase tracking-widest">Post Ledger</span>
                    <h5 className="text-sm font-sans font-extrabold text-white">Archive Backup Now</h5>
                    <p className="text-[11px] text-white/35 leading-snug">
                      Instantly archive current transactions ({transactions.length} items) into clean secure storage.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setIsSyncing(true);
                      setSyncStatus("Pushing transactions ledger...");
                      const user = firebaseUser || (localStorage.getItem("fake_google_user") ? JSON.parse(localStorage.getItem("fake_google_user") || "{}") : null);
                      const uid = user?.uid;
                      if (!uid) {
                        setSyncStatus("Error: Connect Google account first.");
                        setIsSyncing(false);
                        return;
                      }

                      if (isFirebaseConfigured) {
                        try {
                          await backupTransactionsToCloud(uid, transactions);
                          setSyncStatus(`Successfully backed up ${transactions.length} transactions to cloud storage!`);
                        } catch (e: any) {
                          setSyncStatus(`Failed: ${e.message}`);
                        }
                      } else {
                        // Sandbox push
                        localStorage.setItem(`sandbox_txs_user_${uid}`, JSON.stringify(transactions));
                        setSyncStatus(`Successfully backed up ${transactions.length} transactions in Simulated Cloud sandbox.`);
                      }
                      setIsSyncing(false);
                    }}
                    disabled={isSyncing}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 active:scale-98 border border-white/5 hover:border-white/15 text-white/80 hover:text-white text-xs font-mono font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Backup Now</span>
                  </button>
                </div>

                {/* RESTORE BLOCK */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col justify-between space-y-2.5 hover:border-white/10 transition-all duration-300">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-[#00F5FF] font-bold block uppercase tracking-widest">Get Ledger</span>
                    <h5 className="text-sm font-sans font-extrabold text-white">Retrieve History</h5>
                    <p className="text-[11px] text-white/35 leading-snug">
                      Download full historical records. Absolute savior when changing phones or restoring clean slates.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setIsSyncing(true);
                      setSyncStatus("Retrieving cloud records...");
                      const user = firebaseUser || (localStorage.getItem("fake_google_user") ? JSON.parse(localStorage.getItem("fake_google_user") || "{}") : null);
                      const uid = user?.uid;
                      if (!uid) {
                        setSyncStatus("Error: Connect Google account first.");
                        setIsSyncing(false);
                        return;
                      }

                      if (isFirebaseConfigured) {
                        try {
                          const list = await fetchTransactionsFromCloud(uid);
                          if (list && list.length > 0) {
                            if (onSetTransactions) onSetTransactions(list);
                            setSyncStatus(`Success! Retrieved and restored ${list.length} transactions from Cloud.`);
                          } else {
                            setSyncStatus("No backup ledger has been archived on this account yet.");
                          }
                        } catch (e: any) {
                          setSyncStatus(`Failed: ${e.message}`);
                        }
                      } else {
                        // Sandbox fetch
                        const saved = localStorage.getItem(`sandbox_txs_user_${uid}`);
                        if (saved) {
                          const list = JSON.parse(saved);
                          if (onSetTransactions) onSetTransactions(list);
                          setSyncStatus(`Success! Retrieved and restored ${list.length} transactions from Simulated Cloud sandbox.`);
                        } else {
                          setSyncStatus("No backup ledger has been archived in this Simulated Cloud sandbox yet.");
                        }
                      }
                      setIsSyncing(false);
                    }}
                    disabled={isSyncing}
                    className="w-full py-2 bg-[#00F5FF]/5 hover:bg-[#00F5FF]/10 active:scale-98 border border-[#00F5FF]/10 hover:border-[#00F5FF]/20 text-[#00F5FF] text-xs font-mono font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>Retrieve Data</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Status Bar/Logs */}
            {syncStatus && (
              <div className="bg-black border border-white/5 px-3 py-2 rounded-xl text-[10.5px] font-mono text-cyan-400 font-bold flex items-center gap-2 font-semibold">
                <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="flex-1 leading-normal">{syncStatus}</span>
                {syncStatus.includes("Success") && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[8px] tracking-tight">✓</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
