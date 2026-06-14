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
  Bell,
  Tag,
  PiggyBank,
  Command,
  HelpCircle,
  Edit3,
  Check,
  Cloud,
  RefreshCw,
  UploadCloud,
  DownloadCloud
} from "lucide-react";

import { Transaction, Budget } from "./types";
import { INITIAL_TRANSACTIONS, CATEGORIES } from "./data";
import { 
  auth, 
  isFirebaseConfigured,
  loginWithGoogle,
  logoutUser,
  saveCloudUserProfile,
  backupTransactionsToCloud,
  fetchTransactionsFromCloud,
  syncSingleTransactionToCloud,
  deleteSingleTransactionFromCloud
} from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Dashboard } from "./components/Dashboard";
import { TransactionHistory } from "./components/TransactionHistory";
import { TreasuryHub } from "./components/TreasuryHub";
import { BudgetSettings } from "./components/BudgetSettings";
import { AIAdvisor } from "./components/AIAdvisor";
import { FinancialCalculators } from "./components/FinancialCalculators";
import { SMSSyncHub } from "./components/SMSSyncHub";
import { NotificationCenter } from "./components/NotificationCenter";
import { CategoryIcon } from "./components/CategoryIcon";
import { CURRENCIES, DEFAULT_EXCHANGE_RATES, convertAmount, formatCurrencyValue } from "./utils/currencyUtils";
import { CommandPalette } from "./components/CommandPalette";

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
  const [activeTab, setActiveTab ] = useState<string>("dashboard");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("aura_user_name") || "";
  });
  const [profilePic, setProfilePic] = useState<string>(() => {
    const val = localStorage.getItem("aura_profile_pic") || "preset-1";
    if (val === "preset-2" || val === "preset-3" || val === "preset-4") {
      return "preset-1";
    }
    return val;
  });
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setProfilePic(base64);
        localStorage.setItem("aura_profile_pic", base64);
        if (currentUser) {
          saveCloudUserProfile(currentUser.uid, {
            name: userName,
            profilePic: base64,
            monthlyBudget
          }).catch(console.error);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">("offline");
  const [lastSyncText, setLastSyncText] = useState<string>("Local-only mode");

  // Authentication State Listener & Synced-ledger Merging
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setSyncStatus("syncing");
        setLastSyncText("Loading financial cloud cache...");
        
        try {
          // 1. Load profile configurations
          let cloudName = user.displayName || "";
          let cloudBudget = 60000;
          let cloudProfilePic = "preset-1";

          if (db) {
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              if (uData.name) cloudName = uData.name;
              if (uData.monthlyBudget) cloudBudget = Number(uData.monthlyBudget);
              if (uData.profilePic) cloudProfilePic = uData.profilePic;
            } else {
              // Write a default cloud snapshot safely
              await saveCloudUserProfile(user.uid, {
                name: userName || user.displayName || "Aura User",
                profilePic: profilePic || "preset-1",
                monthlyBudget: monthlyBudget
              });
            }
          }

          // 2. Fetch transaction ledgers from the cloud
          const cloudTxs = await fetchTransactionsFromCloud(user.uid);
          
          // 3. Robust Ledger Reconciliation (Union-by-ID local merge)
          const storedTx = localStorage.getItem("aura_transactions");
          let localTxs: Transaction[] = [];
          if (storedTx) {
            try {
              localTxs = JSON.parse(storedTx);
            } catch {
              localTxs = [];
            }
          }

          // Merge: cloud items reconcile, unique local entries survive and back up
          const mergedTxs = [...localTxs];
          cloudTxs.forEach((ctx) => {
            const index = mergedTxs.findIndex((ltx) => ltx.id === ctx.id);
            if (index >= 0) {
              mergedTxs[index] = ctx; // Cloud authoritative update
            } else {
              mergedTxs.push(ctx);    // Cloud arrival
            }
          });

          // Upload any unsynced local-only records back up
          const unbackedLocal = localTxs.filter(
            (ltx) => !cloudTxs.some((ctx) => ctx.id === ltx.id)
          );

          if (unbackedLocal.length > 0) {
            await backupTransactionsToCloud(user.uid, mergedTxs);
          }

          setTransactions(mergedTxs);
          localStorage.setItem("aura_transactions", JSON.stringify(mergedTxs));

          if (cloudName) {
            setUserName(cloudName);
            localStorage.setItem("aura_user_name", cloudName);
          }
          if (cloudBudget) {
            setMonthlyBudget(cloudBudget);
            localStorage.setItem("aura_monthly_budget", String(cloudBudget));
          }
          if (cloudProfilePic) {
            setProfilePic(cloudProfilePic);
            localStorage.setItem("aura_profile_pic", cloudProfilePic);
          }

          setSyncStatus("synced");
          setLastSyncText("Cloud Safe Vault Active");
        } catch (err) {
          console.error("Cloud synchronization mismatch:", err);
          setSyncStatus("error");
          setLastSyncText("Sync interrupted. Local cache active.");
        }
      } else {
        setCurrentUser(null);
        setSyncStatus("offline");
        setLastSyncText("Local-only mode");
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("aura_available_tags");
      return stored ? JSON.parse(stored) : ["Urgent", "Personal", "Business", "Subscription", "Leisure"];
    } catch {
      return ["Urgent", "Personal", "Business", "Subscription", "Leisure"];
    }
  });

  const handleCreateTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (availableTags.includes(trimmed)) return;
    const updated = [...availableTags, trimmed];
    setAvailableTags(updated);
    localStorage.setItem("aura_available_tags", JSON.stringify(updated));
  };

  const handleDeleteTag = (tag: string) => {
    const updated = availableTags.filter(t => t !== tag);
    setAvailableTags(updated);
    localStorage.setItem("aura_available_tags", JSON.stringify(updated));
  };

  const handleUpdateTransactionTags = (id: string, tags: string[]) => {
    const updated = transactions.map(t => t.id === id ? { ...t, tags } : t);
    syncTransactions(updated);
    if (selectedTransaction?.id === id) {
      setSelectedTransaction({ ...selectedTransaction, tags });
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    syncTransactions(updated);
    if (selectedTransaction?.id === updatedTx.id) {
      setSelectedTransaction(updatedTx);
    }
  };

  const [monthlyBudget, setMonthlyBudget] = useState<number>(60000); // 60,000 INR default
  const [categoryBudgets, setCategoryBudgets] = useState<Budget[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [newFlyoutTagInput, setNewFlyoutTagInput] = useState("");

  // Edit fields local states inside flyout
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editCurrency, setEditCurrency] = useState("INR");
  const [editTags, setEditTags] = useState<string[]>([]);

  // Update editing state whenever transaction is selected
  useEffect(() => {
    if (selectedTransaction) {
      setEditingNotes(selectedTransaction.notes || "");
      setNewFlyoutTagInput("");
      
      // Initialize edit form values
      setEditTitle(selectedTransaction.title);
      setEditAmount(String(selectedTransaction.amount));
      setEditDate(selectedTransaction.date);
      setEditType(selectedTransaction.type);
      setEditCategory(selectedTransaction.category);
      setEditDescription(selectedTransaction.description || "");
      setEditIsRecurring(selectedTransaction.isRecurring || false);
      setEditCurrency(selectedTransaction.currency || "INR");
      setEditTags(selectedTransaction.tags || []);
      setIsEditingTransaction(false);
    } else {
      setEditingNotes("");
      setNewFlyoutTagInput("");
      setIsEditingTransaction(false);
    }
  }, [selectedTransaction]);

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



  // Update localStorage helper & backup to Cloud
  const syncTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    localStorage.setItem("aura_transactions", JSON.stringify(updated));
    if (currentUser) {
      setSyncStatus("syncing");
      backupTransactionsToCloud(currentUser.uid, updated)
        .then(() => {
          setSyncStatus("synced");
          setLastSyncText("Cloud Safe Vault Synced");
        })
        .catch((err) => {
          console.error("Cloud synchronization failed:", err);
          setSyncStatus("error");
          setLastSyncText("Sync offline / pending connection");
        });
    }
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

  const handleSaveTransactionNotes = (id: string, notes: string) => {
    const trimmedNotes = notes.trim();
    const updated = transactions.map(t => t.id === id ? { ...t, notes: trimmedNotes || undefined } : t);
    syncTransactions(updated);
    if (selectedTransaction?.id === id) {
      setSelectedTransaction({ ...selectedTransaction, notes: trimmedNotes || undefined });
    }
  };

  const handleUpdateMonthlyBudget = (limit: number) => {
    setMonthlyBudget(limit);
    localStorage.setItem("aura_monthly_budget", String(limit));
    if (currentUser) {
      setSyncStatus("syncing");
      saveCloudUserProfile(currentUser.uid, {
        name: userName,
        profilePic,
        monthlyBudget: limit
      })
        .then(() => {
          setSyncStatus("synced");
          setLastSyncText("Budget cloud profile updated");
        })
        .catch((err) => {
          console.error("Cloud profile sync failed:", err);
          setSyncStatus("error");
          setLastSyncText("Sync offline / pending connection");
        });
    }
  };

  const handleUpdateCategoryBudget = (category: string, limit: number) => {
    const updated = categoryBudgets.map(b => b.category === category ? { ...b, limit } : b);
    setCategoryBudgets(updated);
    localStorage.setItem("aura_category_budgets", JSON.stringify(updated));
  };

  // Navigations mapping
  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "treasury", label: "Treasury Pots", icon: PiggyBank, highlight: true },
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
    <div id="aura-app" className="relative bg-[#050505] min-h-screen text-white flex flex-col justify-between overflow-x-hidden font-sans select-none antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
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
                    {userName.trim() ? (
                      <>
                        {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{userName}</span>
                      </>
                    ) : (
                      "Welcome to Aura Ledger"
                    )}
                  </h1>
                  
                  {/* Custom Name input box */}
                  <div className="flex flex-col gap-2 mt-4 bg-white/[0.015] border border-white/5 rounded-2xl p-4 w-full max-w-xs mx-auto">
                    <span className="text-[9px] font-mono text-white/35 uppercase tracking-wider font-bold">
                      {userName.trim() ? "UPDATE PORTAL PROFILE NAME:" : "ENTER YOUR NAME TO ACCESS PORTAL:"}
                    </span>
                    <input
                      type="text"
                      id="name-input"
                      value={userName}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 16);
                        setUserName(val);
                        localStorage.setItem("aura_user_name", val);
                      }}
                      className="bg-white/5 border border-white/10 rounded-xl text-xs text-[#00F5FF] font-mono font-bold focus:outline-none focus:border-[#00F5FF]/50 py-2.5 px-3 transition-all text-center select-all w-full"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <p className="text-xs text-white/50 font-sans max-w-xs mx-auto leading-relaxed">
                  Unlock access to real-time currency conversions, AI budget forecasts, interactive widgets, and financial models.
                </p>
              </div>

              {/* Proceed CTA button */}
              <motion.button
                id="enter-dashboard"
                disabled={!userName.trim()}
                whileHover={userName.trim() ? { scale: 1.015, boxShadow: "0 0 20px rgba(6, 182, 212, 0.25)" } : {}}
                whileTap={userName.trim() ? { scale: 0.985 } : {}}
                onClick={() => {
                  if (userName.trim()) {
                    setShowWelcome(false);
                  }
                }}
                className={`w-full py-4 rounded-2xl text-white text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all ${
                  userName.trim() 
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/10 cursor-pointer border border-white/10" 
                    : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed opacity-50"
                }`}
              >
                {userName.trim() ? "ENTER DASHBOARD PORTAL" : "ENTER YOUR NAME TO UNLOCK"}
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
                      {activeTab === "treasury" && "Treasury & Asset Pools"}
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

                  {/* Interactive Command Palette search bar simulation / trigger */}
                  <div className="relative" id="command-palette-trigger">
                    <button
                      onClick={() => setIsCommandPaletteOpen(true)}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 hover:border-cyan-500/30 text-[10px] font-mono text-cyan-400 font-bold transition-all cursor-pointer uppercase"
                      title="Open Keyboard Command Palette (Ctrl+K)"
                    >
                      <Command className="w-3.5 h-3.5" />
                      <span>COMMANDS</span>
                      <kbd className="px-1 py-0.5 rounded bg-cyan-400/10 text-cyan-400 text-[8px] border border-cyan-400/20">Ctrl K</kbd>
                    </button>
                    <button
                      onClick={() => setIsCommandPaletteOpen(true)}
                      className="sm:hidden p-2 rounded-xl bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 text-cyan-400 relative flex items-center justify-center cursor-pointer"
                      title="Open Keyboard Command Palette"
                    >
                      <Command className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dedicated Help shortcuts panel trigger */}
                  <div className="relative" id="help-trigger">
                    <button
                      onClick={() => setIsHelpOpen(true)}
                      className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/12 text-white/70 hover:text-white transition-all flex items-center justify-center cursor-pointer relative"
                      title="Open Keyboard Shortcuts Guide (?)"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
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
                                
                                {/* Edit secure name input */}
                                <div className="mt-1.5 flex items-center gap-1">
                                  <span className="text-[8px] font-mono text-white/30 uppercase">EDIT:</span>
                                  <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => {
                                      const val = e.target.value.slice(0, 16);
                                      setUserName(val);
                                      localStorage.setItem("aura_user_name", val);
                                    }}
                                    onBlur={() => {
                                      if (currentUser) {
                                        saveCloudUserProfile(currentUser.uid, {
                                          name: userName,
                                          profilePic,
                                          monthlyBudget
                                        }).catch(console.error);
                                      }
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
                                        if (currentUser) {
                                          saveCloudUserProfile(currentUser.uid, {
                                            name: userName,
                                            profilePic: presetId,
                                            monthlyBudget
                                          }).catch(console.error);
                                        }
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

                            {/* Cloud Crypt Vault (Firebase Sync Hub) */}
                            <div className="py-3 px-4 bg-cyan-950/10 border-t border-b border-white/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-mono text-cyan-400 font-bold tracking-widest uppercase">CLOUD CRYPT VAULT</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    syncStatus === "synced" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" :
                                    syncStatus === "syncing" ? "bg-amber-400 animate-spin" :
                                    syncStatus === "error" ? "bg-rose-500 animate-bounce" :
                                    "bg-white/20"
                                  }`} />
                                  <span className="text-[7.5px] font-mono text-white/40 uppercase font-bold">{syncStatus}</span>
                                </div>
                              </div>

                              {currentUser ? (
                                <div className="space-y-2">
                                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 flex items-center justify-between gap-1.5">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[9px] font-mono text-white/50 truncate uppercase leading-none">SECURED BY GOOGLE</p>
                                      <p className="text-[10px] font-sans font-bold text-white truncate mt-1 leading-none">{currentUser.email}</p>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await logoutUser();
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                      className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-[9px] font-mono text-rose-400 border border-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer font-bold uppercase shrink-0"
                                      title="Sign out of Google Vault"
                                    >
                                      Exit
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={async () => {
                                        setSyncStatus("syncing");
                                        setLastSyncText("Publishing ledgers to cloud...");
                                        try {
                                          await backupTransactionsToCloud(currentUser.uid, transactions);
                                          await saveCloudUserProfile(currentUser.uid, {
                                            name: userName,
                                            profilePic,
                                            monthlyBudget
                                          });
                                          setSyncStatus("synced");
                                          setLastSyncText("Vault backup complete");
                                        } catch (err) {
                                          setSyncStatus("error");
                                          setLastSyncText("Upload rejected");
                                        }
                                      }}
                                      disabled={syncStatus === "syncing"}
                                      className="flex-1 py-1.5 rounded-lg bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 hover:border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-400 flex items-center justify-center gap-1 cursor-pointer transition-all uppercase"
                                      title="Overwrites cloud data with your current local state"
                                    >
                                      <UploadCloud className="w-2.5 h-2.5" />
                                      <span>Backup</span>
                                    </button>

                                    <button
                                      onClick={async () => {
                                        setSyncStatus("syncing");
                                        setLastSyncText("Reloading account ledger...");
                                        try {
                                          const cloudTxs = await fetchTransactionsFromCloud(currentUser.uid);
                                          setTransactions(cloudTxs);
                                          localStorage.setItem("aura_transactions", JSON.stringify(cloudTxs));
                                          
                                          // Refresh profile if present
                                          if (db) {
                                            const s = await getDoc(doc(db, "users", currentUser.uid));
                                            if (s.exists()) {
                                              const d = s.data();
                                              if (d.name) {
                                                setUserName(d.name);
                                                localStorage.setItem("aura_user_name", d.name);
                                              }
                                              if (d.profilePic) {
                                                setProfilePic(d.profilePic);
                                                localStorage.setItem("aura_profile_pic", d.profilePic);
                                              }
                                              if (d.monthlyBudget) {
                                                setMonthlyBudget(Number(d.monthlyBudget));
                                                localStorage.setItem("aura_monthly_budget", String(d.monthlyBudget));
                                              }
                                            }
                                          }
                                          setSyncStatus("synced");
                                          setLastSyncText("Cloud restore complete");
                                        } catch (err) {
                                          setSyncStatus("error");
                                          setLastSyncText("Download rejected");
                                        }
                                      }}
                                      disabled={syncStatus === "syncing"}
                                      className="flex-1 py-1.5 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/30 text-[9px] font-mono font-bold text-purple-400 flex items-center justify-center gap-1 cursor-pointer transition-all uppercase"
                                      title="Overwrites local dataset with cloud data"
                                    >
                                      <DownloadCloud className="w-2.5 h-2.5" />
                                      <span>Restore</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-sans text-white/50 leading-relaxed font-medium">
                                    Secure and synchronize your transactions real-time across multiple devices.
                                  </p>
                                  <button
                                    onClick={async () => {
                                      setSyncStatus("syncing");
                                      setLastSyncText("Authenticating Google secure...");
                                      try {
                                        await loginWithGoogle();
                                      } catch (err) {
                                        console.error("Google login failed:", err);
                                        setSyncStatus("error");
                                        setLastSyncText("Verification dismissed");
                                      }
                                    }}
                                    className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10 border border-cyan-400/20 active:scale-[0.98] transition-all"
                                  >
                                    <Cloud className="w-3.5 h-3.5" />
                                    <span>Sync to Google Cloud</span>
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[7px] font-mono text-white/30 uppercase pt-1">
                                <span>STATUS REGISTER:</span>
                                <span>{lastSyncText}</span>
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

                  {activeTab === "treasury" && (
                    <TreasuryHub 
                      transactions={transactions}
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
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
                      availableTags={availableTags}
                      onAddCustomTag={handleCreateTag}
                      onDeleteCustomTag={handleDeleteTag}
                      onSyncTransactions={syncTransactions}
                    />
                  )}

                  {activeTab === "sms-sync" && (
                    <SMSSyncHub 
                      transactions={transactions}
                      displayCurrency={displayCurrency}
                      exchangeRates={exchangeRates}
                      onAddTransaction={handleAddTransaction}
                      onSyncTransactions={syncTransactions}
                      userName={userName}
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
                        <span className="text-[10px] font-mono font-bold text-white/45 uppercase tracking-widest block mb-1">
                          {isEditingTransaction ? "MODIFY TRANSACTION RECORD" : "AUDIT INSPECT RECORD"}
                        </span>
                        <h3 className="text-md font-sans font-bold text-white leading-none">
                          {isEditingTransaction ? "Edit Transaction Form" : "Cash Posting Ledger"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditingTransaction && (
                          <button 
                            type="button"
                            onClick={() => {
                              // Initialize and trigger edit mode
                              setEditTitle(selectedTransaction.title);
                              setEditAmount(String(selectedTransaction.amount));
                              setEditDate(selectedTransaction.date);
                              setEditType(selectedTransaction.type);
                              setEditCategory(selectedTransaction.category);
                              setEditDescription(selectedTransaction.description || "");
                              setEditIsRecurring(selectedTransaction.isRecurring || false);
                              setEditCurrency(selectedTransaction.currency || "INR");
                              setEditTags(selectedTransaction.tags || []);
                              setIsEditingTransaction(true);
                            }}
                            title="Edit Details"
                            className="p-1.5 rounded-xl bg-cyan-950/40 text-[#00F5FF] hover:bg-cyan-900 border border-cyan-400/30 transition-all cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> EDIT DETAILS
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedTransaction(null)}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Core detail summary */}
                    {isEditingTransaction ? (
                      <div className="p-8 flex-1 space-y-5 overflow-y-auto">
                        {/* Transaction Type Selector Toggle */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-mono font-bold text-[#00F5FF] uppercase tracking-widest block font-bold">Transaction Type</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditType("income");
                                setEditCategory("Income");
                              }}
                              className={`flex-1 py-3 text-center rounded-2xl font-mono text-[10px] font-bold border cursor-pointer select-none transition-all flex items-center justify-center gap-2 ${
                                editType === 'income' 
                                  ? 'bg-cyan-950/40 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                                  : 'bg-black border-white/5 text-white/30 hover:bg-white/[0.02]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${editType === 'income' ? 'bg-[#00F5FF]' : 'bg-white/20'}`} />
                              INCOME DEPOSIT
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditType("expense");
                                if (editCategory === "Income") {
                                  setEditCategory("Food & Dining");
                                }
                              }}
                              className={`flex-1 py-3 text-center rounded-2xl font-mono text-[10px] font-bold border cursor-pointer select-none transition-all flex items-center justify-center gap-2 ${
                                editType === 'expense' 
                                  ? 'bg-white/10 border-white/20 text-white' 
                                  : 'bg-black border-white/5 text-white/30 hover:bg-white/[0.02]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${editType === 'expense' ? 'bg-rose-400' : 'bg-white/20'}`} />
                              OUTFLOW EXPENSE
                            </button>
                          </div>
                        </div>

                        {/* Title input */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block font-bold">Transaction Title</label>
                          <input 
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Enter posting title (e.g., Grocery Supermarket)..."
                            className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.05)] transition-all font-sans"
                          />
                        </div>

                        {/* Amount & Currency */}
                        <div className="grid grid-cols-3 gap-3 font-mono">
                          <div className="col-span-2 space-y-1.5">
                            <label className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block font-bold">Ledger value amount</label>
                            <div className="relative">
                              <input 
                                type="number"
                                step="any"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-black border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition-all font-mono"
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-white/45">
                                {editCurrency}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block font-bold">Post currency</label>
                            <select
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value)}
                              className="w-full h-[42px] bg-black border border-white/10 rounded-2xl px-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                            >
                              {CURRENCIES.map(curr => (
                                <option key={curr.code} value={curr.code}>{curr.code}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Category Selector */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block font-bold">Posting Channel Category</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all cursor-pointer font-sans"
                          >
                            {CATEGORIES.filter(cat => editType === "income" ? cat.isIncome : !cat.isIncome).map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Date Picker */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block font-bold">Transaction Posting Date</label>
                          <input 
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block font-bold">Supplemental remarks description</label>
                          <input 
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Add brief description or payment method..."
                            className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition-all font-sans"
                          />
                        </div>

                        {/* Tags Editor */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-mono uppercase font-bold text-[#00F5FF]">Transaction Tags</h4>
                            <span className="text-[8px] font-mono text-white/30 uppercase">Enterprise metadata tagging</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                            {editTags.length > 0 ? (
                              editTags.map(tag => (
                                <span 
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/15 text-[#00F5FF] text-[9px] font-mono uppercase font-bold animate-fadeIn"
                                >
                                  #{tag}
                                  <button
                                    type="button"
                                    onClick={() => setEditTags(editTags.filter(t => t !== tag))}
                                    className="p-0.5 rounded hover:bg-[#00F5FF] hover:text-black transition-all cursor-pointer"
                                    title="Remove Tag"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-white/30 font-mono text-[10px] italic">No active tags attached.</span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-white/30 block uppercase font-bold">TAGS LIBRARY TOGGLES</span>
                            <div className="flex flex-wrap gap-1 bg-black/40 border border-white/5 rounded-xl p-2 max-h-20 overflow-y-auto font-mono">
                              {availableTags.map((tag) => {
                                const hasTag = editTags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      const updated = hasTag
                                        ? editTags.filter((t) => t !== tag)
                                        : [...editTags, tag];
                                      setEditTags(updated);
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-mono transition-all flex items-center gap-1 cursor-pointer select-none ${
                                      hasTag
                                        ? "bg-[#00F5FF]/20 text-[#00F5FF] border border-[#00F5FF]/30"
                                        : "bg-white/[0.01] border border-white/5 text-white/30 hover:bg-white/[0.04]"
                                    }`}
                                  >
                                    <Tag className="w-2 h-2" />
                                    {tag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex gap-2 font-sans">
                            <input 
                              type="text"
                              placeholder="Create custom tag and attach..."
                              value={newFlyoutTagInput}
                              onChange={(e) => setNewFlyoutTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = newFlyoutTagInput.trim();
                                  if (val) {
                                    handleCreateTag(val);
                                    if (!editTags.includes(val)) {
                                      setEditTags([...editTags, val]);
                                    }
                                    setNewFlyoutTagInput("");
                                  }
                                }
                              }}
                              className="flex-1 bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 transition-all font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = newFlyoutTagInput.trim();
                                if (val) {
                                  handleCreateTag(val);
                                  if (!editTags.includes(val)) {
                                    setEditTags([...editTags, val]);
                                  }
                                  setNewFlyoutTagInput("");
                                }
                              }}
                              className="px-3 py-2 bg-[#00F5FF] hover:bg-cyan-400 text-black text-[10px] font-mono uppercase font-bold border border-transparent rounded-xl transition duration-300 cursor-pointer"
                            >
                              Add Tag
                            </button>
                          </div>
                        </div>

                        {/* Cycle setting toggle */}
                        <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl">
                          <div>
                            <span className="text-xs text-white/85 font-sans font-semibold">Recurring Cycle</span>
                            <span className="block text-[8px] text-white/40 font-mono uppercase font-bold">POSTS ON A MONTHLY RECURRENCE SPEED</span>
                          </div>
                          <input 
                            type="checkbox"
                            checked={editIsRecurring}
                            onChange={(e) => setEditIsRecurring(e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-black text-[#00F5FF] focus:ring-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    ) : (
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
                          <span className={`text-4xl font-mono font-bold tracking-tight ${selectedTransaction.type === 'expense' ? 'text-white' : 'text-cyan-400'}`}>
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
                          <h4 className="text-[10px] font-mono uppercase font-bold text-white/45 leading-none">Supplemental remarks description</h4>
                          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 text-xs text-white/70 leading-relaxed font-sans italic">
                            "{selectedTransaction.description}"
                          </div>
                        </div>
                      )}

                      {/* Attached/Interactive Transaction Tags section */}
                      <div className="space-y-3 pt-4 border-t border-white/5 animate-fadeIn">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-mono uppercase font-bold text-[#00F5FF]">Transaction Tags</h4>
                          <span className="text-[8px] font-mono text-white/30 uppercase">Enterprise metadata tagging</span>
                        </div>

                        {/* Rendering tags or empty state */}
                        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                          {selectedTransaction.tags && selectedTransaction.tags.length > 0 ? (
                            selectedTransaction.tags.map(tag => (
                              <span 
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/15 text-[#00F5FF] text-[9px] font-mono uppercase font-bold"
                              >
                                #{tag}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextTags = (selectedTransaction.tags || []).filter(t => t !== tag);
                                    handleUpdateTransactionTags(selectedTransaction.id, nextTags);
                                  }}
                                  className="p-0.5 rounded hover:bg-[#00F5FF] hover:text-black transition-all cursor-pointer"
                                  title="Remove Tag"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-white/30 font-mono text-[10px] italic">No active tags attached.</span>
                          )}
                        </div>

                        {/* Available Tags Toggles inside the drawer */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-white/30 block uppercase">TAGS LIBRARY TOGGLES</span>
                          <div className="flex flex-wrap gap-1 bg-black/40 border border-white/5 rounded-xl p-2 max-h-20 overflow-y-auto">
                            {availableTags.map((tag) => {
                              const hasTag = selectedTransaction.tags?.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  onClick={() => {
                                    const tags = selectedTransaction.tags || [];
                                    const updated = hasTag
                                      ? tags.filter((t) => t !== tag)
                                      : [...tags, tag];
                                    handleUpdateTransactionTags(selectedTransaction.id, updated);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-mono transition-all flex items-center gap-1 cursor-pointer select-none ${
                                    hasTag
                                      ? "bg-[#00F5FF]/20 text-[#00F5FF] border border-[#00F5FF]/30"
                                      : "bg-white/[0.01] border border-white/5 text-white/30 hover:bg-white/[0.04]"
                                  }`}
                                >
                                  <Tag className="w-2 h-2" />
                                  {tag}
                                </button>
                              );
                            })}
                            {availableTags.length === 0 && (
                              <span className="text-[9px] text-white/20 font-mono italic">No tags in library. Create below.</span>
                            )}
                          </div>
                        </div>

                        {/* Tag submission form */}
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Add new tag to library and post..."
                            value={newFlyoutTagInput}
                            onChange={(e) => setNewFlyoutTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = newFlyoutTagInput.trim();
                                if (val) {
                                  handleCreateTag(val);
                                  const currentTags = selectedTransaction.tags || [];
                                  if (!currentTags.includes(val)) {
                                    handleUpdateTransactionTags(selectedTransaction.id, [...currentTags, val]);
                                  }
                                  setNewFlyoutTagInput("");
                                }
                              }
                            }}
                            className="flex-1 bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 transition-all font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = newFlyoutTagInput.trim();
                              if (val) {
                                handleCreateTag(val);
                                const currentTags = selectedTransaction.tags || [];
                                if (!currentTags.includes(val)) {
                                  handleUpdateTransactionTags(selectedTransaction.id, [...currentTags, val]);
                                }
                                setNewFlyoutTagInput("");
                              }
                            }}
                            className="px-3 py-2 bg-[#00F5FF] hover:bg-cyan-400 text-black text-[10px] font-mono uppercase font-bold border border-transparent rounded-xl transition duration-300 cursor-pointer"
                          >
                            Add Tag
                          </button>
                        </div>
                      </div>

                      {/* Interactive Personal Notes container */}
                      <div className="space-y-2 pt-4 border-t border-white/5 animate-fadeIn">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-mono uppercase font-bold text-[#00F5FF]">Personal Transaction Notes</h4>
                          {editingNotes !== (selectedTransaction.notes || "") && (
                            <button
                              onClick={() => handleSaveTransactionNotes(selectedTransaction.id, editingNotes)}
                              className="text-[9px] font-mono font-black text-black bg-cyan-400 border border-cyan-400 px-2 py-0.5 rounded-lg hover:bg-cyan-350 transition-all uppercase cursor-pointer"
                            >
                              Save Notes
                            </button>
                          )}
                        </div>
                        <textarea
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          placeholder="Type custom thoughts, receipts tags, or descriptions here..."
                          rows={3}
                          className="w-full bg-black border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 transition-all leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                    {/* Delete / Save footer panel actions */}
                    {isEditingTransaction ? (
                      <div className="p-6 border-t border-white/5 bg-white/[0.01] flex gap-3">
                        <button 
                          type="button"
                          onClick={() => setIsEditingTransaction(false)}
                          className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/75 hover:text-white text-xs font-mono font-bold uppercase transition cursor-pointer select-none"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            const amountNum = parseFloat(editAmount);
                            if (isNaN(amountNum) || amountNum <= 0) {
                              alert("Please enter a valid positive transaction amount.");
                              return;
                            }
                            if (!editTitle.trim()) {
                              alert("Please enter a title for the transaction.");
                              return;
                            }

                            const updatedTx: Transaction = {
                              ...selectedTransaction,
                              title: editTitle.trim(),
                              amount: amountNum,
                              date: editDate,
                              type: editType,
                              category: editCategory,
                              description: editDescription.trim() || undefined,
                              isRecurring: editIsRecurring,
                              currency: editCurrency,
                              tags: editTags
                            };

                            handleUpdateTransaction(updatedTx);
                            setIsEditingTransaction(false);
                          }}
                          className="flex-1 py-3.5 rounded-2xl bg-[#00F5FF] hover:bg-cyan-400 text-black text-xs font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer select-none"
                        >
                          <Check className="w-4 h-4 font-extrabold" /> Save Changes
                        </button>
                      </div>
                    ) : (
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
                    )}

                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Interactive global keyboard Command Palette & Help desk */}
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              setIsOpen={setIsCommandPaletteOpen}
              isHelpOpen={isHelpOpen}
              setIsHelpOpen={setIsHelpOpen}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              syncTransactions={syncTransactions}
              displayCurrency={displayCurrency}
              userName={userName}
              availableTags={availableTags}
            />

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
