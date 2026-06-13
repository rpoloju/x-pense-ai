import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  Plus, 
  Trash2, 
  SlidersHorizontal, 
  ChevronRight, 
  X, 
  Calendar,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Tag,
  Clock,
  Filter,
  Check,
  Download,
  Upload,
  Settings2,
  Wand2,
  RefreshCw
} from "lucide-react";
import { Transaction, TransactionType, CategorizationRule } from "../types";
import { CATEGORIES } from "../data";
import { CategoryIcon } from "./CategoryIcon";
import { CURRENCIES, convertAmount, formatCurrencyValue } from "../utils/currencyUtils";
import { exportToExcelWithCharts } from "../utils/excelExporter";

interface TransactionHistoryProps {
  transactions: Transaction[];
  displayCurrency: string;
  exchangeRates: Record<string, number>;
  onAddTransaction: (newTx: Omit<Transaction, "id">) => void;
  onDeleteTransaction: (id: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onImportTransactions: (imported: Omit<Transaction, "id">[]) => void;
  availableTags: string[];
  onAddCustomTag: (tag: string) => void;
  onDeleteCustomTag: (tag: string) => void;
  onSyncTransactions?: (updated: Transaction[]) => void;
}

export function TransactionHistory({ 
  transactions, 
  displayCurrency,
  exchangeRates,
  onAddTransaction, 
  onDeleteTransaction,
  onSelectTransaction,
  onImportTransactions,
  availableTags,
  onAddCustomTag,
  onDeleteCustomTag,
  onSyncTransactions
}: TransactionHistoryProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);

