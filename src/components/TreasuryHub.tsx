import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { 
  PiggyBank, 
  Settings, 
  TrendingUp, 
  Flame, 
  Clock, 
  X, 
  Plus, 
  RefreshCw, 
  Coins, 
  HelpCircle, 
  ShieldCheck, 
  Info,
  Calendar,
  AlertTriangle,
  Sparkles,
  Trash2,
  Lock,
  ChevronRight,
  Calculator,
  BellRing
} from "lucide-react";
import { Transaction, TreasuryPot, FinancialGoal } from "../types";
import { convertAmount, formatCurrencyValue } from "../utils/currencyUtils";

interface TreasuryHubProps {
  transactions: Transaction[];
  displayCurrency: string;
  exchangeRates: Record<string, number>;
}

export function TreasuryHub({ transactions, displayCurrency, exchangeRates }: TreasuryHubProps) {
  const [projectionRange, setProjectionRange] = useState<number>(30);
  const [showNominal, setShowNominal] = useState(true);
  const [showOptimized, setShowOptimized] = useState(true);
  const [showOverloaded, setShowOverloaded] = useState(true);

  // --- 1. CORE BALANCES & STATS CALCULATIONS ---
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    transactions.forEach(t => {
      const amountInDisplay = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
      if (t.type === "income") {
        income += amountInDisplay;
      } else {
        expense += amountInDisplay;
      }
    });

    const liquidPool = Math.max(0, income - expense);
    
    // Average daily burn rate across latest month transactions
    const now = new Date();
    const currentMonthTx = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    });

    let currentMonthExpense = 0;
    currentMonthTx.forEach(t => {
      if (t.type === "expense") {
        currentMonthExpense += convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
      }
    });

    const currentDay = Math.max(1, now.getDate());
    const dailyAverageBurn = currentMonthExpense > 0 ? (currentMonthExpense / currentDay) : (expense / 30 || 150);

    return {
      liquidPool,
      dailyAverageBurn: Math.max(1, dailyAverageBurn),
    };
  }, [transactions, displayCurrency, exchangeRates]);

  // --- 2. VIRTUAL ACCOUNT POTS STATE ---
  const [pots, setPots] = useState<TreasuryPot[]>(() => {
    const stored = localStorage.getItem("aura_treasury_pots");
    if (stored) {
      try { return JSON.parse(stored); } catch { }
    }
    return [
      { id: "checking", name: "Operating Checking", percent: 40, color: "#22d3ee", icon: "checking" },
      { id: "tax", name: "Tax Reserve", percent: 20, color: "#a78bfa", icon: "tax" },
      { id: "quantum", name: "Quantum Growth & Investing", percent: 30, color: "#34d399", icon: "quantum" },
      { id: "leisure", name: "Adventure Reserve", percent: 10, color: "#fb7185", icon: "leisure" }
    ];
  });

  // Sync pots to localStorage
  useEffect(() => {
    localStorage.setItem("aura_treasury_pots", JSON.stringify(pots));
  }, [pots]);

  const potsPercentageSum = useMemo(() => {
    return pots.reduce((sum, p) => sum + p.percent, 0);
  }, [pots]);

  const handleRatioChange = (id: string, value: number) => {
    setPots(prev => prev.map(p => p.id === id ? { ...p, percent: value } : p));
  };

  const handleAutoNormalize = () => {
    const sum = potsPercentageSum;
    if (sum === 0) {
      const equalShare = Math.floor(100 / pots.length);
      setPots(prev => prev.map(p => ({ ...p, percent: equalShare })));
      return;
    }
    setPots(prev => {
      const normalized = prev.map(p => {
        const factor = 100 / sum;
        return {
          ...p,
          percent: Math.round(p.percent * factor)
        };
      });
      // Correct for any rounding offsets to make total exactly 100%
      const newSum = normalized.reduce((total, p) => total + p.percent, 0);
      if (newSum !== 100 && normalized.length > 0) {
        normalized[0].percent += (100 - newSum);
      }
      return normalized;
    });
  };

  // Add pot dialog states
  const [isNewPotModalOpen, setIsNewPotModalOpen] = useState(false);
  const [newPotName, setNewPotName] = useState("");
  const [newPotPercent, setNewPotPercent] = useState(10);
  const [newPotColor, setNewPotColor] = useState("#22d3ee");

  const handleCreatePot = () => {
    const name = newPotName.trim();
    if (!name) return;
    const newId = `pot-${Date.now()}`;
    const freshPot: TreasuryPot = {
      id: newId,
      name,
      percent: Math.min(100, Math.max(0, newPotPercent)),
      color: newPotColor,
      icon: "saving"
    };
    setPots(prev => [...prev, freshPot]);
    setIsNewPotModalOpen(false);
    setNewPotName("");
    setNewPotPercent(10);
  };

  const handleDeletePot = (id: string) => {
    if (pots.length <= 1) return; // Keep at least one pot
    setPots(prev => prev.filter(p => p.id !== id));
  };

  // --- 3. DYNAMIC GOALS STATE ---
  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const stored = localStorage.getItem("aura_financial_goals");
    if (stored) {
      try { return JSON.parse(stored); } catch { }
    }
    return [
      { id: "runway-goal", name: "6-Month Security Runway Reserve", targetAmount: 250000, potId: "checking", deadline: "2026-12-31", isCompleted: false },
      { id: "workstation-goal", name: "Quantum Tech Lab Hardware Upgrade", targetAmount: 120000, potId: "quantum", deadline: "2026-09-30", isCompleted: false }
    ];
  });

  useEffect(() => {
    localStorage.setItem("aura_financial_goals", JSON.stringify(goals));
  }, [goals]);

  // Goal input form states
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(50000);
  const [newGoalPot, setNewGoalPot] = useState("checking");
  const [newGoalDeadline, setNewGoalDeadline] = useState("2026-12-31");

  const handleCreateGoal = () => {
    const name = newGoalName.trim();
    if (!name) return;
    const newId = `goal-${Date.now()}`;
    const freshGoal: FinancialGoal = {
      id: newId,
      name,
      targetAmount: Number(newGoalTarget),
      potId: newGoalPot,
      deadline: newGoalDeadline || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      isCompleted: false
    };
    setGoals(prev => [...prev, freshGoal]);
    setIsNewGoalModalOpen(false);
    setNewGoalName("");
    setNewGoalTarget(50000);
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleToggleGoalCompleted = (id: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, isCompleted: !g.isCompleted } : g));
  };

  // --- 4. SMART SUBSCRIPTIONS REGISTRY STATE ---
  const [subscriptions, setSubscriptions] = useState(() => {
    const stored = localStorage.getItem("aura_smart_subscriptions");
    if (stored) {
      try { return JSON.parse(stored); } catch { }
    }
    return [
      { id: "sub-1", name: "X-Pense Enterprise Suite", cost: 1200, category: "Software", period: "Monthly", nextRenewal: "2026-06-18" },
      { id: "sub-2", name: "Cloud Compute Node", cost: 4500, category: "Infrastructure", period: "Monthly", nextRenewal: "2026-06-25" },
      { id: "sub-3", name: "Cybersecurity Feed API", cost: 8400, category: "Security", period: "Yearly", nextRenewal: "2026-07-02" }
    ];
  });

  useEffect(() => {
    localStorage.setItem("aura_smart_subscriptions", JSON.stringify(subscriptions));
  }, [subscriptions]);

  // Subscription inputs
  const [isNewSubModalOpen, setIsNewSubModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCost, setNewSubCost] = useState(1500);
  const [newSubCategory, setNewSubCategory] = useState("Software");
  const [newSubNextDate, setNewSubNextDate] = useState("2026-06-20");

  const handleCreateSub = () => {
    const name = newSubName.trim();
    if (!name) return;
    const freshSub = {
      id: `sub-${Date.now()}`,
      name,
      cost: Number(newSubCost),
      category: newSubCategory,
      period: "Monthly",
      nextRenewal: newSubNextDate || new Date().toISOString().split('T')[0]
    };
    setSubscriptions(prev => [freshSub, ...prev]);
    setIsNewSubModalOpen(false);
    setNewSubName("");
    setNewSubCost(1500);
  };

  const handleDeleteSub = (id: string) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  };

  // Sweep current transactions for suspicious recurring software subscriptions
  const flaggedRecurringTx = useMemo(() => {
    const softwareTx = transactions.filter(t => {
      const lowerTitle = t.title.toLowerCase();
      return t.type === "expense" && (
        lowerTitle.includes("sub") ||
        lowerTitle.includes("premium") ||
        lowerTitle.includes("aws") ||
        lowerTitle.includes("github") ||
        lowerTitle.includes("cloud") ||
        lowerTitle.includes("licence") ||
        lowerTitle.includes("saas") ||
        lowerTitle.includes("gpt") ||
        lowerTitle.includes("domain")
      );
    });

    return softwareTx.slice(0, 3).map(tx => ({
      ...tx,
      convertedAmount: convertAmount(tx.amount, tx.currency || "INR", displayCurrency, exchangeRates)
    }));
  }, [transactions, displayCurrency, exchangeRates]);

  // Combined totals inside subscriptions
  const subscriptionAnnualDrain = useMemo(() => {
    return subscriptions.reduce((sum, s) => {
      const conversionUSDInPreset = convertAmount(s.cost, "INR", displayCurrency, exchangeRates);
      // If s.period is Yearly, just add conversion, else multiply by 12
      return sum + (s.period === "Yearly" ? conversionUSDInPreset : conversionUSDInPreset * 12);
    }, 0);
  }, [subscriptions, displayCurrency, exchangeRates]);

  // Trajectory Simulation Matrix
  const trajectoryData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    let balanceNominal = stats.liquidPool;
    let balanceOptimized = stats.liquidPool;
    let balanceOverloaded = stats.liquidPool;

    // Convert subscription costs
    const convertedSubs = subscriptions.map((s: any) => {
      const cost = convertAmount(s.cost, "INR", displayCurrency, exchangeRates);
      const renewalDate = new Date(s.nextRenewal);
      return { ...s, cost, renewalDate };
    });

    for (let d = 0; d <= projectionRange; d++) {
      const dDate = new Date();
      dDate.setDate(now.getDate() + d);
      const dateStr = dDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      if (d > 0) {
        let subCostsNominal = 0;
        let subCostsOptimized = 0;
        let subCostsOverloaded = 0;

        convertedSubs.forEach((s: any) => {
          const diffTime = dDate.getTime() - s.renewalDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
          if (diffDays === 0 || (diffDays > 0 && s.period === "Monthly" && diffDays % 30 === 0)) {
            subCostsNominal += s.cost;
            subCostsOptimized += s.cost;
            subCostsOverloaded += s.cost * 1.25; // simulate overcharges/peak usage
          }
        });

        balanceNominal = Math.max(0, balanceNominal - stats.dailyAverageBurn - subCostsNominal);
        balanceOptimized = Math.max(0, balanceOptimized - (stats.dailyAverageBurn * 0.70) - subCostsOptimized);
        balanceOverloaded = Math.max(0, balanceOverloaded - (stats.dailyAverageBurn * 1.40) - subCostsOverloaded);
      }

      data.push({
        day: d,
        date: dateStr,
        "Status Quo": Math.round(balanceNominal),
        "Optimized (Frugal)": Math.round(balanceOptimized),
        "Overloaded (Scaling)": Math.round(balanceOverloaded),
      });
    }
    return data;
  }, [stats.liquidPool, stats.dailyAverageBurn, subscriptions, displayCurrency, exchangeRates, projectionRange]);

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0a] p-6 rounded-[32px] border border-white/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-bold tracking-tight text-white mb-1">
            Treasury Allocations Hub
          </h1>
          <p className="text-xs text-cyan-400 font-mono uppercase tracking-wider">
            Virtual Vault Division • Predictive Liquidity Engine
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-2xl border border-white/5">
          <Coins className="w-5 h-5 text-emerald-400" />
          <div className="text-right">
            <div className="text-[10px] text-white/40 font-mono font-medium">TOTAL RESERVES</div>
            <div className="text-sm font-bold text-white font-mono">
              {formatCurrencyValue(stats.liquidPool, displayCurrency)}
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN INTERACTIVE INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMN 1: COSMIC VIRTUAL ALLOCATOR POTS (SPAN 2) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl p-6 rounded-[32px] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/15">
                  <PiggyBank className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-md font-sans font-bold text-white">Dynamic Asset Allocator</h3>
                  <p className="text-[10px] text-white/40 font-mono uppercase">Virtual balance partitioning matrices</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoNormalize}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all ${
                    potsPercentageSum !== 100 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-400 hover:text-black hover:border-transparent animate-pulse" 
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                  }`}
                  title="Correct total proportion ratios to mathematically sum to 100%"
                >
                  <RefreshCw className="w-3 h-3" />
                  Auto-Balance
                </button>
                <button
                  onClick={() => setIsNewPotModalOpen(true)}
                  className="p-1.5 rounded-xl bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/25 hover:bg-[#00F5FF] hover:text-black transition-all cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ERROR TRIGGER STATUS FOR RATIO SPLITS */}
            {potsPercentageSum !== 100 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-amber-400 text-xs flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <div className="font-mono text-[10.5px]">
                  RATIO DRIFT DETECTED: Set allocations total <span className="font-bold underline">{potsPercentageSum}%</span>. For accurate pool mapping, lock to 100% using "Auto-Balance".
                </div>
              </div>
            )}

            {/* THE DRAG SLIDER ENGINE */}
            <div className="space-y-5">
              {pots.map((pot) => {
                const assignedValue = (stats.liquidPool * pot.percent) / 100;
                return (
                  <div key={pot.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: pot.color, boxShadow: `0 0 10px ${pot.color}50` }} 
                        />
                        <span className="text-xs font-semibold text-white font-sans">{pot.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-white/50">
                          {pot.percent}%
                        </span>
                        <span 
                          className="text-xs font-mono font-extrabold"
                          style={{ color: pot.color }}
                        >
                          {formatCurrencyValue(assignedValue, displayCurrency)}
                        </span>
                        {pots.length > 1 && (
                          <button
                            onClick={() => handleDeletePot(pot.id)}
                            className="p-1 opacity-0 group-hover:opacity-100 text-white/25 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={pot.percent}
                        onChange={(e) => handleRatioChange(pot.id, parseInt(e.target.value) || 0)}
                        className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-ew-resize focus:outline-none accent-cyan-400"
                        style={{
                          accentColor: pot.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 1.2: FINANCIAL GOALS Milestones */}
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl p-6 rounded-[32px] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/15">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-md font-sans font-bold text-white">Active Operational Milestones</h3>
                  <p className="text-[10px] text-white/40 font-mono uppercase">Goals backed by specific asset pots</p>
                </div>
              </div>

              <button
                onClick={() => setIsNewGoalModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-400 hover:text-black transition-all text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Milestone
              </button>
            </div>

            {/* GOALS LOOP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const specPot = pots.find(p => p.id === goal.potId) || pots[0];
                const potValue = (stats.liquidPool * (specPot?.percent || 0)) / 100;
                
                // Set conversion target in original system
                const convertedTarget = convertAmount(goal.targetAmount, "INR", displayCurrency, exchangeRates);
                const progressPercentage = Math.min(100, Math.round((potValue / convertedTarget) * 100)) || 0;
                const daysRemaining = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 3600 * 24)));

                return (
                  <div key={goal.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 relative flex flex-col justify-between h-42">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40 uppercase">
                          CAPPED ON {specPot?.name || "RESERVE"}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={goal.isCompleted}
                            onChange={() => handleToggleGoalCompleted(goal.id)}
                            className="w-3.5 h-3.5 border-white/20 rounded cursor-pointer accent-cyan-400"
                          />
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1 text-white/25 hover:text-rose-400 hover:bg-rose-500/5 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <h4 className={`text-xs font-bold leading-tight ${goal.isCompleted ? 'text-white/40 line-through' : 'text-white'}`}>
                        {goal.name}
                      </h4>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <div className="text-xs font-mono font-bold text-white/80">
                          {formatCurrencyValue(potValue, displayCurrency)}
                          <span className="text-[10px] text-white/30 font-normal"> / {formatCurrencyValue(convertedTarget, displayCurrency)}</span>
                        </div>
                        <span className="text-xs font-mono font-black text-cyan-400">
                          {progressPercentage}%
                        </span>
                      </div>

                      {/* Spark progress bar */}
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500 rounded-full"
                          style={{ 
                            width: `${progressPercentage}%`,
                            backgroundColor: specPot?.color || "#22d3ee"
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono text-white/40">
                        <span>Countdown:</span>
                        <span className="text-white/60 font-medium">
                          {daysRemaining > 0 ? `${daysRemaining} days left` : "Lock achieved"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 2: SCI-FI ANALYSIS SIDEBARS (SPAN 1) */}
        <div className="space-y-8">
          
          {/* RUNWAY DYNAMIC ESTIMATOR */}
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl p-6 rounded-[32px] space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/15">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-sans font-bold text-white">Dynamic Cash Runway</h3>
                <p className="text-[10px] text-white/40 font-mono uppercase">Outflow trajectory countdowns</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-1">
              <span className="text-[10px] font-mono text-white/30 uppercase block">Active Liquidity Lifespan</span>
              <div className="text-4xl font-black text-white font-mono leading-none py-1">
                {Math.round(stats.liquidPool / stats.dailyAverageBurn)}
                <span className="text-sm text-amber-400 uppercase font-bold ml-1">Days</span>
              </div>
              <p className="text-[10px] text-white/40 font-mono">
                Projected runway based on median burn rate of <span className="font-bold text-white">{formatCurrencyValue(stats.dailyAverageBurn, displayCurrency)}/day</span>
              </p>
            </div>

            {/* THREE COUNTERPLAY SCENARIOS MATRICES */}
            <div className="space-y-4">
              <span className="text-[9px] font-mono text-white/35 uppercase tracking-wider block">PREDICTIVE SIMULATION SECTORS</span>
              
              {/* Scenario 1: Optimized Pristine Flow */}
              <div className="p-3 rounded-xl bg-[#34d399]/[0.02] border border-[#34d399]/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block leading-tight">Hyper-Optimized</span>
                  <span className="text-[9px] text-white/30 font-mono leading-none">Continuous -30% Frugal Trim</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-black text-emerald-400">
                    {Math.round(stats.liquidPool / (stats.dailyAverageBurn * 0.70))}
                  </span>
                  <span className="text-[9px] font-mono text-white/40 ml-1">Days</span>
                </div>
              </div>

              {/* Scenario 2: Nominal Current Track */}
              <div className="p-3 rounded-xl bg-cyan-400/[0.02] border border-cyan-400/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-cyan-400 block leading-tight">Status Quo</span>
                  <span className="text-[9px] text-white/30 font-mono leading-none">Nominal operating parameters</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-black text-cyan-400">
                    {Math.round(stats.liquidPool / stats.dailyAverageBurn)}
                  </span>
                  <span className="text-[9px] font-mono text-white/40 ml-1">Days</span>
                </div>
              </div>

              {/* Scenario 3: Extravagant Burn Track */}
              <div className="p-3 rounded-xl bg-rose-400/[0.02] border border-rose-400/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-400 block leading-tight">Overloaded Incline</span>
                  <span className="text-[9px] text-white/30 font-mono leading-none">Surplus +40% Scaling Leakages</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-black text-rose-400">
                    {Math.round(stats.liquidPool / (stats.dailyAverageBurn * 1.40))}
                  </span>
                  <span className="text-[9px] font-mono text-white/40 ml-1">Days</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE REGULAR SUBSCRIPTION CALENDAR countdown */}
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl p-6 rounded-[32px] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/15">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-sans font-bold text-white">SaaS & Subscriptions</h3>
                  <p className="text-[10px] text-white/40 font-mono uppercase">Automatic running obligations</p>
                </div>
              </div>

              <button
                onClick={() => setIsNewSubModalOpen(true)}
                className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-400 hover:text-black transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center text-center">
              <div className="text-left">
                <span className="text-[9px] font-mono text-white/30 uppercase block">Annual Drain Rate</span>
                <span className="text-md font-mono font-black text-indigo-400">
                  {formatCurrencyValue(subscriptionAnnualDrain, displayCurrency)}
                  <span className="text-[9px] font-normal text-white/40 block">/ Year Combined</span>
                </span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#00F5FF]/10 text-[#00F5FF] text-[9.5px] font-mono font-bold leading-none animate-pulse uppercase border border-[#00F5FF]/20">
                Active Sweeper
              </div>
            </div>

            {/* SUBSCRIBERS LISTING */}
            <div className="space-y-3.5">
              {subscriptions.map((sub) => {
                const specCost = convertAmount(sub.cost, "INR", displayCurrency, exchangeRates);
                const daysToRenewal = Math.max(0, Math.ceil((new Date(sub.nextRenewal).getTime() - Date.now()) / (1000 * 3600 * 24)));

                return (
                  <div key={sub.id} className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <div>
                        <span className="text-xs font-bold text-white block leading-tight">{sub.name}</span>
                        <span className="text-[9.5px] font-mono text-white/30">
                          {sub.category} • {formatCurrencyValue(specCost, displayCurrency)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8.5px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                        daysToRenewal <= 3 ? "bg-rose-500/10 text-rose-400 animate-pulse border border-rose-500/20" : "bg-white/5 text-white/40"
                      }`}>
                        {daysToRenewal === 0 ? "Renewing today" : `In ${daysToRenewal} days`}
                      </span>
                      <button
                        onClick={() => handleDeleteSub(sub.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-400 hover:bg-rose-500/5 rounded-md transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 4.3: TRANSACTION ALERTS TRADING RECURRENCES */}
            {flaggedRecurringTx.length > 0 && (
              <div className="pt-4 border-t border-white/5 space-y-3">
                <span className="text-[10px] font-mono text-white/30 uppercase block">FLAGGED AUTO-RECURRENT ALERTS</span>
                <div className="space-y-2">
                  {flaggedRecurringTx.map((tx) => (
                    <div key={tx.id} className="p-2 rounded-lg bg-yellow-500/5 text-yellow-400/90 text-[10.5px] font-mono flex justify-between items-center border border-yellow-500/10">
                      <div className="truncate pr-2">🔗 {tx.title}</div>
                      <span className="font-bold shrink-0">{formatCurrencyValue(tx.convertedAmount, displayCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREDICTIVE CASHFLOW BURN TRAJECTORY CHART MODULE */}
      <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl p-6 rounded-[32px] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/15 animate-pulse">
              <Flame className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-md font-sans font-bold text-white">Predictive Cashflow Burn Trajectory</h3>
              <p className="text-[10px] text-white/40 font-mono uppercase">Simulation matrix of depletion coordinates</p>
            </div>
          </div>

          {/* SIMULATION CONTROLS */}
          <div className="flex flex-wrap items-center gap-3">
            {/* RANGE SELECTORS */}
            <div className="flex items-center bg-white/[0.02] border border-white/10 p-1 rounded-xl">
              {[30, 60, 90].map((r) => (
                <button
                  key={r}
                  onClick={() => setProjectionRange(r)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    projectionRange === r 
                      ? "bg-amber-400 text-black shadow-lg" 
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {r}D
                </button>
              ))}
            </div>

            {/* TOGGLE OPTIONS */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNominal(!showNominal)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-mono border transition-all cursor-pointer ${
                  showNominal 
                    ? "bg-cyan-500/10 border-cyan-400/20 text-cyan-400" 
                    : "bg-white/2 border-white/5 text-white/20"
                }`}
              >
                Status Quo
              </button>
              <button
                onClick={() => setShowOptimized(!showOptimized)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-mono border transition-all cursor-pointer ${
                  showOptimized 
                    ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-400" 
                    : "bg-white/2 border-white/5 text-white/20"
                }`}
              >
                Optimized
              </button>
              <button
                onClick={() => setShowOverloaded(!showOverloaded)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-mono border transition-all cursor-pointer ${
                  showOverloaded 
                    ? "bg-rose-500/10 border-rose-400/20 text-rose-400" 
                    : "bg-white/2 border-white/5 text-white/20"
                }`}
              >
                Overloaded
              </button>
            </div>
          </div>
        </div>

        {/* RECHARTS COMPONENT STAGE */}
        <div className="w-full h-80 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOverloaded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={9} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={9} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrencyValue(value, displayCurrency).replace(/\.00$/, "")}
              />
              <Tooltip 
                content={({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#0a0a0c]/90 border border-white/10 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md">
                        <p className="text-[9px] font-mono text-white/40 uppercase mb-1.5">{label}</p>
                        {payload.map((p: any) => (
                          <div key={p.name} className="flex items-center gap-4 justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                              <span className="text-[11px] text-white/70 font-sans">{p.name}:</span>
                            </div>
                            <span className="text-[11px] font-mono font-bold" style={{ color: p.color }}>
                              {formatCurrencyValue(p.value, displayCurrency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }} 
              />
              {showNominal && (
                <Area 
                  type="monotone" 
                  dataKey="Status Quo" 
                  stroke="#22d3ee" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorNominal)" 
                  dot={false}
                />
              )}
              {showOptimized && (
                <Area 
                  type="monotone" 
                  dataKey="Optimized (Frugal)" 
                  stroke="#34d399" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorOptimized)" 
                  dot={false}
                />
              )}
              {showOverloaded && (
                <Area 
                  type="monotone" 
                  dataKey="Overloaded (Scaling)" 
                  stroke="#fb7185" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorOverloaded)" 
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* SIMULATION INSIGHTS CRASH WARNINGS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-[11px]">
          <div className="p-3.5 rounded-2xl bg-[#22d3ee]/[0.02] border border-[#22d3ee]/10 flex flex-col justify-between">
            <span className="text-white/40 font-medium">STATUS QUO REDLINE</span>
            <div className="mt-2 flex justify-between items-baseline">
              <span className="text-white font-bold">Expires in:</span>
              <span className="text-sm font-black text-[#22d3ee]">
                {Math.round(stats.liquidPool / stats.dailyAverageBurn)} Days
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#34d399]/[0.02] border border-[#34d399]/10 flex flex-col justify-between">
            <span className="text-white/40 font-medium">OPTIMIZED FRUGAL REDLINE</span>
            <div className="mt-2 flex justify-between items-baseline">
              <span className="text-white font-bold">Expires in:</span>
              <span className="text-sm font-black text-[#34d399]">
                {Math.round(stats.liquidPool / (stats.dailyAverageBurn * 0.70))} Days
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#fb7185]/[0.02] border border-[#fb7185]/10 flex flex-col justify-between">
            <span className="text-white/40 font-medium">OVERLOADED CRITICAL REDLINE</span>
            <div className="mt-2 flex justify-between items-baseline">
              <span className="text-white font-bold">Expires in:</span>
              <span className="text-sm font-black text-[#fb7185]">
                {Math.round(stats.liquidPool / (stats.dailyAverageBurn * 1.40))} Days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- ADD POT PORTAL DIALOG --- */}
      <AnimatePresence>
        {isNewPotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewPotModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 space-y-6 shadow-2xl z-10"
            >
              <div className="flex justify-between items-center text-left">
                <h3 className="text-sm font-sans font-extrabold uppercase text-white tracking-widest">Commission Asset Pot</h3>
                <button onClick={() => setIsNewPotModalOpen(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">POT IDENTIFIER NAME</label>
                  <input
                    type="text"
                    value={newPotName}
                    onChange={(e) => setNewPotName(e.target.value.slice(0, 24))}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F5FF]/40 font-sans"
                    placeholder="e.g., Venture Seed Fund"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">INITIAL SPLIT INTENSITY ({newPotPercent}%)</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={newPotPercent}
                    onChange={(e) => setNewPotPercent(parseInt(e.target.value) || 1)}
                    className="w-full accent-[#00F5FF] h-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">VAULT CORE COLOR</label>
                  <div className="grid grid-cols-5 gap-2">
                    {["#22d3ee", "#a78bfa", "#34d399", "#fb7185", "#fbbf24"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewPotColor(color)}
                        className={`w-full h-8 rounded-xl relative cursor-pointer border`}
                        style={{ 
                          backgroundColor: color,
                          borderColor: newPotColor === color ? "#ffffff" : "transparent"
                        }}
                      >
                        {newPotColor === color && <div className="absolute inset-1 rounded-lg border border-black/30" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreatePot}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-[#00F5FF] hover:to-blue-400 text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                INITIALIZE VAULT
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD NEW MILESTONE GOAL PORTAL --- */}
      <AnimatePresence>
        {isNewGoalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewGoalModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 space-y-6 shadow-2xl z-10"
            >
              <div className="flex justify-between items-center text-left">
                <h3 className="text-sm font-sans font-extrabold uppercase text-white tracking-widest">Authorize Financial Milestone</h3>
                <button onClick={() => setIsNewGoalModalOpen(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">MILESTONE TARGET NAME</label>
                  <input
                    type="text"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value.slice(0, 32))}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F5FF]/40 font-sans"
                    placeholder="e.g., Acquire Nvidia Workstation"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">TARGET AMOUNT IN {displayCurrency}</label>
                  <input
                    type="number"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F5FF]/40 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">BACKING LIQUIDITY POT</label>
                  <select
                    value={newGoalPot}
                    onChange={(e) => setNewGoalPot(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {pots.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.percent}%)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">IDEAL DEADLINE DATE</label>
                  <input
                    type="date"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F5FF]/40 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateGoal}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                CREATE GOAL SPEC
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD NEW SUBSCRIPTION PORTAL --- */}
      <AnimatePresence>
        {isNewSubModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewSubModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 space-y-6 shadow-2xl z-10"
            >
              <div className="flex justify-between items-center text-left">
                <h3 className="text-sm font-sans font-extrabold uppercase text-white tracking-widest">Register SaaS Obligation</h3>
                <button onClick={() => setIsNewSubModalOpen(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">SaaS / SERVICE NAME</label>
                  <input
                    type="text"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value.slice(0, 32))}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F5FF]/40 font-sans"
                    placeholder="e.g., Claude Pro Node"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">MONTHLY COST RATE ({displayCurrency})</label>
                  <input
                    type="number"
                    value={newSubCost}
                    onChange={(e) => setNewSubCost(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F5FF]/40 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">OBLIGATION CATEGORY</label>
                  <select
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Software">Software & SaaS</option>
                    <option value="Infrastructure">DevOps & Cloud Server</option>
                    <option value="Security">Security & Proxy API</option>
                    <option value="Entertainment">Entertainment Media</option>
                    <option value="Personal">Personal Recurring</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-white/40 uppercase">NEXT RECOVERY renewal DATE</label>
                  <input
                    type="date"
                    value={newSubNextDate}
                    onChange={(e) => setNewSubNextDate(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F5FF]/40 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateSub}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                COMMIT SaaS ENTRY
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
