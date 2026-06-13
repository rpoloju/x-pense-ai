import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sparkles,
  Sliders,
  DollarSign,
  Calendar,
  Eye,
  RefreshCw,
  PlusCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { Transaction } from "../types";
import { convertAmount, formatCurrencyValue } from "../utils/currencyUtils";

interface NotificationCenterProps {
  transactions: Transaction[];
  displayCurrency: string;
  exchangeRates: Record<string, number>;
  onAddTransaction?: (newTx: Omit<Transaction, "id">) => void;
  onClose?: () => void;
  readNotifIds?: string[];
  setReadNotifIds?: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface SmartNotification {
  id: string;
  type: "daily" | "weekly" | "monthly" | "system";
  level: "success" | "warning" | "optimal" | "info";
  title: string;
  message: string;
  timestamp: string; // Time of calculation/alert
  isRead: boolean;
  meta?: {
    expenseAmount?: number;
    creditAmount?: number;
    percentageChange?: number;
    budgetPercentage?: number;
  };
}

export function NotificationCenter({
  transactions,
  displayCurrency,
  exchangeRates,
  onAddTransaction,
  onClose,
  readNotifIds,
  setReadNotifIds
}: NotificationCenterProps) {
  const [activeSegment, setActiveSegment] = useState<"all" | "daily" | "weekly" | "monthly" | "config">("all");
  
  const [localReadIds, setLocalReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("aura_read_notification_ids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const readIds = readNotifIds !== undefined ? readNotifIds : localReadIds;

  const setReadIds = (updater: string[] | ((prev: string[]) => string[])) => {
    const handleSetState = (prev: string[]) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("aura_read_notification_ids", JSON.stringify(next));
      return next;
    };

    if (setReadNotifIds !== undefined) {
      setReadNotifIds(prev => handleSetState(prev));
    } else {
      setLocalReadIds(prev => handleSetState(prev));
    }
  };

  // Settings
  const [alertThresholdExpense, setAlertThresholdExpense] = useState<number>(() => {
    return Number(localStorage.getItem("aura_notif_threshold_expense") || "5000"); // Alert for single expense above 5000 INR
  });
  const [alertThresholdIncome, setAlertThresholdIncome] = useState<number>(() => {
    return Number(localStorage.getItem("aura_notif_threshold_income") || "10000"); // Alert for credit above 10000 INR
  });
  const [isDailyEnabled, setIsDailyEnabled] = useState<boolean>(() => {
    return localStorage.getItem("aura_notif_daily_enabled") !== "false";
  });
  const [isWeeklyEnabled, setIsWeeklyEnabled] = useState<boolean>(() => {
    return localStorage.getItem("aura_notif_weekly_enabled") !== "false";
  });
  const [isMonthlyEnabled, setIsMonthlyEnabled] = useState<boolean>(() => {
    return localStorage.getItem("aura_notif_monthly_enabled") !== "false";
  });

  // Simulate addition for test notifications
  const [simulationText, setSimulationText] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Save settings helpers
  useEffect(() => {
    localStorage.setItem("aura_notif_threshold_expense", alertThresholdExpense.toString());
  }, [alertThresholdExpense]);

  useEffect(() => {
    localStorage.setItem("aura_notif_threshold_income", alertThresholdIncome.toString());
  }, [alertThresholdIncome]);

  const handleToggleDaily = () => {
    const next = !isDailyEnabled;
    setIsDailyEnabled(next);
    localStorage.setItem("aura_notif_daily_enabled", String(next));
    showToast(`Daily notifications ${next ? "enabled" : "silenced"}`);
  };

  const handleToggleWeekly = () => {
    const next = !isWeeklyEnabled;
    setIsWeeklyEnabled(next);
    localStorage.setItem("aura_notif_weekly_enabled", String(next));
    showToast(`Weekly notifications ${next ? "enabled" : "silenced"}`);
  };

  const handleToggleMonthly = () => {
    const next = !isMonthlyEnabled;
    setIsMonthlyEnabled(next);
    localStorage.setItem("aura_notif_monthly_enabled", String(next));
    showToast(`Monthly notifications ${next ? "enabled" : "silenced"}`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Extract reference timeline (we freeze local dates around June 2026 for simulation coherence)
  const todayString = "2026-06-12";
  const today = new Date(todayString);

  // Mark all as read
  const handleMarkAllRead = (notifications: SmartNotification[]) => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    showToast("All notifications marked as read.");
  };

  // Toggle single read state
  const handleToggleRead = (id: string) => {
    let updated;
    if (readIds.includes(id)) {
      updated = readIds.filter(item => item !== id);
    } else {
      updated = [...readIds, id];
    }
    setReadIds(updated);
  };

  // Dynamically compute the Notifications list from local transaction history
  const smartNotifications = useMemo<SmartNotification[]>(() => {
    const list: SmartNotification[] = [];

    // --- 1. COMPUTE DAILY NOTIFICATION ---
    if (isDailyEnabled) {
      // Find today's transactions
      const todayTxs = transactions.filter(t => t.date === todayString);
      let dailyOutflow = 0;
      let dailyInflow = 0;
      todayTxs.forEach(t => {
        const amt = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
        if (t.type === "expense") dailyOutflow += amt;
        else dailyInflow += amt;
      });

      // Find yesterday's transactions (2026-06-11)
      const yesterdayTxs = transactions.filter(t => t.date === "2026-06-11");
      let yesterdayOutflow = 0;
      yesterdayTxs.forEach(t => {
        const amt = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
        if (t.type === "expense") yesterdayOutflow += amt;
      });

      const percentageDelta = yesterdayOutflow > 0 
        ? Math.round(((dailyOutflow - yesterdayOutflow) / yesterdayOutflow) * 100)
        : 0;

      const dailyTitle = "Daily Account Posting Statement";
      let dailyMessage = "";
      let dailyLevel: "success" | "warning" | "optimal" | "info" = "info";

      if (todayTxs.length > 0) {
        dailyMessage = `Today you logged ${todayTxs.length} transacted records. Debit postings totalled ${formatCurrencyValue(dailyOutflow, displayCurrency)} against received credits of ${formatCurrencyValue(dailyInflow, displayCurrency)}.`;
        
        if (dailyOutflow > yesterdayOutflow && yesterdayOutflow > 0) {
          dailyMessage += ` Daily expenditure represents a ${percentageDelta}% surge compared to yesterday (${formatCurrencyValue(yesterdayOutflow, displayCurrency)}).`;
          dailyLevel = "warning";
        } else if (dailyOutflow <= yesterdayOutflow && dailyOutflow > 0) {
          dailyMessage += ` Savings trend: Debits are down compared to yesterday (${formatCurrencyValue(yesterdayOutflow, displayCurrency)}). Good job!`;
          dailyLevel = "optimal";
        }
      } else {
        dailyMessage = `Aura detected no debit or credit postings today (${todayString}). The local bank ledger is secure and currently idle with zero daily velocity.`;
        dailyLevel = "success";
      }

      list.push({
        id: "daily-summary-active",
        type: "daily",
        level: dailyLevel,
        title: dailyTitle,
        message: dailyMessage,
        timestamp: "Today, 18:30",
        isRead: readIds.includes("daily-summary-active"),
        meta: {
          expenseAmount: dailyOutflow,
          creditAmount: dailyInflow,
          percentageChange: percentageDelta
        }
      });
    }

    // --- 2. COMPUTE WEEKLY NOTIFICATION ---
    if (isWeeklyEnabled) {
      // Past 7 days from todayString (June 06 to June 12)
      const weeklyRefLimit = new Date(today);
      weeklyRefLimit.setDate(weeklyRefLimit.getDate() - 7);
      
      const weeklyTxs = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= weeklyRefLimit && txDate <= today;
      });

      let weeklyOutflow = 0;
      let weeklyInflow = 0;
      weeklyTxs.forEach(t => {
        const amt = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
        if (t.type === "expense") weeklyOutflow += amt;
        else weeklyInflow += amt;
      });

      // Let's check budget limits
      const weeklyAllotted = Number(localStorage.getItem("aura_monthly_budget") || "60000") / 4;
      const budgetPercentage = weeklyAllotted > 0 ? Math.round((weeklyOutflow / weeklyAllotted) * 100) : 0;

      let weeklyLevel: "success" | "warning" | "optimal" | "info" = "info";
      let weeklyMessage = "";

      if (budgetPercentage > 115) {
        weeklyLevel = "warning";
        weeklyMessage = `Weekly spending is highly elevated at ${formatCurrencyValue(weeklyOutflow, displayCurrency)}, representing ${budgetPercentage}% of your weekly allotted budget margin. Outflows exceed optimal ceilings.`;
      } else if (budgetPercentage > 80) {
        weeklyLevel = "info";
        weeklyMessage = `Weekly ledger is nominal at ${formatCurrencyValue(weeklyOutflow, displayCurrency)}. You used ${budgetPercentage}% of the weekly threshold, remaining in safety bounds.`;
      } else {
        weeklyLevel = "optimal";
        weeklyMessage = `Excellent budget prudence! Weekly expenditure is only ${formatCurrencyValue(weeklyOutflow, displayCurrency)} (${budgetPercentage}% of your standard quarterly safety bar). Total received credits: ${formatCurrencyValue(weeklyInflow, displayCurrency)}.`;
      }

      list.push({
        id: "weekly-summary-active",
        type: "weekly",
        level: weeklyLevel,
        title: "Weekly Budget Velocity Analysis",
        message: weeklyMessage,
        timestamp: "Yesterday, 09:12",
        isRead: readIds.includes("weekly-summary-active"),
        meta: {
          expenseAmount: weeklyOutflow,
          creditAmount: weeklyInflow,
          budgetPercentage: budgetPercentage
        }
      });
    }

    // --- 3. COMPUTE MONTHLY NOTIFICATION ---
    if (isMonthlyEnabled) {
      // Spendings of June 2026
      const monthlyTxs = transactions.filter(t => t.date.startsWith("2026-06"));
      let monthlyOutflow = 0;
      let monthlyInflow = 0;
      monthlyTxs.forEach(t => {
        const amt = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
        if (t.type === "expense") monthlyOutflow += amt;
        else monthlyInflow += amt;
      });

      const userBudget = Number(localStorage.getItem("aura_monthly_budget") || "60000");
      const utilizationPercent = userBudget > 0 ? Math.round((monthlyOutflow / userBudget) * 100) : 0;

      let monthlyLevel: "success" | "warning" | "optimal" | "info" = "info";
      let monthlyMessage = "";

      if (utilizationPercent > 95) {
        monthlyLevel = "warning";
        monthlyMessage = `Critical threshold breach warning! Current June 2026 gross expenditures at ${formatCurrencyValue(monthlyOutflow, displayCurrency)} constitute ${utilizationPercent}% of your entire monthly cap limit. Zero remaining buffers!`;
      } else if (utilizationPercent > 75) {
        monthlyLevel = "warning";
        monthlyMessage = `Aggressive monthly outflow! You have utilized ${utilizationPercent}% of the ${formatCurrencyValue(userBudget, displayCurrency)} limit, leaving ${formatCurrencyValue(userBudget - monthlyOutflow, displayCurrency)} in safety reserve.`;
      } else {
        monthlyLevel = "success";
        monthlyMessage = `Healthy ledger flow details: Gross monthly spending is resting safely at ${formatCurrencyValue(monthlyOutflow, displayCurrency)} (${utilizationPercent}% of budget). Total incoming credited deposits for June count: ${formatCurrencyValue(monthlyInflow, displayCurrency)}.`;
      }

      list.push({
        id: "monthly-summary-active",
        type: "monthly",
        level: monthlyLevel,
        title: "June 2026 Monthly Cashflow Auditor",
        message: monthlyMessage,
        timestamp: "Jun 10, 00:00",
        isRead: readIds.includes("monthly-summary-active"),
        meta: {
          expenseAmount: monthlyOutflow,
          creditAmount: monthlyInflow,
          budgetPercentage: utilizationPercent
        }
      });
    }

    // --- 4. INDIVIDUAL TRANSACTION THRESHOLD NOTIFICATIONS (REAL-TIME ALERTS) ---
    // Scan standard transactions loaded, find high expenses or high credits
    transactions.forEach(t => {
      const displayAmt = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
      
      if (t.type === "expense" && displayAmt >= alertThresholdExpense) {
        list.push({
          id: `alert-expense-${t.id}`,
          type: "system",
          level: "warning",
          title: "High Debit Alert",
          message: `Your ledger recorded a single debit posting of ${formatCurrencyValue(displayAmt, displayCurrency)} for "${t.title}". This exceeds your custom configuration limit of ${formatCurrencyValue(alertThresholdExpense, displayCurrency)}.`,
          timestamp: t.date,
          isRead: readIds.includes(`alert-expense-${t.id}`),
          meta: { expenseAmount: displayAmt }
        });
      }

      if (t.type === "income" && displayAmt >= alertThresholdIncome) {
        list.push({
          id: `alert-income-${t.id}`,
          type: "system",
          level: "success",
          title: "Acquisition Posting Confirmed",
          message: `Premium credit deposit of ${formatCurrencyValue(displayAmt, displayCurrency)} received on "${t.title}". Recorded successfully into persistent storage vaults.`,
          timestamp: t.date,
          isRead: readIds.includes(`alert-income-${t.id}`),
          meta: { creditAmount: displayAmt }
        });
      }
    });

    return list;
  }, [transactions, displayCurrency, exchangeRates, isDailyEnabled, isWeeklyEnabled, isMonthlyEnabled, alertThresholdExpense, alertThresholdIncome, readIds]);

  // Compute stats on notifications
  const unreadCount = useMemo(() => {
    return smartNotifications.filter(n => !n.isRead).length;
  }, [smartNotifications]);

  const filteredNotifications = useMemo(() => {
    if (activeSegment === "all") return smartNotifications;
    if (activeSegment === "config") return []; // Special UI
    return smartNotifications.filter(n => n.type === activeSegment);
  }, [smartNotifications, activeSegment]);

  // Push custom simulated big transaction for verification
  const handleSimulateCredit = () => {
    if (!onAddTransaction) return;
    const items = [
      { title: "Corporate Performance Bonus", amount: 25000, type: "income" as const, category: "Income", desc: "Performance milestone bounty credited by employer" },
      { title: "Venture Equity Dividend Paid", amount: 45000, type: "income" as const, category: "Income", desc: "Equity dividend payout transfer" },
      { title: "Custom Software Freelance Release", amount: 12000, type: "income" as const, category: "Income", desc: "Secured escrow milestone closure" }
    ];
    const chosen = items[Math.floor(Math.random() * items.length)];

    onAddTransaction({
      title: chosen.title,
      amount: chosen.amount,
      type: chosen.type,
      category: chosen.category,
      date: todayString,
      description: chosen.desc,
      currency: "INR",
      isRecurring: false
    });
    showToast(`Simulated credit transaction of ${chosen.amount} INR! Check notifications.`);
  };

  const handleSimulateDebit = () => {
    if (!onAddTransaction) return;
    const items = [
      { title: "High-End Mechanical Keyboard", amount: 7500, type: "expense" as const, category: "Shopping", desc: "Premium workspace mechanical hardware addition" },
      { title: "Health Insurance Annual Premium", amount: 18000, type: "expense" as const, category: "Health & Gym", desc: "Annual medical premium policy debited" },
      { title: "Michelin Star Fine Dining", amount: 6200, type: "expense" as const, category: "Food & Dining", desc: "Anniversary tasting menu" }
    ];
    const chosen = items[Math.floor(Math.random() * items.length)];

    onAddTransaction({
      title: chosen.title,
      amount: chosen.amount,
      type: chosen.type,
      category: chosen.category,
      date: todayString,
      description: chosen.desc,
      currency: "INR",
      isRecurring: false
    });
    showToast(`Simulated debit transaction of ${chosen.amount} INR! Check notifications.`);
  };

  return (
    <div id="notifications-panel-block" className="space-y-6">
      
      {/* Dynamic Toast Feedback Overlay */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-4 md:right-8 z-50 px-4 py-2.5 bg-cyan-950 border border-cyan-500/25 text-cyan-400 font-mono text-xs rounded-xl shadow-lg flex items-center gap-2 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Interactive Column: Notification Feed */}
        <div className="col-span-1 lg:col-span-8 space-y-4">
          
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-3xl rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
              <Bell className="w-40 h-40 text-cyan-500" />
            </div>

            {/* Header section with bell metrics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-cyan-500/10 border border-cyan-500/15 rounded-2xl flex items-center justify-center text-cyan-400 relative">
                  <Bell className="w-5.5 h-5.5 animate-bounceSlower" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-full text-[10px] font-mono font-bold text-black border border-[#050505] flex items-center justify-center shadow-lg animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#00F5FF]/80 uppercase block tracking-wider">SECURE NOTIFICATION CENTER</span>
                  <h2 className="text-xl font-sans font-extrabold text-white">Daily, Weekly & Monthly Transacted Alerts</h2>
                </div>
              </div>

              {smartNotifications.length > 0 && (
                <button
                  onClick={() => handleMarkAllRead(smartNotifications)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-[10px] text-white/70 font-mono hover:text-white uppercase font-bold tracking-wider transition-all cursor-pointer self-start sm:self-center"
                >
                  Mark All Read
                </button>
              )}
            </div>

            <p className="text-xs text-white/55 font-sans leading-relaxed mb-6">
              Our automated ledger parses incoming cash logs in real-time, delivering detailed audits at daily, weekly, and monthly milestones to assure safety margins. Custom thresholds can trigger system alerts immediately.
            </p>

            {/* Tab Segments for notification levels */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/[0.01] border border-white/5 rounded-2xl w-fit">
              {[
                { id: "all", label: "All Alerts", badge: unreadCount },
                { id: "daily", label: "Daily" },
                { id: "weekly", label: "Weekly" },
                { id: "monthly", label: "Monthly" },
                { id: "config", label: "Configurations Matrix" }
              ].map((seg) => {
                const isActive = activeSegment === seg.id;
                return (
                  <button
                    key={seg.id}
                    onClick={() => setActiveSegment(seg.id as any)}
                    className={`relative px-3.5 py-2 rounded-xl text-[10.5px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive ? "text-[#00F5FF]" : "text-white/50 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-notif-backdrop"
                        className="absolute inset-0 bg-white/5 rounded-xl border border-white/5 -z-10"
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      />
                    )}
                    <span>{seg.label}</span>
                    {seg.badge !== undefined && seg.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-black text-[9px] font-normal leading-none">
                        {seg.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Display Feed or Special Config Panel */}
          <AnimatePresence mode="wait">
            {activeSegment === "config" ? (
              <motion.div
                key="config-matrix"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 space-y-6"
              >
                <div>
                  <h3 className="text-sm font-sans font-extrabold text-white mb-1">Vault Threshold Configuration</h3>
                  <p className="text-xs text-white/40">Adjust parameters deciding when real-time push alerts should be committed representing critical transactions.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Single High Expense Limit */}
                  <div className="p-4 bg-[#050505]/40 border border-white/5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans font-bold text-white">Expense debit trigger limit</span>
                      <Sliders className="w-4 h-4 text-rose-400" />
                    </div>
                    <p className="text-[10px] text-white/35 leading-tight">Triggers an instant "High Debit Alert" notification for any single expenditure equal or superior to this value.</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-mono font-bold text-white/45">{displayCurrency}</span>
                      <input 
                        type="number" 
                        value={alertThresholdExpense} 
                        onChange={(e) => setAlertThresholdExpense(Math.max(1, Number(e.target.value)))}
                        className="bg-[#0c0c0c] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-rose-400 w-full focus:outline-none focus:border-rose-400"
                        placeholder="Limit amount"
                      />
                    </div>
                  </div>

                  {/* Single High Income Limit */}
                  <div className="p-4 bg-[#050505]/40 border border-white/5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans font-bold text-white">Income credit trigger limit</span>
                      <Sliders className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-[10px] text-white/35 leading-tight">Triggers an instant "Acquisition Confirmed" credit alert for any inflow equal or superior to this value.</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-mono font-bold text-white/45">{displayCurrency}</span>
                      <input 
                        type="number" 
                        value={alertThresholdIncome} 
                        onChange={(e) => setAlertThresholdIncome(Math.max(1, Number(e.target.value)))}
                        className="bg-[#0c0c0c] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 w-full focus:outline-none focus:border-emerald-400"
                        placeholder="Premium deposit trigger"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-toggles */}
                <div className="bg-[#050505]/20 border border-white/5 rounded-2xl p-4 divide-y divide-white/5 space-y-4">
                  <span className="text-[9px] font-mono text-white/40 uppercase font-black block tracking-wider pb-1">Milestone Push Filters</span>
                  
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <span className="text-xs font-sans font-bold text-white block">Generate Daily Accounts Posting Summaries</span>
                      <span className="text-[10px] text-white/30 block mt-0.5">Calculates and appraises aggregate changes at close-of-day.</span>
                    </div>
                    <button onClick={handleToggleDaily} className="text-[#00F5FF]">
                      {isDailyEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-white/20" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <span className="text-xs font-sans font-bold text-white block">Generate Weekly Budget Velocity Analyses</span>
                      <span className="text-[10px] text-white/30 block mt-0.5">Compares rolling 7-day outflows with proportional limits.</span>
                    </div>
                    <button onClick={handleToggleWeekly} className="text-[#00F5FF]">
                      {isWeeklyEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-white/20" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <span className="text-xs font-sans font-bold text-white block">Generate Monthly Cashflow Auditing Summaries</span>
                      <span className="text-[10px] text-white/30 block mt-0.5 font-sans">Compiles complete June calendar performance logs automatically.</span>
                    </div>
                    <button onClick={handleToggleMonthly} className="text-[#00F5FF]">
                      {isMonthlyEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-white/20" />}
                    </button>
                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="notifications-feed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredNotifications.length === 0 ? (
                  <div className="py-16 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                    <CheckCircle2 className="w-9 h-9 text-cyan-400/20 mx-auto mb-3 animate-pulse" />
                    <p className="text-xs font-mono text-white/30 uppercase tracking-widest">NO ADVISORY PUSH DETECTED</p>
                    <p className="text-[10.5px] text-white/20 max-w-xs mx-auto mt-1 leading-snug">All your transactions are well within margins. Adjust filters or trigger a simulation on the right to test alerts!</p>
                  </div>
                ) : (
                  filteredNotifications.map((noti) => {
                    const isHealthy = noti.level === "success" || noti.level === "optimal";
                    const isBorderLine = noti.level === "info";
                    const isUnhealthy = noti.level === "warning";

                    let cardColorClasses = "";
                    let iconColorClasses = "";
                    let badgeLabel = "";
                    let badgeStyle = "";

                    if (isHealthy) {
                      badgeLabel = "Healthy";
                      badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      iconColorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
                      cardColorClasses = noti.isRead 
                        ? "bg-emerald-950/2 border-emerald-500/5 hover:border-emerald-500/10" 
                        : "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.05] border-emerald-500/20 hover:border-emerald-400/50 shadow-md shadow-emerald-500/2";
                    } else if (isBorderLine) {
                      badgeLabel = "Border Line";
                      badgeStyle = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
                      iconColorClasses = "bg-yellow-500/10 text-yellow-500 border-yellow-500/15";
                      cardColorClasses = noti.isRead 
                        ? "bg-yellow-950/2 border-yellow-500/5 hover:border-yellow-500/10" 
                        : "bg-yellow-500/[0.03] hover:bg-yellow-500/[0.05] border-yellow-500/20 hover:border-yellow-400/50 shadow-md shadow-yellow-500/2";
                    } else {
                      badgeLabel = "Unhealthy Outflows";
                      badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                      iconColorClasses = "bg-rose-500/10 text-rose-400 border-rose-500/15";
                      cardColorClasses = noti.isRead 
                        ? "bg-rose-950/2 border-rose-500/5 hover:border-rose-500/10" 
                        : "bg-rose-500/[0.03] hover:bg-rose-500/[0.05] border-rose-500/20 hover:border-rose-400/50 shadow-md shadow-rose-500/2";
                    }

                    return (
                      <div
                        key={noti.id}
                        className={`relative group p-4 border rounded-2xl transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 ${cardColorClasses}`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Status Icon */}
                          <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border uppercase font-mono text-[10px] ${iconColorClasses}`}>
                            {noti.type === "daily" && "D"}
                            {noti.type === "weekly" && "W"}
                            {noti.type === "monthly" && "M"}
                            {noti.type === "system" && "S"}
                          </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs font-sans font-extrabold text-white truncate leading-tight group-hover:text-cyan-400 transition-colors">
                              {noti.title}
                            </h4>
                            <span className={`px-1.5 py-0.5 border rounded-full text-[8px] font-mono font-bold uppercase tracking-wider ${badgeStyle}`}>
                              {badgeLabel}
                            </span>
                            {!noti.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-[11px] text-white/60 leading-relaxed font-sans mt-1">
                            {noti.message}
                          </p>

                          <div className="flex items-center gap-2 mt-2.5 text-[8.5px] font-mono text-white/30 uppercase tracking-wider">
                            <Clock className="w-3 h-3 text-white/20" />
                            <span>{noti.timestamp}</span>
                            <span>•</span>
                            <span className="text-[#00F5FF]/60 font-bold">{noti.type} summary</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on notification item */}
                      <div className="flex items-center gap-2 justify-end self-end md:self-start">
                        <button
                          onClick={() => handleToggleRead(noti.id)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                            noti.isRead 
                              ? "bg-white/5 border-white/5 text-white/40 hover:text-white" 
                              : "bg-cyan-500/10 border-cyan-500/15 text-cyan-400 hover:bg-cyan-500/20"
                          }`}
                          title={noti.isRead ? "Mark as unread" : "Mark as read"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Right Interactive Column: Sandbox Simulator & Meta Analysis */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          
          {/* Sandbox Transmitter */}
          <div className="bg-gradient-to-br from-cyan-950/10 to-blue-950/5 border border-cyan-500/10 backdrop-blur-3xl rounded-3xl p-6 relative overflow-hidden">
            <h3 className="text-md font-sans font-bold text-white mb-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Vault Sandbox Transmitter</span>
            </h3>
            <p className="text-xs text-white/45 font-sans leading-relaxed mb-5 leading-normal">
              Need to evaluate threshold warning engines? Simulate sudden high expenses or premium bonuses to verify daily summaries and instant notification pushes instantly.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleSimulateDebit}
                className="w-full py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 rounded-2xl text-[10.5px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                <span>Simulate Debit Postings</span>
              </button>

              <button
                onClick={handleSimulateCredit}
                className="w-full py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-2xl text-[10.5px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>Simulate Credit Posting</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Audit of Notifications unread stats */}
          <div className="bg-white/[0.015] border border-white/5 rounded-3xl p-6 space-y-4">
            <span className="text-[9px] font-mono font-black text-white/45 uppercase tracking-widest block">Audit Health Index</span>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-[10.5px] font-mono text-white/40 uppercase">Unread Advisories</span>
                <span className="text-xs font-mono font-bold text-cyan-400">{unreadCount} active</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-[10.5px] font-mono text-white/40 uppercase">Daily push filter</span>
                <span className={`text-[10px] font-mono font-bold ${isDailyEnabled ? 'text-emerald-400' : 'text-white/30'}`}>
                  {isDailyEnabled ? "MONITORING" : "SILENCED"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-[10.5px] font-mono text-white/40 uppercase">Weekly budget filter</span>
                <span className={`text-[10px] font-mono font-bold ${isWeeklyEnabled ? 'text-emerald-400' : 'text-white/30'}`}>
                  {isWeeklyEnabled ? "MONITORING" : "SILENCED"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-[10.5px] font-mono text-white/40 uppercase">Monthly statement auditor</span>
                <span className={`text-[10px] font-mono font-bold ${isMonthlyEnabled ? 'text-emerald-400' : 'text-white/30'}`}>
                  {isMonthlyEnabled ? "MONITORING" : "SILENCED"}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
