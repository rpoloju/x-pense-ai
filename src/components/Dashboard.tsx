import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Flame, 
  Compass, 
  Zap,
  Calendar,
  ChevronRight,
  BrainCircuit,
  Sparkles
} from "lucide-react";
import { Transaction, CategorySpec } from "../types";
import { CATEGORIES } from "../data";
import { CategoryIcon } from "./CategoryIcon";
import { convertAmount, formatCurrencyValue } from "../utils/currencyUtils";

interface DashboardProps {
  transactions: Transaction[];
  monthlyBudget: number;
  displayCurrency: string;
  exchangeRates: Record<string, number>;
  onNavigateToTab: (tab: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export function Dashboard({ 
  transactions, 
  monthlyBudget, 
  displayCurrency,
  exchangeRates,
  onNavigateToTab,
  onSelectTransaction 
}: DashboardProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Parse financials to the user chosen active displayCurrency
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    // Group transactions by category (only expenses)
    const expensesByCategory: Record<string, number> = {};
    
    transactions.forEach(t => {
      const amountInDisplay = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
      
      if (t.type === "income") {
        income += amountInDisplay;
      } else {
        expense += amountInDisplay;
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + amountInDisplay;
      }
    });

    const balance = income - expense;
    const expenseRatio = income > 0 ? (expense / income) * 100 : 0;
    const remainingBudget = Math.max(0, monthlyBudget - expense); // monthlyBudget is already input in displayCurrency
    const budgetUsageRatio = Math.min(100, (expense / monthlyBudget) * 100);

    // Calculate burn rate (average daily spending)
    const currentDay = new Date().getDate();
    const dailyAverage = expense > 0 ? expense / currentDay : 0;
    
    // Dynamic ideal spending limit benchmarked relative to displayCurrency
    const idealDailyLimit = convertAmount(35, "USD", displayCurrency, exchangeRates);
    const burnRateStatus = dailyAverage < idealDailyLimit ? "Excellent" : dailyAverage < (idealDailyLimit * 2.2) ? "Nominal" : "Aggressive";

    return {
      income,
      expense,
      balance,
      expenseRatio,
      remainingBudget,
      budgetUsageRatio,
      dailyAverage,
      burnRateStatus,
      expensesByCategory,
    };
  }, [transactions, monthlyBudget, displayCurrency, exchangeRates]);

  // Donut chart segments calculation
  const chartData = useMemo(() => {
    const categoriesWithExpense = CATEGORIES.filter(cat => !cat.isIncome && (stats.expensesByCategory[cat.id] || 0) > 0);
    const totalExpense = stats.expense || 1; // Prevent division by zero
    
    let cumulativePercent = 0;
    return categoriesWithExpense.map(cat => {
      const amount = stats.expensesByCategory[cat.id] || 0;
      const percentage = (amount / totalExpense) * 100;
      const startPercent = cumulativePercent;
      cumulativePercent += percentage;
      
      return {
        ...cat,
        amount,
        percentage,
        startPercent,
      };
    });
  }, [stats.expensesByCategory, stats.expense]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [transactions]);

  // Safe to spend visual calculation
  const safeToSpendScore = useMemo(() => {
    if (stats.expense === 0) return 100;
    const budgetPct = (stats.expense / monthlyBudget) * 100;
    // Score declines as budget is used up
    return Math.max(0, Math.round(100 - budgetPct));
  }, [stats.expense, monthlyBudget]);

  const activeCategoryDetail = useMemo(() => {
    if (!hoveredCategory) return null;
    return chartData.find(c => c.id === hoveredCategory) || null;
  }, [hoveredCategory, chartData]);

  // Donut Circle Dimensions
  const radius = 50;
  const circ = 2 * Math.PI * radius; // ~314.16

