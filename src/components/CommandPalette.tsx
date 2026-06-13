import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  Terminal, 
  Keyboard, 
  HelpCircle, 
  Download, 
  Settings, 
  X, 
  PlusCircle, 
  Zap, 
  FileText, 
  Play, 
  Info, 
  FileJson,
  Trash2, 
  Database,
  ArrowRight,
  Sparkles,
  Command,
  TrendingUp,
  LayoutDashboard,
  PiggyBank,
  BookOpen,
  MessageSquare,
  Bell,
  Sliders,
  Calculator,
  BrainCircuit,
  Settings2,
  CheckCircle2
} from "lucide-react";
import ExcelJS from "exceljs";
import { INITIAL_TRANSACTIONS } from "../data";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  description?: string;
  isRecurring?: boolean;
  currency?: string;
  notes?: string;
  tags?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  syncTransactions: (txs: Transaction[]) => void;
  displayCurrency: string;
  userName: string;
  availableTags: string[];
}

export function CommandPalette({
  isOpen,
  setIsOpen,
  isHelpOpen,
  setIsHelpOpen,
  activeTab,
  setActiveTab,
  transactions,
  onAddTransaction,
  syncTransactions,
  displayCurrency,
  userName,
  availableTags
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [commandResponse, setCommandResponse] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [gActive, setGActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setCommandResponse(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Global listeners for hotkeys
  useEffect(() => {
    let gTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Trigger Command Palette: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
        return;
      }

      // 2. Trigger Interactive Help Sheet: ?
      if (e.key === "?" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsHelpOpen(!isHelpOpen);
        return;
      }

      // Ignore standard key chords if typing in inputs/textareas
      const focusedTag = document.activeElement?.tagName;
      if (focusedTag === "INPUT" || focusedTag === "TEXTAREA" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      // 3. Navigation chords: "g" then "letter"
      if (key === "g") {
        setGActive(true);
        clearTimeout(gTimer);
        gTimer = setTimeout(() => setGActive(false), 1500); // 1.5s window
        return;
      }

      if (gActive) {
        let routed = false;
        if (key === "d") { setActiveTab("dashboard"); showQuickStatus("Navigated to Dashboard", "info"); routed = true; }
        else if (key === "t") { setActiveTab("treasury"); showQuickStatus("Navigated to Treasury Pots", "info"); routed = true; }
        else if (key === "l") { setActiveTab("transactions"); showQuickStatus("Navigated to Ledger Log", "info"); routed = true; }
        else if (key === "s") { setActiveTab("sms-sync"); showQuickStatus("Navigated to SMS Sync Portal", "info"); routed = true; }
        else if (key === "n") { setActiveTab("notifications"); showQuickStatus("Navigated to Notifications", "info"); routed = true; }
        else if (key === "b") { setActiveTab("budget"); showQuickStatus("Navigated to Limits & Budgets", "info"); routed = true; }
        else if (key === "c") { setActiveTab("calculators"); showQuickStatus("Navigated to Financial Suite", "info"); routed = true; }
        else if (key === "a") { setActiveTab("ai"); showQuickStatus("Navigated to AI Advisor Intake", "info"); routed = true; }
        
        if (routed) {
          setGActive(false);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimer);
    };
  }, [isOpen, isHelpOpen, gActive, setActiveTab, setIsOpen, setIsHelpOpen]);

  // Command status transient alert
  const showQuickStatus = (msg: string, type: "success" | "error" | "info" = "success") => {
    setCommandResponse({ message: msg, type });
    const t = setTimeout(() => {
      setCommandResponse(null);
    }, 4000);
    return () => clearTimeout(t);
  };

  // Standard commands database
  const standardCommands = useMemo(() => [
    {
      id: "nav-dash",
      title: "Go to Dashboard Portal",
      subtitle: "Switch view to main cockpit stats & charts",
      shortcut: "g d",
      syntax: "/dashboard",
      type: "navigation",
      icon: LayoutDashboard,
      action: () => { setActiveTab("dashboard"); setIsOpen(false); }
    },
    {
      id: "nav-treasury",
      title: "Go to Treasury & Asset Pots",
      subtitle: "Review allocated capital & simulator",
      shortcut: "g t",
      syntax: "/treasury",
      type: "navigation",
      icon: PiggyBank,
      action: () => { setActiveTab("treasury"); setIsOpen(false); }
    },
    {
      id: "nav-ledger",
      title: "Go to Cash Posting Ledger",
      subtitle: "View raw log, audits, & descriptions",
      shortcut: "g l",
      syntax: "/ledger",
      type: "navigation",
      icon: BookOpen,
      action: () => { setActiveTab("transactions"); setIsOpen(false); }
    },
    {
      id: "nav-[#00F5FF]",
      title: "Go to SMS Linked Sync log",
      subtitle: "Manage dynamic device captures & integrations",
      shortcut: "g s",
      syntax: "/sync",
      type: "navigation",
      icon: MessageSquare,
      action: () => { setActiveTab("sms-sync"); setIsOpen(false); }
    },
    {
      id: "nav-notifs",
      title: "Go to Auditing Alerts Hub",
      subtitle: "Scan system warnings and weekly summaries",
      shortcut: "g n",
      syntax: "/notifications",
      type: "navigation",
      icon: Bell,
      action: () => { setActiveTab("notifications"); setIsOpen(false); }
    },
    {
      id: "nav-budget",
      title: "Go to Budget Limits & Controls",
      subtitle: "Set triggers for category expenditure profiles",
      shortcut: "g b",
      syntax: "/budget",
      type: "navigation",
      icon: Sliders,
      action: () => { setActiveTab("budget"); setIsOpen(false); }
    },
    {
      id: "nav-calculators",
      title: "Go to Financial Suite & Calculators",
      subtitle: "Compute custom GST rates & Indian Tax Regime margins",
      shortcut: "g c",
      syntax: "/calculators",
      type: "navigation",
      icon: Calculator,
      action: () => { setActiveTab("calculators"); setIsOpen(false); }
    },
    {
      id: "nav-ai",
      title: "Go to Advisor Deep AI Engine",
      subtitle: "Interactive smart advisor chat integration",
      shortcut: "g a",
      syntax: "/ai",
      type: "navigation",
      icon: BrainCircuit,
      action: () => { setActiveTab("ai"); setIsOpen(false); }
    },
    {
      id: "cmd-add-expense",
      title: "Record Fast Expense Transaction",
      subtitle: "Syntax: /add-expense <amount> <category> <title>",
      syntax: "/add-expense [amount] [category] [title]",
      example: "/add-expense 850 Food Dinner at cafe",
      type: "action",
      icon: PlusCircle,
      action: (args?: string[]) => {
        if (!args || args.length < 3) {
          showQuickStatus("Syntax error! Use: /add-expense <amount> <category> <title>", "error");
          return;
        }
        const amount = parseFloat(args[0]);
        if (isNaN(amount) || amount <= 0) {
          showQuickStatus("Invalid amount identifier passed", "error");
          return;
        }
        const category = args[1];
        const title = args.slice(2).join(" ");
        onAddTransaction({
          title,
          amount,
          type: "expense",
          category,
          date: new Date().toISOString().split("T")[0],
          currency: displayCurrency,
          notes: "Recorded instantly via secure interactive Command Palette"
        });
        showQuickStatus(`Successfully added expense transaction: ${displayCurrency} ${amount} (${category})`, "success");
        setQuery("");
      }
    },
    {
      id: "cmd-add-income",
      title: "Record Fast Income Deposit",
      subtitle: "Syntax: /add-income <amount> <category> <title>",
      syntax: "/add-income [amount] [category] [title]",
      example: "/add-income 1500 Profit Client commission check",
      type: "action",
      icon: TrendingUp,
      action: (args?: string[]) => {
        if (!args || args.length < 3) {
          showQuickStatus("Syntax error! Use: /add-income <amount> <category> <title>", "error");
          return;
        }
        const amount = parseFloat(args[0]);
        if (isNaN(amount) || amount <= 0) {
          showQuickStatus("Invalid amount identifier passed", "error");
          return;
        }
        const category = args[1];
        const title = args.slice(2).join(" ");
        onAddTransaction({
          title,
          amount,
          type: "income",
          category,
          date: new Date().toISOString().split("T")[0],
          currency: displayCurrency,
          notes: "Recorded instantly via secure interactive Command Palette"
        });
        showQuickStatus(`Successfully recorded deposit inflow: ${displayCurrency} ${amount} (${category})`, "success");
        setQuery("");
      }
    },
    {
      id: "cmd-exp-xlsx",
      title: "Compile Clean Enterprise Excel Ledger Report",
      subtitle: "Styles cells, lists budgets, summarizes cashpools & burn analytics",
      syntax: "/export-xlsx",
      type: "export",
      icon: FileText,
      action: () => {
        exportToExcel();
        showQuickStatus("Compiled and downloaded Aura Balance Workbook!", "success");
        setIsOpen(false);
      }
    },
    {
      id: "cmd-exp-csv",
      title: "Dump Ledger Log as raw CSV",
      subtitle: "Comma-delimited text extraction directly to browser downloads",
      syntax: "/export-csv",
      type: "export",
      icon: Download,
      action: () => {
        exportToCSV();
        showQuickStatus("Exported CSV download complete!", "success");
        setIsOpen(false);
      }
    },
    {
      id: "cmd-exp-json",
      title: "Download Complete Secure JSON Backup State",
      subtitle: "Ideal for secure localized data redundancy and restoration in other clients",
      syntax: "/export-json",
      type: "export",
      icon: FileJson,
      action: () => {
        exportToJSON();
        showQuickStatus("Secure data redundancy state backup created!", "success");
        setIsOpen(false);
      }
    },
    {
      id: "cmd-seed",
      title: "Reset Ledger: Reseed Standard Database",
      subtitle: "Restores standard corporate paycheck, freelance gigs, and routine bills configuration",
      syntax: "/seed",
      type: "utility",
      icon: Database,
      action: () => {
        if (window.confirm("Reseed standard financial records? Stored local logs will be appended.")) {
          syncTransactions(INITIAL_TRANSACTIONS);
          showQuickStatus("Ledger reseeded back to standard state!", "success");
          setIsOpen(false);
        }
      }
    },
    {
      id: "cmd-clear",
      title: "Reset Ledger: Clear Logs",
      subtitle: "Wipe all transaction posts. Irreversible process.",
      syntax: "/clear-ledger",
      type: "utility",
      icon: Trash2,
      action: () => {
        if (window.confirm("Are you absolutely sure you want to clear ALL cash postings? This is irreversible.")) {
          syncTransactions([]);
          showQuickStatus("Ledger logs completely purged.", "success");
          setIsOpen(false);
        }
      }
    },
    {
      id: "cmd-help",
      title: "Launch Help & Keyboard Shortcuts Panel",
      subtitle: "Cheat sheet covering command arguments and key combinations",
      shortcut: "?",
      syntax: "/help",
      type: "utility",
      icon: HelpCircle,
      action: () => {
        setIsHelpOpen(true);
        setIsOpen(false);
      }
    }
  ], [activeTab, displayCurrency, transactions, onAddTransaction, syncTransactions]);

  // Filter commands by search box query
  const filteredCommands = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return standardCommands;

    return standardCommands.filter(cmd => {
      // If user typing `/add-...`, do a prefix/match checklist
      if (cleanQuery.startsWith("/")) {
        const cmdWord = cleanQuery.split(" ")[0];
        return cmd.syntax.toLowerCase().startsWith(cmdWord);
      }
      return (
        cmd.title.toLowerCase().includes(cleanQuery) ||
        cmd.subtitle.toLowerCase().includes(cleanQuery) ||
        cmd.syntax.toLowerCase().includes(cleanQuery)
      );
    });
  }, [query, standardCommands]);

  // Handle running selected query direct command or navigation
  const runCommandItem = (cmd: typeof standardCommands[0]) => {
    const cleanQuery = query.trim();
    if (cleanQuery.startsWith("/") && (cmd.syntax.startsWith("/add-expense") || cmd.syntax.startsWith("/add-income"))) {
      const parts = cleanQuery.slice(1).split(/\s+/);
      // first item is command name: etc "add-expense", remainder are potential arguments
      const args = parts.slice(1);
      cmd.action(args);
    } else {
      cmd.action();
    }
  };

  // Keyboard navigation within list items
  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        runCommandItem(filteredCommands[selectedIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      // scroll viewport
      scrollIntoView(selectedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      scrollIntoView(selectedIndex - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollIntoView = (index: number) => {
    if (!resultsContainerRef.current) return;
    const container = resultsContainerRef.current;
    const items = container.querySelectorAll("[role='option']");
    const target = items[index] as HTMLElement;
    if (target) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elemTop = target.offsetTop;
      const elemBottom = elemTop + target.clientHeight;

      if (elemTop < containerTop) {
        container.scrollTop = elemTop;
      } else if (elemBottom > containerBottom) {
        container.scrollTop = elemBottom - container.clientHeight;
      }
    }
  };

  // CSV Exporter Implementation
  const exportToCSV = () => {
    const headers = ["ID", "Title", "Amount", "Type", "Category", "Date", "Description", "Currency", "Tags"].join(",");
    const rows = transactions.map(t => {
      const titleClean = t.title.replace(/"/g, '""');
      const descClean = (t.description || "").replace(/"/g, '""');
      const tagsClean = (t.tags || []).join(";");
      return `"${t.id}","${titleClean}",${t.amount},"${t.type}","${t.category}","${t.date}","${descClean}","${t.currency || "INR"}","${tagsClean}"`;
    });
    const content = [headers, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Aura_Cash_Postings_${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
  };

  // JSON Exporter Implementation
  const exportToJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      userName,
      displayCurrency,
      availableTags,
      recordCount: transactions.length,
      ledger: transactions
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Aura_Redundancy_Backup_${new Date().toISOString().split("T")[0]}.json`);
    link.click();
  };

  // Highly-Stylized Excel Exporter (exceljs) implementation
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Aura Enterprise Wallet";
    workbook.lastModifiedBy = userName;
    workbook.created = new Date();
    
    // Sheet 1: Dashboard and Summary Analytics
    const summarySheet = workbook.addWorksheet("Dashboard Statistics");
    summarySheet.views = [{ showGridLines: false }];

    // Inject title decoration blocks
    summarySheet.mergeCells("B2:H3");
    const titleCell = summarySheet.getCell("B2");
    titleCell.value = "AURA LEDGER - FINANCIAL INTELLIGENCE SUMMARY";
    titleCell.font = { name: "System", family: 4, size: 16, bold: true, color: { argb: "FFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "0B0C10" } // Deep Slate
    };

    // Calculate core metrics
    const totalTransactions = transactions.length;
    let totalInflow = 0;
    let totalOutflow = 0;
    
    transactions.forEach(t => {
      if (t.type === "income") totalInflow += t.amount;
      else totalOutflow += t.amount;
    });

    const netSurplus = totalInflow - totalOutflow;

    // Apply structured stats
    summarySheet.getCell("B5").value = "ACCOUNT HOLDER / SYS COMPONENT:";
    summarySheet.getCell("C5").value = userName.toUpperCase();
    summarySheet.getCell("B6").value = "REPORT GENERATION TIME:";
    summarySheet.getCell("C6").value = new Date().toLocaleString();
    summarySheet.getCell("B7").value = "TOTAL TRANSACTION ARRAYS:";
    summarySheet.getCell("C7").value = totalTransactions;

    // Table metrics headers
    summarySheet.mergeCells("B10:C10");
    summarySheet.getCell("B10").value = "METRIC PROFILE";
    summarySheet.mergeCells("D10:E10");
    summarySheet.getCell("D10").value = "CONSOLIDATED ACCRUALS (INR BASE)";

    // Style headers
    ["B10", "D10"].forEach(ref => {
      const cell = summarySheet.getCell(ref);
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "06B6D4" } }; // Cyan
      cell.alignment = { horizontal: "center" };
    });

    summarySheet.getCell("B11").value = "Consolidated Deposit Inflows (Revenue)";
    summarySheet.getCell("D11").value = totalInflow;
    summarySheet.getCell("D11").numFmt = "₹#,##0.00";

    summarySheet.getCell("B12").value = "Consolidated Expense Outflow (Burn)";
    summarySheet.getCell("D12").value = totalOutflow;
    summarySheet.getCell("D12").numFmt = "₹#,##0.00";

    summarySheet.getCell("B13").value = "Net Retained Operational Surplus";
    summarySheet.getCell("D13").value = netSurplus;
    summarySheet.getCell("D13").numFmt = "₹#,##0.00";
    summarySheet.getCell("D13").font = { bold: true, color: { argb: netSurplus >= 0 ? "10B981" : "F43F5E" } };

    // Apply boundaries borders & styling
    for (let r = 11; r <= 13; r++) {
      summarySheet.mergeCells(`B${r}:C${r}`);
      summarySheet.mergeCells(`D${r}:E${r}`);
      summarySheet.getRow(r).height = 20;
    }

    // Sheet 2: Raw ledger logging sheet
    const ledgerSheet = workbook.addWorksheet("Ledger Base Posting Log");
    ledgerSheet.views = [{ showGridLines: true }];

    // Column declarations matching enterprise standards
    ledgerSheet.columns = [
      { header: "TRANSACTION ID", key: "id", width: 22 },
      { header: "TITLE PROTOCOL", key: "title", width: 28 },
      { header: "ACC TYPE", key: "type", width: 14 },
      { header: "CATEGORY GROUP", key: "category", width: 22 },
      { header: "TRANSACTION DATE", key: "date", width: 18 },
      { header: "RECORDED AMOUNT", key: "amount", width: 18 },
      { header: "NATIVE CURRENCY", key: "currency", width: 14 },
      { header: "TAG ASSOCIATIONS", key: "tags", width: 24 },
      { header: "MEMO NOTES", key: "notes", width: 35 }
    ];

    // Style header row
    const headerRow = ledgerSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0B0C10" } // dark premium background
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "medium", color: { argb: "00F5FF" } } // cyan bottom lip
      };
    });

    // Populate lines with clean custom alternating rows styling
    transactions.forEach((tx, idx) => {
      const row = ledgerSheet.addRow({
        id: tx.id,
        title: tx.title,
        type: tx.type.toUpperCase(),
        category: tx.category,
        date: tx.date,
        amount: tx.amount,
        currency: tx.currency || displayCurrency,
        tags: (tx.tags || []).join(", "),
        notes: tx.notes || ""
      });

      row.height = 22;
      row.getCell("amount").numFmt = "#,##0.00";
      
      // Paint transaction types
      const typeCell = row.getCell("type");
      if (tx.type === "income") {
        typeCell.font = { color: { argb: "10B981" }, bold: true };
      } else {
        typeCell.font = { color: { argb: "F43F5E" }, bold: true };
      }

      // Zebra striping for improved legibility matches industrial guidelines
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          if (!cell.fill) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F9FAFB" }
            };
          }
        });
      }
    });

    // Write array buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Aura_Enterprise_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    link.click();
  };

  return (
    <>
      {/* 1. KEYBOARD COMMAND PALETTE MODAL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
            {/* Backdrop cover with high-contrast ambient glass blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md cursor-default"
            />

            {/* Command Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-xl bg-[#08080a] border border-white/10 rounded-[28px] overflow-hidden shadow-[0_0_50px_rgba(0,245,255,0.06)] flex flex-col max-h-[70vh]"
            >
              {/* Dynamic Interactive Console Header */}
              <div className="flex items-center gap-3.5 px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                <Search className="w-5 h-5 text-cyan-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type commands (e.g. /dashboard or /add-expense 250 Food Subway)..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDownInList}
                  className="w-full bg-transparent border-none text-[13px] font-mono text-white placeholder-white/30 focus:outline-none focus:ring-0 leading-relaxed text-left"
                />
                
                {/* Active chord helper tag */}
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/40 uppercase">
                  ESC to close
                </span>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer text-white/40 hover:text-white transition-all scale-95 hover:scale-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status responses drawer */}
              <AnimatePresence>
                {commandResponse && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`px-5 py-2.5 text-[11px] font-mono border-b flex items-center gap-2 justify-between ${
                      commandResponse.type === "success" 
                        ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-400" 
                        : commandResponse.type === "error"
                        ? "bg-rose-500/10 border-rose-500/15 text-rose-400"
                        : "bg-cyan-500/10 border-cyan-500/15 text-cyan-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>{commandResponse.message}</span>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 opacity-80" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Interactive Autocomplete suggestions / search outcomes container */}
              <div 
                ref={resultsContainerRef}
                className="overflow-y-auto divide-y divide-white/5 flex-1 p-2 max-h-[45vh] scrollbar-thin scrollbar-thumb-white/10"
                role="listbox"
              >
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd, idx) => {
                    const isSelected = idx === selectedIndex;
                    const CmdIcon = cmd.icon;
                    return (
                      <div
                        key={cmd.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => runCommandItem(cmd)}
                        className={`px-4 py-3 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-[#00F5FF]/10 text-[#00F5FF]/90 border border-cyan-500/15 shadow-[0_4px_20px_-5px_rgba(6,182,212,0.15)]" 
                            : "text-white hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl border transition-colors ${
                            isSelected 
                              ? "bg-cyan-400/20 border-cyan-404/30 text-cyan-300" 
                              : "bg-white/[0.02] border-white/5 text-white/50"
                          }`}>
                            <CmdIcon className="w-4 h-4" />
                          </div>
                          <div className="text-left min-w-0">
                            <h4 className="text-xs font-sans font-extrabold tracking-tight truncate leading-tight">
                              {cmd.title}
                            </h4>
                            <p className="text-[10px] font-mono text-white/40 truncate mt-0.5">
                              {cmd.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Interactive prompt hints */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {cmd.shortcut && (
                            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/5 text-[8.5px] font-mono text-[#00F5FF] uppercase font-semibold">
                              {cmd.shortcut}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono transition-colors uppercase ${
                            isSelected 
                              ? "bg-cyan-400 text-black font-black" 
                              : "bg-white/5 text-white/40 font-bold"
                          }`}>
                            {cmd.syntax}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 px-4 text-center space-y-2">
                    <Info className="w-5 h-5 text-white/20 mx-auto" />
                    <p className="text-xs font-mono text-white/30 font-bold uppercase tracking-wider">No matching commands found</p>
                    <p className="text-[10px] font-sans text-white/40">Try checking the syntax instructions, or use `/help` to open the guide.</p>
                  </div>
                )}
              </div>

              {/* Console Command Footer */}
              <div className="p-3.5 bg-black/50 border-t border-b-0 border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-white/40 font-mono text-[9px]">
                  <Keyboard className="w-3.5 h-3.5 text-[#00F5FF]" />
                  <span>Use UP / DOWN keys to select and enter actions.</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono text-white/30 uppercase">
                  <span>SECURED LOCALIZED PORTAL STATUS:</span>
                  <span className="text-[#00F5FF] font-bold">READY</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. DEDICATED HELP & KEYBOARD SHORTCUTS PANEL (CHEST SHEET MODAL / ASIDE) */}
      <AnimatePresence>
        {isHelpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark glass backdrop cover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-default"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-left"
            >
              {/* Header Title Bar */}
              <div className="px-6 py-5 border-b border-white/5 bg-white/[0.015] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/15">
                    <Keyboard className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-extrabold tracking-tight text-white uppercase">Aura Command & Shortcuts Help Guide</h3>
                    <p className="text-[10px] font-mono text-white/35 uppercase">Speed up bookkeeping with automated key combinations</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-white/45 hover:text-white transition-all scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scroller Content Area */}
              <div className="p-6 overflow-y-auto space-y-6 max-h-[55vh] scrollbar-thin scrollbar-thumb-white/10 select-text">
                {/* 1. KEYBOARD HOTKEYS SECTION */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest pl-2 border-l border-cyan-400/30">
                    Keyboard Chords (Hold then strike letters)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium">Toggle Command Console</span>
                      <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">
                        Ctrl + K
                      </kbd>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium">Nav key chord delay window</span>
                      <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-yellow-400">
                        g
                      </kbd>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium">Switch to Dashboard</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">g</kbd>
                        <span className="text-[10px] text-white/30">+</span>
                        <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">d</kbd>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium font-sans">Open Treasury Pots</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">g</kbd>
                        <span className="text-[10px] text-white/30">+</span>
                        <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">t</kbd>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#030712]/50 border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium font-sans">View Raw Postings Ledger</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">g</kbd>
                        <span className="text-[10px] text-white/30">+</span>
                        <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">l</kbd>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#030712]/50 border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium font-sans">Open SMS Linker Ledger</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">g</kbd>
                        <span className="text-[10px] text-white/30">+</span>
                        <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">s</kbd>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#030712]/50 border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium font-sans">Examine Alerts Feed</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">g</kbd>
                        <span className="text-[10px] text-white/30">+</span>
                        <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">n</kbd>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#030712]/50 border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium font-sans">Modify Budgets & Controls</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">g</kbd>
                        <span className="text-[10px] text-white/30">+</span>
                        <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">b</kbd>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#030712]/50 border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium font-sans">GST & Regimes Calculators</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">g</kbd>
                        <span className="text-[10px] text-white/30">+</span>
                        <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">c</kbd>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#030712]/50 border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/60 font-medium font-sans">Open smart AI Insights chat</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-mono text-white/40">g</kbd>
                        <span className="text-[10px] text-white/30">+</span>
                        <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">a</kbd>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex justify-between items-center sm:col-span-2">
                      <span className="text-xs text-white/60 font-medium">Summon this Help Center</span>
                      <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-[#00F5FF]">
                        ?
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* 2. CHORD COMMAND CONSOLE COMMANDS */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest pl-2 border-l border-cyan-400/30">
                    Console Action Protocol Syntax
                  </h4>
                  <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                    <div className="space-y-1 text-left">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded-md">
                        /add-expense &lt;amount&gt; &lt;category&gt; &lt;title&gt;
                      </span>
                      <p className="text-xs text-white/70 leading-relaxed font-sans pt-1">
                        Creates an instant expense transaction. Category names should align with categories like Food, Shop, Rent, Transport, Entertainment, etc.
                      </p>
                      <pre className="p-2.5 bg-black/40 border border-white/5 rounded-xl font-mono text-[10px] text-white/50 select-all mt-1">
                        /add-expense 1240 Shopping Brand New Wool Coat
                      </pre>
                    </div>

                    <div className="space-y-1 text-left pt-2 border-t border-white/5">
                      <span className="text-[10px] font-mono text-[#00F5FF] font-bold bg-[#00F5FF]/10 px-2 py-0.5 rounded-md">
                        /add-income &lt;amount&gt; &lt;category&gt; &lt;title&gt;
                      </span>
                      <p className="text-xs text-white/70 leading-relaxed font-sans pt-1">
                        Inserts an instant revenue deposit inflow categorized within Income groups.
                      </p>
                      <pre className="p-2.5 bg-black/40 border border-white/5 rounded-xl font-mono text-[10px] text-white/50 select-all mt-1">
                        /add-income 18500 Freelance Professional Consulting Invoice
                      </pre>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-3 border-t border-white/5">
                      <div className="p-2 border border-white/5 bg-black/30 rounded-xl">
                        <span className="text-[#00F5FF] font-bold">/export-xlsx</span>
                        <p className="text-white/40 text-[9px] mt-0.5 leading-normal">Download stylized Excel audit sheet with automated stat sheets</p>
                      </div>
                      <div className="p-2 border border-white/5 bg-black/30 rounded-xl">
                        <span className="text-emerald-400 font-bold">/export-csv</span>
                        <p className="text-white/40 text-[9px] mt-0.5 leading-normal">Generate raw comma-separated values stream</p>
                      </div>
                      <div className="p-2 border border-white/5 bg-black/30 rounded-xl">
                        <span className="text-cyan-400 font-bold">/seed</span>
                        <p className="text-white/40 text-[9px] mt-0.5 leading-normal">Repopulate ledger log with high fidelity mockup posts</p>
                      </div>
                      <div className="p-2 border border-white/5 bg-black/30 rounded-xl">
                        <span className="text-rose-400 font-bold">/clear-ledger</span>
                        <p className="text-white/40 text-[9px] mt-0.5 leading-normal">Clear the local history cache databases immediately</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. COOPERATIVE AUDIT TIP */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3.5 items-start">
                  <span className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </span>
                  <div className="space-y-1 text-left select-none">
                    <h5 className="text-xs font-sans font-bold text-amber-300">Industrial Audit Protocols</h5>
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      Aura operates fully on client-side sandboxed states. Backing up data using <code className="font-mono text-[#00F5FF]">Ctrl+K</code> &gt; <code className="font-mono text-[#00F5FF]">/export-json</code> on a regular basis will ensure that clearing local cookies or changing workspaces does not trigger loss of accounting entries.
                    </p>
                  </div>
                </div>
              </div>

              {/* Console Help Footer */}
              <div className="px-6 py-4.5 bg-black/45 border-t border-white/5 flex items-center justify-between gap-4">
                <span className="text-[10px] font-mono text-white/30">
                  SECURE AURA SYSTEM GUIDE VERSION 2.4.2
                </span>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="px-4 py-2 bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-black text-[10px] uppercase rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
                >
                  Dismiss Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
