import React, { useState, useMemo, useRef } from "react";
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
  Upload
} from "lucide-react";
import { Transaction, TransactionType } from "../types";
import { CATEGORIES } from "../data";
import { CategoryIcon } from "./CategoryIcon";
import { CURRENCIES, convertAmount, formatCurrencyValue } from "../utils/currencyUtils";

interface TransactionHistoryProps {
  transactions: Transaction[];
  displayCurrency: string;
  exchangeRates: Record<string, number>;
  onAddTransaction: (newTx: Omit<Transaction, "id">) => void;
  onDeleteTransaction: (id: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onImportTransactions: (imported: Omit<Transaction, "id">[]) => void;
}

export function TransactionHistory({ 
  transactions, 
  displayCurrency,
  exchangeRates,
  onAddTransaction, 
  onDeleteTransaction,
  onSelectTransaction,
  onImportTransactions
}: TransactionHistoryProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);

  // Date window state definitions
  const [dateWindow, setDateWindow] = useState<"all" | "this-month" | "last-month" | "30-days" | "90-days" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Import Upload state definitions
  const [importedPreview, setImportedPreview] = useState<Omit<Transaction, "id">[] | null>(null);
  const [importNotice, setImportNotice] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    type: "expense" as TransactionType,
    category: "Food & Dining",
    date: new Date().toISOString().split("T")[0],
    description: "",
    isRecurring: false,
    currency: displayCurrency
  });
  const [formError, setFormError] = useState("");

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
  }, [transactions, searchQuery, activeTypeFilter, activeCategoryFilter, sortBy, dateWindow, customStartDate, customEndDate]);

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

    onAddTransaction({
      title: formData.title,
      amount: amt,
      type: formData.type,
      category: formData.type === "income" ? "Income" : formData.category,
      date: formData.date,
      description: formData.description.trim() || undefined,
      isRecurring: formData.isRecurring,
      currency: formData.currency
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
      currency: displayCurrency
    });
    setIsAddingModalOpen(false);
  };

  // Export processed transactions to CSV format
  const handleExportCSV = () => {
    if (processedTransactions.length === 0) {
      alert("No transaction postings to export under the current chosen window.");
      return;
    }

    // Escape CSV Fields helper
    const escapeCSVField = (field: string | undefined | null) => {
      if (field === undefined || field === null) return '""';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ["Title", "Amount", "Type", "Category", "Date", "Description", "IsRecurring", "Currency"];
    const rows = processedTransactions.map(tx => [
      escapeCSVField(tx.title),
      tx.amount.toFixed(2),
      tx.type,
      escapeCSVField(tx.category),
      tx.date,
      escapeCSVField(tx.description || ""),
      tx.isRecurring ? "true" : "false",
      tx.currency || "INR"
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const windowName = dateWindow === "all" ? "all_time" : dateWindow;
    link.setAttribute("download", `x_pense_ledger_${windowName}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

        let categoryVal = "Other";
        const categoryStr = categoryColIdx !== -1 && columns[categoryColIdx] ? columns[categoryColIdx].trim() : "";
        if (typeVal === "income") {
          categoryVal = "Income";
        } else if (categoryStr) {
          const matching = CATEGORIES.find(c => 
            c.id.toLowerCase() === categoryStr.toLowerCase() ||
            c.name.toLowerCase() === categoryStr.toLowerCase()
          );
          if (matching && matching.id !== "Income") {
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
          currency: currencyVal
        });
      }

      if (parsedRecords.length === 0) {
        alert("No valid periodic ledger records parsed inside document.");
        return;
      }

      // Show professional preview check
      setImportedPreview(parsedRecords);
      const inflows = parsedRecords.filter(r => r.type === "income");
      const outflows = parsedRecords.filter(r => r.type === "expense");
      const totalInflowAmt = inflows.reduce((sum, r) => sum + r.amount, 0);
      const totalOutflowAmt = outflows.reduce((sum, r) => sum + r.amount, 0);
      
      setImportNotice(
        `Loaded ${parsedRecords.length} periodic postings. Inflow total value is +${formatCurrencyValue(totalInflowAmt, displayCurrency)} (${inflows.length} deposit(s)), and Outflow total is -${formatCurrencyValue(totalOutflowAmt, displayCurrency)} (${outflows.length} payment(s)).`
      );
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
            {CATEGORIES.map(category => (
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
              {/* Export Spreadsheet Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-300 select-none"
                title="Export filtered transactions to CSV"
              >
                <Download className="w-3.5 h-3.5 text-[#00F5FF]" /> EXPORT REPORT
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
        {processedTransactions.length > 0 ? (
          processedTransactions.map((tx) => {
            const spec = CATEGORIES.find(c => c.id === tx.category) || CATEGORIES[CATEGORIES.length - 1];
            const isExpense = tx.type === "expense";
            const dateObj = new Date(tx.date);
            const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                key={tx.id}
                className="group p-4 rounded-[32px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div 
                  className="flex items-center gap-3.5 flex-1 cursor-pointer"
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
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 md:border-l border-white/5 md:pl-6 leading-none">
                  <div className="text-left md:text-right">
                    <span className={`text-base font-mono font-bold tracking-tight block ${isExpense ? 'text-white/90' : 'text-cyan-405'}`}>
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
                      onClick={() => setFormData({ ...formData, type: "expense" })}
                      className={`py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all ${formData.type === 'expense' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25 font-bold shadow' : 'text-white/40 hover:text-white'}`}
                    >
                      CASH OUTFLOW
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, type: "income" })}
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
                      className="w-full bg-black border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-405/40 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Posting Amount *</label>
                    <div className="relative flex items-center">
                      <select 
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="absolute left-3 bg-[#0c0c0c] border border-white/10 rounded-xl px-2 py-1 text-[9.5px] font-mono text-cyan-455 focus:outline-none focus:ring-0 cursor-pointer"
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
                        className="w-full bg-black border border-white/5 rounded-2xl pl-24 pr-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-455/40 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Posting Date</label>
                    <input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-black border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-455/40 transition"
                    />
                  </div>
                </div>

                {/* Category assignment (only for expenses) */}
                {formData.type === "expense" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Capital category list</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-1 bg-black border border-white/5 rounded-2xl custom-scrollbar animate-fadeIn">
                      {CATEGORIES.filter(cat => cat.id !== "Income").map(cat => {
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
                )}

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
                  <label className="text-[10px] font-mono tracking-wider text-white/40 uppercase font-bold">Supplemental Remarks / note</label>
                  <textarea 
                    placeholder="Short description/memo details for later reference..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full bg-black border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-455/40 transition"
                  />
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

      {/* MODAL SPREADSHEET IMPORT CONFIRMATION PREVIEW */}
      <AnimatePresence>
        {importedPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Blurry dim backing */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setImportedPreview(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] rounded-[32px] border border-white/5 shadow-2xl overflow-hidden z-10 p-6 space-y-4"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#00F5FF]" />
              
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-md font-sans font-bold text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-[#00F5FF]" /> Import Ledger Roll
                  </h3>
                  <p className="text-[10px] text-white/40 font-mono">CONFIRM SPREADSHEET PERIODIC DATA</p>
                </div>
                <button 
                  onClick={() => setImportedPreview(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status breakdown message */}
              <div className="p-4 bg-cyan-500/5 border border-cyan-400/10 rounded-2xl text-xs text-white/80 leading-relaxed font-sans font-medium">
                {importNotice}
              </div>

              {/* Collapsible preview table */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono tracking-wider text-white/45 uppercase font-bold">Ledger sample preview:</span>
                <div className="max-h-[160px] overflow-y-auto border border-white/5 bg-black rounded-2xl custom-scrollbar divide-y divide-white/5 text-[10px] font-mono">
                  {importedPreview.slice(0, 5).map((item, colIdx) => (
                    <div key={colIdx} className="p-2.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === 'income' ? 'bg-cyan-400' : 'bg-rose-450'}`} />
                        <div className="truncate">
                          <span className="text-white/80 font-bold block truncate">{item.title}</span>
                          <span className="text-white/30 text-[9px] uppercase">{item.category} • {item.date}</span>
                        </div>
                      </div>
                      <span className={`font-bold shrink-0 text-right ${item.type === 'income' ? 'text-cyan-405' : 'text-white/80'}`}>
                        {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {importedPreview.length > 5 && (
                    <div className="p-2 text-center text-white/30 text-[9px] italic">
                      + {importedPreview.length - 5} more entries in spreadsheet
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setImportedPreview(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xs font-mono font-bold tracking-wider uppercase transition-all"
                >
                  ABORT
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onImportTransactions(importedPreview);
                    setImportedPreview(null);
                  }}
                  className="flex-grow-[2] py-3 rounded-2xl bg-[#00F5FF] hover:bg-cyan-400 text-black text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-lg shadow-cyan-950/20"
                >
                  CONFIRM & INJECT BOOKINGS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