  // --- Cosmic Ledger Productivity States (Multiselect, Custom Rules, CSV Sandbox) ---
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rules, setRules] = useState<CategorizationRule[]>(() => {
    try {
      const stored = localStorage.getItem("aura_categorization_rules");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    const seedRules: CategorizationRule[] = [
      { id: "rule-1", keyword: "AWS", category: "Housing & Rent", type: "expense", tags: ["Business"], isActive: true },
      { id: "rule-2", keyword: "Netflix", category: "Entertainment", type: "expense", tags: ["Subscription"], isActive: true },
      { id: "rule-3", keyword: "Uber", category: "Transportation", type: "expense", tags: ["Leisure"], isActive: true },
      { id: "rule-4", keyword: "Salary", category: "Income", type: "income", tags: [], isActive: true },
      { id: "rule-5", keyword: "Amazon", category: "Shopping", type: "expense", tags: [], isActive: true },
      { id: "rule-6", keyword: "Starbucks", category: "Food & Dining", type: "expense", tags: [], isActive: true }
    ];
    localStorage.setItem("aura_categorization_rules", JSON.stringify(seedRules));
    return seedRules;
  });
  
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("Food & Dining");
  const [newRuleType, setNewRuleType] = useState<TransactionType>("expense");
  const [newRuleTagInput, setNewRuleTagInput] = useState("");

  const [sandboxTransactions, setSandboxTransactions] = useState<Omit<Transaction, "id">[] | null>(null);
  const [sandboxCheckedIndices, setSandboxCheckedIndices] = useState<number[]>([]);
  const [sandboxBulkCategory, setSandboxBulkCategory] = useState("");
  // --- End Cosmic Ledger Productivity States ---

  // Date window state definitions
  const [dateWindow, setDateWindow] = useState<"all" | "this-month" | "last-month" | "30-days" | "90-days" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Import Upload state definitions
  const [importedPreview, setImportedPreview] = useState<Omit<Transaction, "id">[] | null>(null);
  const [importNotice, setImportNotice] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const [selectedTagsFilter, setSelectedTagsFilter] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Create unique list of tags across all transactions (plus high-utility defaults)
  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>(availableTags);
    transactions.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => {
          if (tag.trim()) tagsSet.add(tag.trim());
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [transactions, availableTags]);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    type: "expense" as TransactionType,
    category: "Food & Dining",
    date: new Date().toISOString().split("T")[0],
    description: "",
    isRecurring: false,
    currency: displayCurrency,
    notes: "",
    tags: [] as string[]
  });
  const [formError, setFormError] = useState("");

  // Reset active category filter on toggle type filter
  useEffect(() => {
    if (activeCategoryFilter !== "all") {
      const selectedCat = CATEGORIES.find(c => c.id === activeCategoryFilter);
      if (selectedCat) {
        if (activeTypeFilter === "expense" && selectedCat.isIncome) {
          setActiveCategoryFilter("all");
        } else if (activeTypeFilter === "income" && !selectedCat.isIncome) {
          setActiveCategoryFilter("all");
        }
      }
    }
  }, [activeTypeFilter, activeCategoryFilter]);

  // Process filters
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Date window filter
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (dateWindow !== "all") {
      result = result.filter(tx => {
        const txDate = new Date(tx.date);
        if (isNaN(txDate.getTime())) return true;

        if (dateWindow === "this-month") {
          return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
        } else if (dateWindow === "last-month") {
          let lastMonthYear = currentYear;
          let lastMonth = currentMonth - 1;
          if (lastMonth < 0) {
            lastMonth = 11;
            lastMonthYear -= 1;
          }
          return txDate.getFullYear() === lastMonthYear && txDate.getMonth() === lastMonth;
        } else if (dateWindow === "30-days") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return txDate >= thirtyDaysAgo && txDate <= now;
        } else if (dateWindow === "90-days") {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(now.getDate() - 90);
          return txDate >= ninetyDaysAgo && txDate <= now;
        } else if (dateWindow === "custom") {
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return txDate >= start && txDate <= end;
          } else if (customStartDate) {
            const start = new Date(customStartDate);
            return txDate >= start;
          } else if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return txDate <= end;
          }
        }
        return true;
      });
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(tx => 
        tx.title.toLowerCase().includes(q) || 
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        tx.category.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (activeTypeFilter !== "all") {
      result = result.filter(tx => tx.type === activeTypeFilter);
    }

    // Category filter
    if (activeCategoryFilter !== "all") {
      result = result.filter(tx => tx.category === activeCategoryFilter);
    }

    // Tag filtering (items matching any or all selected tags; we'll require all selected tags for precise narrowing, which is very helpful!)
    if (selectedTagsFilter.length > 0) {
      result = result.filter(tx => 
        selectedTagsFilter.every(tag => tx.tags && tx.tags.includes(tag))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === "date-asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "amount-desc") {
        return b.amount - a.amount;
      } else {
        return a.amount - b.amount;
      }
    });

    return result;
  }, [transactions, searchQuery, activeTypeFilter, activeCategoryFilter, sortBy, dateWindow, customStartDate, customEndDate, selectedTagsFilter]);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    processedTransactions.forEach(t => {
      const amtInDisplay = convertAmount(t.amount, t.currency || "INR", displayCurrency, exchangeRates);
      if (t.type === "income") totalIncome += amtInDisplay;
      else totalExpense += amtInDisplay;
    });

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [processedTransactions, displayCurrency, exchangeRates]);

  // --- Smart Rules Engine Helpers ---
  const applyRulesToTransaction = (title: string, currentCategory: string, type: TransactionType, currentTags?: string[]) => {
    let resolvedCategory = currentCategory;
    let resolvedTags = currentTags ? [...currentTags] : [];

    const matchingRule = rules.find(r => r.isActive && r.type === type && title.toLowerCase().includes(r.keyword.toLowerCase()));
    if (matchingRule) {
      resolvedCategory = matchingRule.category;
      if (matchingRule.tags) {
        matchingRule.tags.forEach(t => {
          if (!resolvedTags.includes(t)) resolvedTags.push(t);
        });
      }
    }
    return { category: resolvedCategory, tags: resolvedTags, wasMatched: !!matchingRule, matchedRule: matchingRule };
  };

  const runRulesRetroactively = () => {
    if (!onSyncTransactions) {
      alert("State synchronization error: Transaction history is not currently linked dynamically.");
      return;
    }

    let modifiedCount = 0;
    const updated = transactions.map(t => {
      const match = applyRulesToTransaction(t.title, t.category, t.type, t.tags || []);
      if (match.wasMatched && (match.category !== t.category || JSON.stringify(match.tags) !== JSON.stringify(t.tags || []))) {
        modifiedCount++;
      }
      return {
        ...t,
        category: match.category,
        tags: match.tags
      };
    });

    if (modifiedCount === 0) {
      alert("Retroactive sync completed: Every transaction is already fully aligned with active rule mappings.");
      return;
    }

    onSyncTransactions(updated);
    alert(`Retroactive sync complete! Verified ${transactions.length} total entries and auto-categorized ${modifiedCount} matched postings dynamically.`);
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword.trim()) return;

    if (rules.some(r => r.keyword.toLowerCase() === newRuleKeyword.trim().toLowerCase() && r.type === newRuleType)) {
      alert("An active automation rule already corresponds to this keyword payee trigger.");
      return;
    }

    const tagsArr = newRuleTagInput.split(",").map(t => t.trim()).filter(t => t.length > 0);

    const freshRule: CategorizationRule = {
      id: `rule-${Date.now()}`,
      keyword: newRuleKeyword.trim(),
      category: newRuleCategory,
      type: newRuleType,
      tags: tagsArr,
      isActive: true
    };

    const updated = [...rules, freshRule];
    setRules(updated);
    localStorage.setItem("aura_categorization_rules", JSON.stringify(updated));

    setNewRuleKeyword("");
    setNewRuleTagInput("");
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    localStorage.setItem("aura_categorization_rules", JSON.stringify(updated));
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    setRules(updated);
    localStorage.setItem("aura_categorization_rules", JSON.stringify(updated));
  };
  // --- End Smart Rules Helpers ---

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.title.trim()) {
      setFormError("Posting Title is a required field");
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Transaction Amount must be a positive number");
      return;
    }

    // Apply auto-categorization matching rules automatically on manual entry!
    const ruleMatch = applyRulesToTransaction(formData.title, formData.category, formData.type, formData.tags);

    onAddTransaction({
      title: formData.title,
      amount: amt,
      type: formData.type,
      category: ruleMatch.category,
      date: formData.date,
      description: formData.description.trim() || undefined,
      isRecurring: formData.isRecurring,
      currency: formData.currency,
      notes: formData.notes.trim() || undefined,
      tags: ruleMatch.tags
    });

    // Reset Form
    setFormData({
      title: "",
      amount: "",
      type: "expense",
      category: "Food & Dining",
      date: new Date().toISOString().split("T")[0],
      description: "",
      isRecurring: false,
      currency: displayCurrency,
      notes: "",
      tags: [] as string[]
    });
    setIsAddingModalOpen(false);
  };

  // Export processed transactions to high-fidelity Excel Spreadsheet with Charts
  const handleExportExcel = async () => {
    if (processedTransactions.length === 0) {
      alert("No transaction postings to export under the current chosen window.");
      return;
    }

    try {
      const windowName = dateWindow === "all" ? "All Time" : dateWindow;
      await exportToExcelWithCharts(processedTransactions, displayCurrency, windowName);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export Excel report. Please try again.");
    }
  };

  // Helper parser for quoted CSV rows
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let field = "";
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          field += '"';
          i++; // Skip the next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(field.trim());
        field = "";
      } else {
        field += char;
      }
    }
    result.push(field.trim());
    return result;
  };

  // Import uploaded CSV file
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Extract raw rows
      const rawLines: string[] = [];
      let currentLine = "";
      let insideQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
          currentLine += char;
        } else if (char === '\n' && !insideQuotes) {
          rawLines.push(currentLine.trim());
          currentLine = "";
        } else if (char === '\r' && !insideQuotes) {
          // ignore return char
        } else {
          currentLine += char;
        }
      }
      if (currentLine) {
        rawLines.push(currentLine.trim());
      }

      const validLines = rawLines.filter(line => line.trim().length > 0);
      if (validLines.length < 2) {
        alert("Empty list or invalid formatting. Header row must map Title, Amount, Type, Category, Date, etc.");
        return;
      }

      // Read Header Row
      const fileHeaders = parseCSVLine(validLines[0]).map(h => h.toLowerCase().replace(/[\s_]/g, ''));
      
      // Validate header requirements
      const titleColIdx = fileHeaders.indexOf("title");
      const amountColIdx = fileHeaders.indexOf("amount");
      if (titleColIdx === -1 || amountColIdx === -1) {
        alert("Format error. Spreadsheet must contain 'Title' and 'Amount' columns.");
        return;
      }

      const parsedRecords: Omit<Transaction, "id">[] = [];
      const nowString = new Date().toISOString().split("T")[0];

      // File headers indices mapping
      const typeColIdx = fileHeaders.indexOf("type");
      const categoryColIdx = fileHeaders.indexOf("category");
      const dateColIdx = fileHeaders.indexOf("date");
      const descriptionColIdx = fileHeaders.indexOf("description");
      const isRecurringColIdx = fileHeaders.indexOf("isrecurring");
      const currencyColIdx = fileHeaders.indexOf("currency");
      const notesColIdx = fileHeaders.indexOf("notes");

      for (let idx = 1; idx < validLines.length; idx++) {
        const line = validLines[idx];
        const columns = parseCSVLine(line);
        if (columns.length === 0 || (columns.length === 1 && !columns[0])) continue;

        // Resolve fields mapping
        const titleStr = columns[titleColIdx] || "";
        const title = titleStr.trim() || "Imported Ledger Booking";

        let amountNum = parseFloat(columns[amountColIdx]);
        if (isNaN(amountNum)) {
          amountNum = 0.00;
        }
        amountNum = Math.abs(amountNum);

        let typeVal: TransactionType = "expense";
        const typeStr = typeColIdx !== -1 && columns[typeColIdx] ? columns[typeColIdx].toLowerCase().trim() : "";
        if (typeStr === "income" || typeStr === "deposit" || typeStr === "credit" || typeStr === "influx") {
          typeVal = "income";
        }

        let categoryVal = typeVal === "income" ? "Income" : "Other";
        const categoryStr = categoryColIdx !== -1 && columns[categoryColIdx] ? columns[categoryColIdx].trim() : "";
        if (categoryStr) {
          const matching = CATEGORIES.find(c => 
            c.id.toLowerCase() === categoryStr.toLowerCase() ||
            c.name.toLowerCase() === categoryStr.toLowerCase() ||
            (c.isIncome && typeVal === "income" && c.name.toLowerCase().includes(categoryStr.toLowerCase()))
          );
          if (matching) {
            categoryVal = matching.id;
          }
        }

        let dateVal = nowString;
        const dateStr = dateColIdx !== -1 && columns[dateColIdx] ? columns[dateColIdx].trim() : "";
        if (dateStr) {
          const parsedD = new Date(dateStr);
          if (!isNaN(parsedD.getTime())) {
            dateVal = parsedD.toISOString().split("T")[0];
          }
        }

        const descriptionVal = descriptionColIdx !== -1 && columns[descriptionColIdx] ? columns[descriptionColIdx].trim() : undefined;
        const notesVal = notesColIdx !== -1 && columns[notesColIdx] ? columns[notesColIdx].trim() : undefined;

        let rCheck = false;
        const rStr = isRecurringColIdx !== -1 && columns[isRecurringColIdx] ? columns[isRecurringColIdx].toLowerCase().trim() : "";
        if (rStr === "true" || rStr === "yes" || rStr === "1") {
          rCheck = true;
        }

        let currencyVal = "INR";
        const currencyStr = currencyColIdx !== -1 && columns[currencyColIdx] ? columns[currencyColIdx].toUpperCase().trim() : "";
        if (currencyStr) {
          currencyVal = currencyStr;
        }

        parsedRecords.push({
          title,
          amount: amountNum,
          type: typeVal,
          category: categoryVal,
          date: dateVal,
          description: descriptionVal || undefined,
          isRecurring: rCheck,
          currency: currencyVal,
          notes: notesVal || undefined
        });
      }

      if (parsedRecords.length === 0) {
        alert("No valid periodic ledger records parsed inside document.");
        return;
      }

      // Run automatic pattern matching rules on the newly parsed records!
      const automatedRecords = parsedRecords.map(rec => {
        const automatch = applyRulesToTransaction(rec.title, rec.category, rec.type, rec.tags || []);
        return {
          ...rec,
          category: automatch.category,
          tags: automatch.tags
        };
      });

      // Redirect directly to our premium sandbox workspace!
      setSandboxTransactions(automatedRecords);
      setSandboxCheckedIndices(automatedRecords.map((_, i) => i));
    };

    reader.readAsText(file);
    // Reset file element value to enable uploading identical file sequentially
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0a0a] border border-white/5 p-6 rounded-[32px]">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-sans text-white">Ledger Bookings</h2>
          <p className="text-xs text-white/40">Search, filter, categorize, and capture cash postings</p>
        </div>
        <button
          onClick={() => {
            setFormError("");
            setIsAddingModalOpen(true);
          }}
          className="px-4 py-3 rounded-2xl bg-[#00F5FF] hover:bg-cyan-400 text-black text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/20 cursor-pointer transition-all duration-300"
        >
          <Plus className="w-4 h-4 text-black font-bold" /> POST TRANSACTION
        </button>
      </div>

      {/* FILTER SEARCH RIG */}
      <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[32px] space-y-4 shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Main search input */}
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input 
              type="text"
              placeholder="Search postings by title, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black border border-white/5 focus:border-cyan-400/40 rounded-2xl text-white placeholder-white/30 text-sm focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Sorter Selector */}
          <div className="flex items-center gap-2 bg-[#0c0c0c]/40 p-1.5 rounded-2xl border border-white/5">
            <SlidersHorizontal className="w-4 h-4 text-white/40 ml-2" />
            <select 
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-white/80 text-xs font-mono font-bold focus:outline-none pr-3 cursor-pointer"
            >
              <option value="date-desc" className="bg-black text-white/80">Date: NewestFirst</option>
              <option value="date-asc" className="bg-black text-white/80">Date: OldestFirst</option>
              <option value="amount-desc" className="bg-black text-white/80">Amount: HighToLow</option>
              <option value="amount-asc" className="bg-black text-white/80">Amount: LowToHigh</option>
            </select>
          </div>
        </div>

        {/* Filters and category controls */}
        <div className="flex flex-col gap-3">
          {/* Ledger Type Filters */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b border-white/5 pb-3">
            <div className="flex bg-black p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setActiveTypeFilter("all")}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wide transition-all ${activeTypeFilter === 'all' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white'}`}
              >
                ALL GENERAL POSTS
              </button>
              <button 
                onClick={() => setActiveTypeFilter("expense")}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wide transition-all ${activeTypeFilter === 'expense' ? 'bg-rose-500/15 text-rose-400 shadow border border-rose-500/25' : 'text-white/40 hover:text-white'}`}
              >
                EXPENSES ONLY
              </button>
              <button 
                onClick={() => setActiveTypeFilter("income")}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wide transition-all ${activeTypeFilter === 'income' ? 'bg-cyan-500/10 text-cyan-400 shadow border border-cyan-500/20' : 'text-white/40 hover:text-white'}`}
              >
                INCOMES ONLY
              </button>
            </div>
            
            {/* Summary statistics matching filter status */}
            <div className="text-white/30 font-mono text-[10px] flex gap-3">
              <span>Matched: <b className="text-white/80 font-medium">{processedTransactions.length} postings</b></span>
              <span>•</span>
              <span className="text-rose-400 font-bold">Net Expense: <b className="font-medium">{formatCurrencyValue(stats.totalExpense, displayCurrency)}</b></span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">Net Inflow: <b className="font-medium">{formatCurrencyValue(stats.totalIncome, displayCurrency)}</b></span>
            </div>
          </div>

          {/* Category filter pills row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] font-mono font-bold text-white/30 flex items-center gap-1 shrink-0 uppercase select-none">
              <Filter className="w-3.5 h-3.5" /> Pool Filters:
            </span>
            <button 
              onClick={() => setActiveCategoryFilter("all")}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all uppercase leading-none ${activeCategoryFilter === 'all' ? 'bg-[#00F5FF] text-black font-bold' : 'bg-black border border-white/5 text-white/50 hover:bg-white/5 hover:text-white'}`}
            >
              ALL CATEGORIES
            </button>
            {CATEGORIES.filter(c => {
              if (activeTypeFilter === "expense") return !c.isIncome;
              if (activeTypeFilter === "income") return c.isIncome;
              return true;
            }).map(category => (
              <button 
                key={category.id}
                onClick={() => setActiveCategoryFilter(category.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all uppercase flex items-center gap-1.5 shrink-0 ${
                  activeCategoryFilter === category.id 
                    ? `bg-[#00F5FF] text-black font-bold`
                    : `bg-black border border-white/5 text-white/50 hover:bg-white/5 hover:text-white`
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </button>
            ))}
          </div>

          {/* Tags filter pills row */}
          {allUniqueTags.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin border-t border-white/[0.03] pt-2">
              <span className="text-[10px] font-mono font-bold text-white/30 flex items-center gap-1 shrink-0 uppercase select-none">
                <Tag className="w-3.5 h-3.5" /> Filter Tags:
              </span>
              <button 
                onClick={() => setSelectedTagsFilter([])}
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all uppercase leading-none ${selectedTagsFilter.length === 0 ? 'bg-[#00F5FF] text-black font-bold' : 'bg-black border border-white/5 text-white/50 hover:bg-white/5 hover:text-white'}`}
              >
                ALL TAGS
              </button>
              {allUniqueTags.map(tag => {
                const isSelected = selectedTagsFilter.includes(tag);
                return (
                  <button 
                    key={tag}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTagsFilter(selectedTagsFilter.filter(t => t !== tag));
                      } else {
                        setSelectedTagsFilter([...selectedTagsFilter, tag]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all uppercase flex items-center gap-1.5 shrink-0 ${
                      isSelected 
                        ? `bg-[#00F5FF] text-black font-bold`
                        : `bg-black border border-white/5 text-white/50 hover:bg-white/5 hover:text-white`
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* TIME WINDOW SELECTOR & REPORT EXPORT/IMPORT PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-white/5 items-center">
            <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-white/30 uppercase select-none">
                Time Window:
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "all", label: "All Time" },
                  { id: "this-month", label: "This Month" },
                  { id: "30-days", label: "30 Days" },
                  { id: "90-days", label: "90 Days" },
                  { id: "custom", label: "Custom Range" }
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setDateWindow(opt.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      dateWindow === opt.id 
                        ? "bg-white/10 text-white shadow border border-white/10" 
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {dateWindow === "custom" ? (
              <div className="lg:col-span-3 flex items-center justify-between gap-1 bg-black border border-white/5 p-1 px-2 rounded-xl">
                <input 
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-white text-[10px] font-mono focus:outline-none w-[44%]"
                  title="Start Date"
                />
                <span className="text-white/20 text-[9px] font-mono select-none">TO</span>
                <input 
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-white text-[10px] font-mono focus:outline-none w-[44%]"
                  title="End Date"
                />
              </div>
            ) : (
              <div className="lg:col-span-3 hidden lg:block" />
            )}

            <div className="lg:col-span-4 flex items-center justify-end gap-2 shrink-0">
              {/* Smart Rules Button */}
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-3 py-2 rounded-xl bg-cyan-400/10 hover:bg-[#00F5FF]/20 text-[#00F5FF] border border-cyan-500/10 hover:border-cyan-400/30 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-300 select-none"
                title="Manage auto-categorization keyword patterns and payee automation rules"
              >
                <Settings2 className="w-3.5 h-3.5 text-[#00F5FF]" /> AUTOMATION RULES
              </button>

              {/* Export Spreadsheet Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-300 select-none"
                title="Export filtered transactions to Excel with charts"
              >
                <Download className="w-3.5 h-3.5 text-[#00F5FF]" /> EXPORT EXCEL
              </button>

              {/* Upload Spreadsheet Button (Triggers Ref) */}
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-[#00F5FF]/10 hover:bg-[#00F5FF]/25 text-[#00F5FF] border border-[#00F5FF]/10 hover:border-[#00F5FF]/30 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-300 select-none"
                title="Import transactions from same-format CSV file"
              >
                <Upload className="w-3.5 h-3.5 text-[#00F5FF]" /> UPLOAD REPORT
              </button>
              
              <input 
                type="file" 
                ref={importInputRef} 
                accept=".csv" 
                onChange={handleImportCSV} 
                className="hidden" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* LEDGER GRID POSTINGS */}
      <div className="space-y-3">
        {processedTransactions.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.01] border border-white/5 rounded-[20px] text-[10px] font-mono text-white/40 tracking-wider">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => {
                  const allVisibleSelected = processedTransactions.every(t => selectedTxIds.includes(t.id));
                  if (allVisibleSelected) {
                    // Deselect visible
                    const visibleIds = processedTransactions.map(t => t.id);
                    setSelectedTxIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  } else {
                    // Select visible
                    const visibleIds = processedTransactions.map(t => t.id);
                    setSelectedTxIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                  }
                }}
                className={`w-4 h-4 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                  processedTransactions.length > 0 && processedTransactions.every(t => selectedTxIds.includes(t.id))
                    ? 'bg-[#00F5FF]/15 border-[#00F5FF] text-[#00F5FF]'
                    : 'border-white/20 bg-transparent hover:border-white/40'
                }`}
              >
                {processedTransactions.length > 0 && processedTransactions.every(t => selectedTxIds.includes(t.id)) && (
                  <Check className="w-3 h-3 text-[#00F5FF]" />
                )}
              </div>
              <span className="font-bold select-none cursor-pointer" onClick={() => {
                const allVisibleSelected = processedTransactions.every(t => selectedTxIds.includes(t.id));
                const visibleIds = processedTransactions.map(t => t.id);
                if (allVisibleSelected) {
                  setSelectedTxIds(prev => prev.filter(id => !visibleIds.includes(id)));
                } else {
                  setSelectedTxIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                }
              }}>SELECT ALL FILTERED POSTS ({processedTransactions.length})</span>
            </div>
            {selectedTxIds.length > 0 && (
              <span className="text-cyan-400 font-extrabold select-none">
                {selectedTxIds.length} ACTIVE {selectedTxIds.length === 1 ? 'SELECTION' : 'SELECTIONS'}
              </span>
            )}
          </div>
        )}

        {processedTransactions.length > 0 ? (
          processedTransactions.map((tx) => {
            const spec = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES[CATEGORIES.length - 1];
            const isExpense = tx.type === "expense";
            const dateObj = new Date(tx.date);
            const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const isSelected = selectedTxIds.includes(tx.id);

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                key={tx.id}
                className={`group p-4 rounded-[32px] bg-white/[0.03] hover:bg-white/[0.06] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isSelected ? 'border-cyan-500/30 bg-[#00F5FF]/5 shadow-lg shadow-cyan-500/5' : 'border-white/5 hover:border-white/10 shadow-sm'}`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Circular visual checkbox indicator */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) {
                        setSelectedTxIds(prev => prev.filter(id => id !== tx.id));
                      } else {
                        setSelectedTxIds(prev => [...prev, tx.id]);
                      }
                    }}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-[#00F5FF]/10 border-[#00F5FF] text-[#00F5FF] scale-105' 
                        : 'border-white/10 group-hover:border-white/20 hover:border-[#00F5FF]/20 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 font-bold" />}
                  </div>

                  <div 
                    className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelectTransaction(tx)}
                  >
                  <div 
                    className="p-3 rounded-2xl border text-white transition-all duration-300"
                    style={{ 
                      backgroundColor: `${spec.color}12`, 
                      borderColor: `${spec.color}25`,
                      color: spec.color
                    }}
                  >
                    <CategoryIcon name={spec.icon} className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-sans font-bold text-white/90 group-hover:text-white transition-colors">
                      {tx.title}
                    </h4>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-white/40 font-mono">
                      <span className="font-bold text-white/60 uppercase select-none">{tx.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 select-none">
                        <Calendar className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                      {tx.isRecurring && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400 font-mono font-bold select-none text-[10px] bg-cyan-500/10 px-1.5 rounded-md leading-relaxed border border-cyan-500/20">RECURRING POST</span>
                        </>
                      )}
                      {tx.tags && tx.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 flex-wrap">
                            {tx.tags.map(t => (
                              <span key={t} className="inline-flex items-center text-cyan-400 font-mono font-bold select-none text-[9px] bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10 uppercase">
                                #{t}
                              </span>
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                    {tx.notes && (
                      <div className="mt-1.5 text-[11px] text-[#00F5FF]/85 bg-[#00F5FF]/5 border border-[#00F5FF]/15 px-2.5 py-1 rounded-xl inline-flex items-center gap-1 font-sans">
                        <span className="font-mono text-[9px] font-bold text-cyan-400 select-none uppercase">Note:</span>
                        <span>{tx.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

                <div className="flex items-center justify-between md:justify-end gap-6 md:border-l border-white/5 md:pl-6 leading-none">
                  <div className="text-left md:text-right">
                    <span className={`text-base font-mono font-bold tracking-tight block ${isExpense ? 'text-white/90' : 'text-cyan-400'}`}>
                      {isExpense ? "-" : "+"}
                      {formatCurrencyValue(tx.amount, tx.currency || "INR")}
                    </span>

                    {/* Show dynamic conversion indicator if different from active */}
                    {(tx.currency || "INR").toUpperCase() !== displayCurrency.toUpperCase() && (
                      <span className="block text-[10px] text-[#00F5FF] font-mono mt-0.5 animate-fadeIn">
                        ≈ {isExpense ? "-" : "+"}
                        {formatCurrencyValue(convertAmount(tx.amount, tx.currency || "INR", displayCurrency, exchangeRates), displayCurrency)}
                      </span>
                    )}

                    <span className="text-[10px] text-white/40 font-mono uppercase mt-1 block select-none">
                      {tx.type === 'expense' ? "Cash Outflow" : "Cash Deposit"}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => onDeleteTransaction(tx.id)}
                    className="p-2.5 rounded-xl bg-black/40 hover:bg-rose-500/10 border border-white/5 text-white/40 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-16 text-center border-2 border-dashed border-white/5 p-8 rounded-[32px] bg-white/[0.01]">
            <AlertCircle className="w-10 h-10 text-white/10 mx-auto mb-3 animate-pulse" />
            <h3 className="text-md font-sans font-bold text-white/70">No postings recorded</h3>
            <p className="text-xs text-white/30 mt-1 max-w-sm mx-auto">
              We couldn't matching records under this filter. Try adjusting your parameters or post a new transaction limit ledger.
            </p>
          </div>
        )}
      </div>

      {/* MODAL TRANSITION FRAME: RECORD NEW LEDGER ITEM */}
      <AnimatePresence>
        {isAddingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Blurry dim backing */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] rounded-[32px] border border-white/5 shadow-2xl overflow-hidden z-10 animate-scaleUp"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#00F5FF]" />
              
              <div className="flex justify-between items-center p-6 border-b border-white/5">
                <div>
                  <h3 className="text-md font-sans font-bold text-white">Record Transaction</h3>
                  <p className="text-[11px] text-white/40 font-mono">POSTING JOURNAL LEDGER</p>
                </div>
                <button 
                  onClick={() => setIsAddingModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2 font-medium font-sans">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Posting Type selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Posting Category Type</label>
                  <div className="grid grid-cols-2 p-1 bg-black border border-white/5 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, type: "expense", category: "Food & Dining" })}
                      className={`py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all ${formData.type === 'expense' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25 font-bold shadow' : 'text-white/40 hover:text-white'}`}
                    >
                      CASH OUTFLOW
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, type: "income", category: "Income" })}
                      className={`py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all ${formData.type === 'income' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold shadow' : 'text-white/40 hover:text-white'}`}
                    >
                      DEPOSIT INFLOW
                    </button>
                  </div>
                </div>

                {/* Primary field inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Transaction Title *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Blue Bottle Latte, Zara shoes..."
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-black border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/40 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Posting Amount *</label>
                    <div className="relative flex items-center">
                      <select 
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="absolute left-3 bg-[#0c0c0c] border border-white/10 rounded-xl px-2 py-1 text-[9.5px] font-mono text-cyan-400 focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code} className="bg-black text-white">{c.code} ({c.symbol})</option>
                        ))}
                      </select>
                      <input 
                        type="number"
                        step="any"
                        placeholder="e.g. 500.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full bg-black border border-white/5 rounded-2xl pl-24 pr-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/40 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Posting Date</label>
                    <input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-black border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/40 transition"
                    />
                  </div>
                </div>

                {/* Category assignment (dynamic based on type) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">
                    {formData.type === "expense" ? "Capital category list" : "Deposit categories list"}
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-1 bg-black border border-white/5 rounded-2xl custom-scrollbar animate-fadeIn">
                    {CATEGORIES.filter(cat => {
                      if (formData.type === "expense") return !cat.isIncome;
                      return cat.isIncome;
                    }).map(cat => {
                      const isSelected = formData.category === cat.id;
                      return (
                        <button 
                          type="button" 
                          key={cat.id}
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                          className={`p-2 rounded-xl text-[10px] font-mono font-bold tracking-wide uppercase transition-all flex items-center justify-between border ${
                            isSelected 
                              ? 'bg-white/10 border-white/10 text-white shadow-inner' 
                              : 'bg-[#0c0c0c]/60 border-white/5 text-white/40 hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recurring toggle */}
                <div className="flex items-center justify-between p-3.5 bg-black border border-white/5 rounded-2xl">
                  <div className="text-left">
                    <label className="text-[11px] font-mono tracking-wider text-white/85 uppercase font-bold block">Recurring Posting?</label>
                    <span className="text-[10px] text-white/40 font-sans block leading-none">Auto-cycles transaction limits next billing period</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-4 h-4 rounded bg-black border-white/5 text-cyan-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </div>

                {/* Sub-description field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Supplemental Remarks / description</label>
                  <textarea 
                    placeholder="Short description/memo details for later reference..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full bg-black border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/40 transition"
                  />
                </div>

                {/* Personal Notes field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Transaction Notes</label>
                  <textarea 
                    placeholder="Type custom notes, tags, or personal thoughts on this posting..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full bg-black border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/40 transition"
                  />
                </div>

                {/* Tags multi-selection field */}
                <div className="space-y-2 p-3.5 bg-black border border-white/5 rounded-2xl">
                  <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#00F5FF]" /> Transaction Tags
                  </label>
                  
                  {/* Selected Tags list */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {formData.tags.map(tag => (
                        <span 
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#00F5FF]/10 border border-[#00F5FF]/15 text-[#00F5FF] text-[10px] font-mono uppercase font-bold"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })}
                            className="p-0.5 rounded-lg hover:bg-[#00F5FF]/20 hover:text-white transition-all"
                            title="Remove Tag"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add Tag row */}
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Add tag and hit Enter..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = newTagInput.trim();
                          if (val) {
                            onAddCustomTag(val);
                            if (!formData.tags.includes(val)) {
                              setFormData({ ...formData, tags: [...formData.tags, val] });
                            }
                            setNewTagInput("");
                          }
                        }
                      }}
                      className="flex-1 bg-[#050505] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#00F5FF]/40 transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newTagInput.trim();
                        if (val) {
                          onAddCustomTag(val);
                          if (!formData.tags.includes(val)) {
                            setFormData({ ...formData, tags: [...formData.tags, val] });
                          }
                          setNewTagInput("");
                        }
                      }}
                      className="px-3.5 py-2 bg-[#00F5FF]/10 hover:bg-[#00F5FF]/20 text-[#00F5FF] text-[10.5px] font-mono uppercase font-bold border border-[#00F5FF]/20 rounded-xl transition cursor-pointer"
                    >
                      ADD
                    </button>
                  </div>

                  {/* Available tags recommendations */}
                  {allUniqueTags.filter(t => !formData.tags.includes(t)).length > 0 && (
                    <div className="space-y-1.5 pt-1.5">
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider block">Recommended Tags:</span>
                      <div className="flex flex-wrap gap-1 max-h-[75px] overflow-y-auto scrollbar-none">
                        {allUniqueTags.filter(t => !formData.tags.includes(t)).map(tag => (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => setFormData({ ...formData, tags: [...formData.tags, tag] })}
                            className="px-2 py-0.5 bg-white/[0.02] hover:bg-white/[0.08] text-white/50 hover:text-white text-[9px] font-mono uppercase rounded-lg border border-white/5 transition"
                          >
                            +{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Post Button */}
                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-[#00F5FF] hover:bg-cyan-400 text-black text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-lg shadow-cyan-950/20"
                  >
                    CONFIRM & REGISTER TRANSACTION
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Cosmic Ledger Productivity UI Layout Additions --- */}

      {/* 1. FLOATING CORNER BULK ACTIONS BAR */}
      <AnimatePresence>
        {selectedTxIds.length > 0 && (
          <motion.div 
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl p-4 bg-[#0a0a0af5] backdrop-blur-md rounded-[28px] border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-mono text-xs text-cyan-400 font-bold">
                {selectedTxIds.length}
              </div>
              <div>
                <h5 className="text-[11px] font-sans font-bold text-white uppercase tracking-wider">Batch Operations Enabled</h5>
                <p className="text-[9.5px] font-mono text-white/40">APPLY ACTIONS TO {selectedTxIds.length} SELECTED BOOKINGS</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Export Selected */}
              <button
                type="button"
                onClick={() => {
                  const toExport = transactions.filter(t => selectedTxIds.includes(t.id));
                  exportToExcelWithCharts(toExport, displayCurrency, `Selected (${toExport.length})`);
                }}
                className="p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                title="Export selected rows to Excel"
              >
                <Download className="w-3 h-3 text-[#00F5FF]" /> EXPORT ({selectedTxIds.length})
              </button>

              {/* Bulk Categorize Dropdown */}
              <div className="relative group/cat">
                <button
                  type="button"
                  className="p-2 px-3 rounded-xl bg-white/5 hover:bg-[#00F5FF]/10 text-white hover:text-cyan-400 border border-white/5 hover:border-[#00F5FF]/20 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Filter className="w-3 h-3 text-[#00F5FF]" /> CATEGORIZE
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/cat:block bg-[#0e0e0e] border border-white/10 rounded-2xl p-2 w-48 shadow-2xl z-50 animate-fadeIn divide-y divide-white/5 max-h-[220px] overflow-y-auto custom-scrollbar">
                  <span className="block p-1.5 text-[8.5px] font-mono text-white/30 uppercase tracking-widest font-extrabold pb-1">ASSIGN CATEGORY</span>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to change the category of these ${selectedTxIds.length} transaction(s) to "${cat.name}"?`)) {
                          const updated = transactions.map(t => {
                            if (selectedTxIds.includes(t.id)) {
                              return { ...t, category: cat.id };
                            }
                            return t;
                          });
                          if (onSyncTransactions) {
                            onSyncTransactions(updated);
                            setSelectedTxIds([]);
                          } else {
                            alert("State synchronization handler missing.");
                          }
                        }
                      }}
                      className="w-full text-left p-2 rounded-lg text-[10px] font-mono font-bold text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Tag Dropdown */}
              <div className="relative group/tag">
                <button
                  type="button"
                  className="p-2 px-3 rounded-xl bg-white/5 hover:bg-[#00F5FF]/10 text-white hover:text-cyan-400 border border-white/5 hover:border-[#00F5FF]/20 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Tag className="w-3 h-3 text-[#00F5FF]" /> TAG
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tag:block bg-[#0e0e0e] border border-white/10 rounded-2xl p-2 w-44 shadow-2xl z-50 animate-fadeIn divide-y divide-white/5 max-h-[180px] overflow-y-auto custom-scrollbar">
                  <span className="block p-1.5 text-[8.5px] font-mono text-white/30 uppercase tracking-widest font-extrabold pb-1">TOGGLE TAGS</span>
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const updated = transactions.map(t => {
                          if (selectedTxIds.includes(t.id)) {
                            const tags = t.tags || [];
                            const isPresent = tags.includes(tag);
                            const updatedTags = isPresent ? tags.filter(x => x !== tag) : [...tags, tag];
                            return { ...t, tags: updatedTags };
                          }
                          return t;
                        });
                        if (onSyncTransactions) {
                          onSyncTransactions(updated);
                        }
                      }}
                      className="w-full text-left p-2 rounded-lg text-[10px] font-mono font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Tag className="w-2.5 h-2.5 text-[#00F5FF]" />
                      <span className="truncate">{tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Delete */}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you absolutely sure you want to permanently delete these ${selectedTxIds.length} selected postings?`)) {
                    if (onSyncTransactions) {
                      const remaining = transactions.filter(t => !selectedTxIds.includes(t.id));
                      onSyncTransactions(remaining);
                      setSelectedTxIds([]);
                    } else if (onDeleteTransaction) {
                      selectedTxIds.forEach(id => onDeleteTransaction(id));
                      setSelectedTxIds([]);
                    }
                  }
                }}
                className="p-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-500 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all duration-300"
              >
                <Trash2 className="w-3 h-3" /> DELETE ({selectedTxIds.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTxIds([])}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                title="Cancel selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MODAL: FOR INTUITIVE CATEGORIZATION AUTOMATION RULES */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRulesModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-[32px] border border-cyan-500/10 shadow-2xl overflow-hidden z-10 p-6 space-y-6"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#00F5FF]" />
              
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-md font-sans font-bold text-white flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-[#00F5FF]" /> Payee Automation Rules Engine
                  </h3>
                  <p className="text-[10px] text-white/40 font-mono">AUTOMATED CATEGORY AND TAG ATTACHER</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form to create new rule */}
              <form onSubmit={handleAddRule} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                <span className="text-[9.5px] font-mono font-bold text-[#00F5FF] uppercase block tracking-wider">Configure New Automation Trigger:</span>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Keyword Trigger */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-mono text-white/40 uppercase">Payee Keyword Match</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Uber, Netflix, Amazon"
                      value={newRuleKeyword}
                      onChange={(e) => setNewRuleKeyword(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-mono text-white/40 uppercase">Type</label>
                    <select
                      value={newRuleType}
                      onChange={(e: any) => setNewRuleType(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer text-white"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[9px] font-mono text-white/40 uppercase">Assert Category</label>
                    <select
                      value={newRuleCategory}
                      onChange={(e) => setNewRuleCategory(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer text-white"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Submit */}
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-[#00F5FF] hover:bg-cyan-400 text-black text-xs font-mono font-bold uppercase transition-all shadow-md cursor-pointer"
                    >
                      ADD RULE
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-white/40 uppercase">Auto-Apply Tags (Comma Separated)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Business, Subscription"
                    value={newRuleTagInput}
                    onChange={(e) => setNewRuleTagInput(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </form>

              {/* Existing Rules List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] font-mono font-bold text-white/50 uppercase tracking-wider">Registered Keyword Matchers ({rules.length}):</span>
                  {onSyncTransactions && (
                    <button
                      type="button"
                      onClick={runRulesRetroactively}
                      className="px-2.5 py-1 rounded-lg bg-cyan-400/10 hover:bg-cyan-400 text-cyan-400 hover:text-black border border-cyan-400/20 hover:border-cyan-400 text-[9.5px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Apply active keyword rules retroactively to all currently recorded accounting logs"
                    >
                      <Wand2 className="w-3 h-3 text-cyan-400 hover:text-black" /> RETROACTIVE RE-RUN
                    </button>
                  )}
                </div>

                <div className="max-h-[220px] overflow-y-auto divide-y divide-white/5 border border-white/5 bg-black rounded-2xl custom-scrollbar">
                  {rules.length === 0 ? (
                    <div className="py-8 text-center text-white/20 text-xs font-mono leading-relaxed">
                      No custom auto-categorization criteria registered yet.<br />Add a trigger pattern matching trigger keyword above!
                    </div>
                  ) : (
                    rules.map(rule => {
                      const targetSpec = CATEGORIES.find(c => c.id === rule.category) || CATEGORIES[CATEGORIES.length - 1];
                      return (
                        <div key={rule.id} className="p-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div 
                              onClick={() => handleToggleRule(rule.id)}
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer transition-all ${
                                rule.isActive 
                                  ? 'bg-[#00F5FF]/10 border-[#00F5FF] text-[#00F5FF]' 
                                  : 'border-white/10 bg-transparent'
                              }`}
                            >
                              {rule.isActive && <Check className="w-2.5 h-2.5 text-cyan-400 font-bold" />}
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-white/80 font-mono font-bold text-xs">
                                Matcher: <b className="text-[#00F5FF] font-black underline decoration-cyan-500/30">"{rule.keyword}"</b>
                              </span>
                              <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono text-white/40">
                                <span className={`uppercase font-bold ${rule.type === 'income' ? 'text-cyan-400' : 'text-rose-400'}`}>
                                  {rule.type}
                                </span>
                                <span>➔</span>
                                <span className="flex items-center gap-1.5 font-bold text-white/60">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: targetSpec.color }} />
                                  {targetSpec.name}
                                </span>
                                {rule.tags && rule.tags.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 uppercase">
                                      {rule.tags.map(t => (
                                        <span key={t} className="text-cyan-400 bg-cyan-500/10 px-1 rounded font-bold">#{t}</span>
                                      ))}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/15 text-white/40 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Delete automation rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold border border-white/10 transition-all cursor-pointer"
                >
                  DISMISS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. MODAL: EXCEL SPREADSHEET SANDBOX WORKSPACE */}
      <AnimatePresence>
        {sandboxTransactions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dim backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSandboxTransactions(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Large Grid Workspace Box */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative w-full max-w-5xl bg-[#080808] rounded-[32px] border border-cyan-500/20 shadow-2xl overflow-hidden z-10 p-6 flex flex-col max-h-[88vh] space-y-5"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#00F5FF]" />
              
              {/* Workspace Header */}
              <div className="flex justify-between items-center pb-2 border-b border-white/5 font-sans">
                <div>
                  <h3 className="text-md font-sans font-bold text-white flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-[#00F5FF]" /> Spreadsheet Import Sandbox Workspace
                  </h3>
                  <p className="text-[10px] text-white/40 font-mono">INTERACT AND CLEANSE TRANSACTION POSTINGS BEFORE RECORDING</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSandboxTransactions(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-all cursor-pointer font-bold shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sandbox statistics info bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 text-xs text-white/95 leading-relaxed">
                <div className="text-center border-r border-white/5 pr-3">
                  <span className="text-[9px] font-mono text-white/40 uppercase block mb-0.5">Approved Ledger Injection</span>
                  <b className="text-cyan-400 font-mono font-bold text-base">
                    {sandboxCheckedIndices.length} of {sandboxTransactions.length} Postings
                  </b>
                </div>
                <div className="text-center border-r border-white/5 pr-3 pl-3">
                  <span className="text-[9px] font-mono text-[#10B981] uppercase block mb-0.5">Calculated Deposit Inflow</span>
                  <b className="text-[#10B981] font-mono font-bold text-sm">
                    +{formatCurrencyValue(
                      sandboxTransactions
                        .filter((_, idx) => sandboxCheckedIndices.includes(idx))
                        .filter(r => r.type === "income")
                        .reduce((sum, r) => sum + r.amount, 0),
                      displayCurrency
                    )}
                  </b>
                </div>
                <div className="text-center pl-3">
                  <span className="text-[9px] font-mono text-rose-400 uppercase block mb-0.5 font-bold">Calculated Outflow Expense</span>
                  <b className="text-rose-400 font-mono font-bold text-sm">
                    -{formatCurrencyValue(
                      sandboxTransactions
                        .filter((_, idx) => sandboxCheckedIndices.includes(idx))
                        .filter(r => r.type === "expense")
                        .reduce((sum, r) => sum + r.amount, 0),
                      displayCurrency
                    )}
                  </b>
                </div>
              </div>

              {/* Bulk tools for Sandbox */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = sandboxCheckedIndices.length === sandboxTransactions.length;
                      if (allSelected) {
                        setSandboxCheckedIndices([]);
                      } else {
                        setSandboxCheckedIndices(sandboxTransactions.map((_, i) => i));
                      }
                    }}
                    className="p-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-[9px] font-bold border border-white/5 cursor-pointer transition-all duration-200"
                  >
                    {sandboxCheckedIndices.length === sandboxTransactions.length ? "DESELECT ALL" : "SELECT ALL"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const remaining = sandboxTransactions.filter((_, idx) => !sandboxCheckedIndices.includes(idx));
                      setSandboxTransactions(remaining.length > 0 ? remaining : null);
                      setSandboxCheckedIndices([]);
                    }}
                    disabled={sandboxCheckedIndices.length === 0}
                    className="p-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 font-mono text-[9px] font-bold border border-rose-500/20 disabled:opacity-40 disabled:hover:bg-rose-500/10 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    OMIT CHECKED ROWS ({sandboxCheckedIndices.length})
                  </button>
                </div>

                {/* Set Category for all checked inside sandbox */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-white/30 uppercase">Batch set Category:</span>
                  <select
                    value={sandboxBulkCategory}
                    onChange={(e) => {
                      const targetCat = e.target.value;
                      if (!targetCat) return;
                      const updated = sandboxTransactions.map((tx, idx) => {
                        if (sandboxCheckedIndices.includes(idx)) {
                          return { ...tx, category: targetCat };
                        }
                        return tx;
                      });
                      setSandboxTransactions(updated);
                      setSandboxBulkCategory("");
                    }}
                    className="bg-black border border-white/10 text-white text-[10px] font-mono py-1 px-2 rounded-xl focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scrollable Spreadsheet Sheet Simulator */}
              <div className="flex-1 overflow-auto border border-white/5 rounded-2xl custom-scrollbar relative">
                <table className="w-full text-left font-mono text-[10px] border-collapse relative min-w-[700px]">
                  <thead className="sticky top-0 bg-[#0c0c0c] text-white/40 uppercase select-none z-10 border-b border-white/5">
                    <tr>
                      <th className="p-3 w-12 text-center">Inc</th>
                      <th className="p-3 w-28">Date</th>
                      <th className="p-3">Posting Title Payee</th>
                      <th className="p-3 w-28 text-right">Amount</th>
                      <th className="p-3 w-24 text-center">Type</th>
                      <th className="p-3 w-36">Category</th>
                      <th className="p-3 w-28 text-center">Tag Attachments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black">
                    {sandboxTransactions.map((row, idx) => {
                      const isChecked = sandboxCheckedIndices.includes(idx);
                      const hasMatchingRule = rules.some(r => r.isActive && r.type === row.type && row.title.toLowerCase().includes(r.keyword.toLowerCase()));

                      return (
                        <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${isChecked ? "bg-cyan-500/[0.01]" : "opacity-45 bg-black/40"}`}>
                          {/* Include Toggle checkbox */}
                          <td className="p-2 text-center">
                            <div 
                              onClick={() => {
                                if (isChecked) {
                                  setSandboxCheckedIndices(prev => prev.filter(i => i !== idx));
                                } else {
                                  setSandboxCheckedIndices(prev => [...prev, idx]);
                                }
                              }}
                              className={`w-4 h-4 rounded mx-auto border flex items-center justify-center cursor-pointer transition-all duration-150 ${
                                isChecked ? "bg-[#00F5FF]/15 border-[#00F5FF] text-[#00F5FF]" : "border-white/20 hover:border-white/45 bg-transparent"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 text-[#00F5FF]" />}
                            </div>
                          </td>

                          {/* Date Input */}
                          <td className="p-2">
                            <input 
                              type="date"
                              value={row.date}
                              className="bg-transparent border-0 text-white w-full focus:outline-none font-mono focus:bg-white/5 rounded p-1"
                              onChange={(e) => {
                                const updated = [...sandboxTransactions];
                                updated[idx] = { ...row, date: e.target.value };
                                setSandboxTransactions(updated);
                              }}
                            />
                          </td>

                          {/* Title Payee Input */}
                          <td className="p-2">
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="text"
                                value={row.title}
                                className="bg-transparent border-0 text-white font-sans w-full focus:outline-none focus:bg-white/5 rounded p-1 font-semibold"
                                onChange={(e) => {
                                  const updated = [...sandboxTransactions];
                                  const revisedTitle = e.target.value;
                                  // Re-apply rules if payee changes dynamically!
                                  const ruleRun = applyRulesToTransaction(revisedTitle, row.category, row.type, row.tags);
                                  
                                  updated[idx] = { 
                                    ...row, 
                                    title: revisedTitle,
                                    category: ruleRun.wasMatched ? ruleRun.category : row.category,
                                    tags: ruleRun.tags
                                  };
                                  setSandboxTransactions(updated);
                                }}
                              />
                              {hasMatchingRule && (
                                <span className="p-1 px-1.5 shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-[#10B981] text-[8px] font-mono font-bold rounded-lg uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                                  ✨ MATCH
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Amount Input */}
                          <td className="p-2">
                            <input 
                              type="number"
                              step="0.01"
                              value={row.amount === 0 ? "" : row.amount}
                              className="bg-transparent border-0 text-white text-right w-full focus:outline-none font-mono focus:bg-white/5 rounded p-1 font-bold"
                              onChange={(e) => {
                                const updated = [...sandboxTransactions];
                                updated[idx] = { ...row, amount: parseFloat(e.target.value) || 0 };
                                setSandboxTransactions(updated);
                              }}
                              placeholder="0.00"
                            />
                          </td>

                          {/* Type Toggle */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...sandboxTransactions];
                                const revisedType: TransactionType = row.type === "expense" ? "income" : "expense";
                                const revisedCategory = revisedType === "income" ? "Income" : "Food & Dining";
                                updated[idx] = { ...row, type: revisedType, category: revisedCategory };
                                setSandboxTransactions(updated);
                              }}
                              className={`text-[8.5px] font-mono leading-none font-bold py-1 px-2 rounded-lg border cursor-pointer transition-all ${
                                row.type === "income" 
                                  ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/20" 
                                  : "bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-500/20"
                              }`}
                            >
                              {row.type.toUpperCase()}
                            </button>
                          </td>

                          {/* Category Selector */}
                          <td className="p-2">
                            <select
                              value={row.category}
                              className="bg-black border-0 text-white w-full focus:outline-none font-mono focus:bg-white/5 rounded p-1 cursor-pointer text-white"
                              onChange={(e) => {
                                const updated = [...sandboxTransactions];
                                updated[idx] = { ...row, category: e.target.value };
                                setSandboxTransactions(updated);
                              }}
                            >
                              {CATEGORIES.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </td>

                          {/* Simple inline custom tags */}
                          <td className="p-2">
                            <input 
                              type="text"
                              value={row.tags ? row.tags.join(", ") : ""}
                              className="bg-transparent border-0 text-cyan-400 placeholder-white/20 w-full focus:outline-none font-mono focus:bg-white/5 rounded p-1 text-[9px] uppercase font-bold"
                              placeholder="ADD TAGS..."
                              onChange={(e) => {
                                const updated = [...sandboxTransactions];
                                const tArr = e.target.value.split(",").map(s => s.trim()).filter(s => s.length > 0);
                                updated[idx] = { ...row, tags: tArr };
                                setSandboxTransactions(updated);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setSandboxTransactions(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer"
                >
                  DISCARD STATEMENT
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    const approvedRows = sandboxTransactions.filter((_, idx) => sandboxCheckedIndices.includes(idx));
                    if (approvedRows.length === 0) {
                      alert("Please select or approve at least one ledger listing posting row to commit.");
                      return;
                    }
                    onImportTransactions(approvedRows);
                    setSandboxTransactions(null);
                    setSandboxCheckedIndices([]);
                    alert(`Successfully recorded spreadsheet batch entry containing ${approvedRows.length} checked bookkeeping records!`);
                  }}
                  className="flex-grow-[2] py-3.5 rounded-2xl bg-[#00F5FF] hover:bg-cyan-400 text-black text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-lg shadow-cyan-950/20 cursor-pointer"
                >
                  TRANSMIT {sandboxCheckedIndices.length} APPROVED POSTS TO LEDGER
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