  return (
    <div className="space-y-8">
      {/* Dynamic Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0a] p-6 rounded-[32px] border border-white/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-bold tracking-tight text-white mb-1">
            Financial Dashboard
          </h1>
          <p className="text-xs text-white/40 font-mono">
            DYNAMIC ACCOUNT LEDGER • REAL-TIME DEPOSIT ENGINE
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-2xl border border-white/5">
          <Calendar className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div className="text-right">
            <div className="text-xs text-white/40 font-medium">Active Accounting Period</div>
            <div className="text-sm font-bold text-white font-mono">
              {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* OVER-THE-TOP METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Net Account Balance */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="relative overflow-hidden bg-white/[0.03] p-6 rounded-[32px] border border-white/5 shadow-md group animate-fadeIn"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-mono font-semibold tracking-wider text-white/40 uppercase">Liquid Pool</span>
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-white tracking-tight font-sans">
              {formatCurrencyValue(stats.balance, displayCurrency)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span className={`flex items-center gap-0.5 font-semibold ${stats.balance >= 0 ? 'text-cyan-400' : 'text-rose-450'}`}>
                {stats.balance >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {stats.income > 0 ? ((stats.balance / stats.income) * 100).toFixed(1) : 0}%
              </span>
              <span className="font-mono">of influx</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Smart Safe-to-Spend Dial Card */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="relative overflow-hidden bg-white/[0.03] p-6 rounded-[32px] border border-white/5 shadow-md group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-mono font-semibold tracking-wider text-white/40 uppercase">Wallet Health</span>
            <div className={`p-2.5 rounded-2xl border text-cyan-400 ${safeToSpendScore > 50 ? 'bg-white/5 border-white/10' : 'bg-rose-500/10 border-rose-500/20 animate-pulse'}`}>
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-white tracking-tight font-sans flex items-baseline gap-1">
              {safeToSpendScore}%
              <span className="text-xs text-white/40 font-normal">Score</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${safeToSpendScore > 50 ? 'bg-cyan-400' : safeToSpendScore > 25 ? 'bg-amber-400' : 'bg-rose-500'}`}
                  style={{ width: `${safeToSpendScore}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Metric 3: Safe-To-Spend remaining amount */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="relative overflow-hidden bg-white/[0.03] p-6 rounded-[32px] border border-white/5 shadow-md group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-mono font-semibold tracking-wider text-white/40 uppercase">Caps Balance Left</span>
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-cyan-405 font-bold font-mono text-xs">
              {displayCurrency}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-white tracking-tight font-sans">
              {formatCurrencyValue(stats.remainingBudget, displayCurrency)}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-white/40 font-mono">Limit target:</span>
              <span className="text-white/70 font-semibold font-mono">{formatCurrencyValue(monthlyBudget, displayCurrency)}</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 4: Burn Rate Gauge */}
        <motion.div 
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="relative overflow-hidden bg-white/[0.03] p-6 rounded-[32px] border border-white/5 shadow-md group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-mono font-semibold tracking-wider text-white/40 uppercase">Burn rate / Day</span>
            <div className={`p-2.5 rounded-2xl bg-white/5 border border-white/10 ${stats.burnRateStatus === 'Aggressive' ? 'text-rose-450 animate-pulse' : 'text-cyan-400'}`}>
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-white tracking-tight font-sans flex items-baseline gap-1">
              {formatCurrencyValue(stats.dailyAverage, displayCurrency)}
              <span className="text-xs text-white/40 font-normal">/ day</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs animate-fadeIn">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono leading-none tracking-wider font-bold ${
                stats.burnRateStatus === "Excellent" ? "bg-cyan-500/20 text-cyan-455 border border-cyan-500/20" :
                stats.burnRateStatus === "Nominal" ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" :
                "bg-rose-500/20 text-rose-400 border border-rose-500/20 animate-pulse"
              }`}>
                {stats.burnRateStatus.toUpperCase()}
              </span>
              <span className="text-white/40 font-mono text-[10px]">Speed basis</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* DUAL DIRECTION INCOME VS OUTGO OVERLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.01] p-1 rounded-[32px] border border-white/5 shadow-xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/5 text-cyan-405">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-white/45">Monthly Accumulations</span>
            </div>
            <span className="text-sm font-semibold font-mono text-cyan-405">+{formatCurrencyValue(stats.income, displayCurrency)}</span>
          </div>
          <div className="relative pt-1 font-mono">
            <div className="text-[10px] text-white/40 flex justify-between uppercase tracking-wider mb-1">
              <span>Deposits Inflow</span>
              <span>100% Volume</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 md:border-l border-white/5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/5 text-rose-400">
                <TrendingDown className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-white/45">Monthly Deductions</span>
            </div>
            <span className="text-sm font-semibold font-mono text-white/80">-{formatCurrencyValue(stats.expense, displayCurrency)}</span>
          </div>
          <div className="relative pt-1 font-mono">
            <div className="text-[10px] text-white/40 flex justify-between uppercase tracking-wider mb-1">
              <span>Outflow Drain speed</span>
              <span>{stats.expenseRatio.toFixed(1)}% Ratio</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500/50 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.expenseRatio)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>      {/* VISUAL ANALYTICS: INTERACTIVE DONUT AND CATEGORY METERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SVG Interactive Donut Card */}
        <div className="lg:col-span-5 bg-white/[0.03] p-6 rounded-[32px] border border-white/5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div>
            <h3 className="text-md font-sans font-bold text-white">Visual Breakdown</h3>
            <p className="text-xs text-white/40 font-mono uppercase tracking-widest mt-1">Donut Allocation Map</p>
          </div>

          <div className="relative flex justify-center items-center py-6">
            <svg 
              width="220" 
              height="220" 
              viewBox="0 0 128 128" 
              className="transform rotate-[-90deg] cursor-pointer"
            >
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-white/5"
                strokeWidth="12"
                fill="transparent"
              />
              {chartData.map((slice) => {
                const strokeDashValue = (slice.percentage / 100) * circ;
                const strokeOffsetValue = circ - (slice.startPercent / 100) * circ;
                const isHovered = hoveredCategory === slice.id;
                
                return (
                  <circle
                    key={slice.id}
                    cx="64"
                    cy="64"
                    r={radius}
                    className="transition-all duration-300"
                    stroke={slice.color}
                    strokeWidth={isHovered ? "15" : "12"}
                    strokeDasharray={`${strokeDashValue} ${circ}`}
                    strokeDashoffset={strokeOffsetValue}
                    strokeLinecap="round"
                    fill="transparent"
                    onMouseEnter={() => setHoveredCategory(slice.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{
                      filter: isHovered ? `drop-shadow(0 0 8px ${slice.color}a0)` : "none"
                    }}
                  />
                );
              })}
            </svg>

            {/* Dynamic Center Panel */}
            <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none text-center">
              {activeCategoryDetail ? (
                <div className="space-y-0.5 animate-fadeIn">
                  <div className="flex justify-center mb-1">
                    <div 
                      className="p-1.5 rounded-full" 
                      style={{ backgroundColor: `${activeCategoryDetail.color}20`, color: activeCategoryDetail.color }}
                    >
                      <CategoryIcon name={activeCategoryDetail.icon} className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-white/40">
                    {activeCategoryDetail.name}
                  </div>
                  <div className="text-xl font-bold text-white font-sans">
                    {formatCurrencyValue(activeCategoryDetail.amount, displayCurrency)}
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400 font-bold">
                    {activeCategoryDetail.percentage.toFixed(1)}%
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="text-[10.5px] uppercase tracking-widest font-mono text-white/40 font-bold">
                    Fixed & Leisure
                  </div>
                  <div className="text-2xl font-light text-white tracking-tighter">
                    {formatCurrencyValue(stats.expense, displayCurrency)}
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">
                    {chartData.length} channels
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-[10px] font-mono font-semibold text-white/20 uppercase tracking-widest">
              Distribution Overview
            </span>
          </div>
        </div>

        {/* Category breakdown meters list */}
        <div className="lg:col-span-7 bg-white/[0.03] p-6 rounded-[32px] border border-white/5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h3 className="text-md font-sans font-bold text-white">Expense Pools</h3>
              <p className="text-xs text-white/40">Relative to current active periods</p>
            </div>
            <button 
              onClick={() => onNavigateToTab("budget")}
              className="text-xs font-mono font-bold flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              ADJUST LIMITS <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {CATEGORIES.filter(cat => !cat.isIncome).map(cat => {
              const spent = stats.expensesByCategory[cat.id] || 0;
              const isHovered = hoveredCategory === cat.id;

              return (
                <div 
                  key={cat.id}
                  onMouseEnter={() => setHoveredCategory(cat.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                    isHovered 
                      ? "bg-white/5 border-white/10 shadow-md translate-x-1" 
                      : "bg-[#0c0c0c]/40 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-1.5 rounded-lg border"
                        style={{ 
                          backgroundColor: `${cat.color}15`, 
                          borderColor: `${cat.color}30`, 
                          color: cat.color,
                          boxShadow: isHovered ? `0 0 10px ${cat.color}25` : "none"
                        }}
                      >
                        <CategoryIcon name={cat.icon} className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-sans font-bold text-white/70">{cat.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white">{formatCurrencyValue(spent, displayCurrency)}</span>
                  </div>

                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${Math.min(100, spent > 0 ? (spent / (stats.expense || 1)) * 100 : 0)}%`,
                        backgroundColor: cat.color 
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-white/40 text-right mt-1 font-bold">
                    {spent > 0 ? ((spent / (stats.expense || 1)) * 100).toFixed(0) : 0}% distribution
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS & TRANSACTIONS PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Gemini AI Action Hook Card (Styled with Stunning Solid Cyan as specified in Sophisticated Dark Theme HTML) */}
        <div className="lg:col-span-4 bg-[#00F5FF]/95 p-8 rounded-[32px] text-black shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300 h-full min-h-[300px]">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center text-xl">✨</div>
              <span className="text-[10px] border border-black/20 rounded px-2 py-1 uppercase font-mono font-extrabold tracking-widest leading-none">AI PULSE</span>
            </div>
            
            <h2 className="text-2xl font-sans font-extrabold leading-tight mb-3 underline decoration-black/20 underline-offset-4 tracking-tight">
              Optimize Cashflow
            </h2>
            <p className="text-black/80 text-xs font-medium leading-relaxed font-sans">
              Neural algorithms processed your latest deposits and card payments contextually. Let Aura extract potential subscription leaks and budget savings.
            </p>
          </div>

          <div className="space-y-2 mt-6">
            <button 
              onClick={() => onNavigateToTab("ai")}
              className="w-full bg-black text-white hover:bg-neutral-900 active:scale-95 transition-transform rounded-2xl py-3.5 text-xs font-mono font-bold uppercase tracking-wider justify-center flex items-center gap-2 cursor-pointer shadow-indigo-950/40"
            >
              EXECUTE OPTIMIZATION <ArrowUpRight className="w-4 h-4" />
            </button>
            <p className="text-[9px] text-center text-black/45 font-mono font-semibold">
              SOPHISTICATED PULSE CORE ACTIVE
            </p>
          </div>
        </div>

        {/* Recent Transactions Panel Preview */}
        <div className="lg:col-span-8 bg-white/[0.03] p-6 rounded-[32px] border border-white/5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h3 className="text-md font-sans font-bold text-white">Recent Activity</h3>
              <p className="text-xs text-white/40">Most recent transactions across accounts</p>
            </div>
            <button 
              onClick={() => onNavigateToTab("transactions")}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono font-bold text-white/80 tracking-wide transition-colors cursor-pointer"
            >
              VIEW ALL
            </button>
          </div>

          <div className="space-y-2.5">
            {recentTransactions.map((tx) => {
              const spec = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES[CATEGORIES.length - 1];
              const isExpense = tx.type === "expense";
              const dateStr = new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

              return (
                <div 
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="group p-3 rounded-2xl bg-[#0c0c0c]/40 border border-[#ffffff]/5 hover:border-[#ffffff]/10 hover:bg-white/[0.02] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-xl border transition-all duration-300 text-white"
                      style={{ 
                        backgroundColor: `${spec.color}15`, 
                        borderColor: `${spec.color}30`,
                        color: spec.color
                      }}
                    >
                      <CategoryIcon name={spec.icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-sans font-bold text-white/90 group-hover:text-white transition-colors">
                        {tx.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
                        <span className="font-semibold text-white/50 select-none uppercase">{tx.category}</span>
                        <span>•</span>
                        <span>{dateStr}</span>
                        {tx.isRecurring && (
                          <>
                            <span>•</span>
                            <span className="text-cyan-400 font-bold select-none text-[8.5px] bg-cyan-500/10 px-1 rounded animate-pulse">RECURRING</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold ${isExpense ? 'text-white/80' : 'text-cyan-405'}`}>
                      {isExpense ? "-" : "+"}
                      {formatCurrencyValue(tx.amount, tx.currency || "INR")}
                    </span>

                    {/* Show dynamic converted amount in active currency if different */}
                    {(tx.currency || "INR").toUpperCase() !== displayCurrency.toUpperCase() && (
                      <span className="block text-[9.5px] text-[#00F5FF] font-mono leading-none mt-1 animate-fadeIn">
                        ≈ {isExpense ? "-" : "+"}
                        {formatCurrencyValue(
                          convertAmount(tx.amount, tx.currency || "INR", displayCurrency, exchangeRates),
                          displayCurrency
                        )}
                      </span>
                    )}
                    <span className="block text-[9px] text-white/30 font-mono uppercase mt-0.5">Posted</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
