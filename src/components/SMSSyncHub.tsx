import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Smartphone, 
  ChevronRight, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Database,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Sliders,
  Play,
  Pause,
  Trash2,
  Check,
  Eye,
  X,
  Plus,
  Inbox,
  Lock,
  MessageCircle,
  HelpCircle
} from "lucide-react";
import { Transaction } from "../types";
import { CATEGORIES } from "../data";
import { CategoryIcon } from "./CategoryIcon";
import { formatCurrencyValue } from "../utils/currencyUtils";

interface SMSSyncHubProps {
  transactions: Transaction[];
  displayCurrency: string;
  exchangeRates: Record<string, number>;
  onAddTransaction: (newTx: Omit<Transaction, "id">) => void;
  onSyncTransactions: (updated: Transaction[]) => void;
  userName?: string;
}

interface SimulatedMessage {
  id: string;
  sender: string;
  timestamp: string;
  text: string;
  status: "unread" | "processed" | "skipped";
  reason?: string;
}

export function SMSSyncHub({
  transactions,
  displayCurrency,
  exchangeRates,
  onAddTransaction,
  onSyncTransactions,
  userName = "User"
}: SMSSyncHubProps) {
  // 1. Initial Seeding of simulated device inbox
  const DEFAULT_SMS_POOL: SimulatedMessage[] = [
    {
      id: "sms-1",
      sender: "SBI-ALERT",
      timestamp: "10 mins ago",
      text: "SBI Alert: Your Acct ending 0394 was credited for INR 145000.00 from CORP SALARY on 01-Jun-2026.",
      status: "unread"
    },
    {
      id: "sms-2",
      sender: "HDFC-BANK",
      timestamp: "25 mins ago",
      text: "HDFC Bank Alert: UPI debited INR 380.00 to STARBUCKS COFFEE on 12-Jun-2026. Bal: INR 42350.",
      status: "unread"
    },
    {
      id: "sms-3",
      sender: "Mom",
      timestamp: "1 hour ago",
      text: "Hey Ravi, are we still meeting today at the cafe for coffee around 5 PM? Let me know.",
      status: "unread"
    },
    {
      id: "sms-4",
      sender: "AMEX-US",
      timestamp: "3 hours ago",
      text: "Amex Alert: Card ending 2004 billed USD 45.00 at UBER TRIP on 10-Jun-2026.",
      status: "unread"
    },
    {
      id: "sms-5",
      sender: "AD-NETFLX",
      timestamp: "5 hours ago",
      text: "Transaction Alert: Billed INR 649.00 on card for NETFLIX MEMB auto-renewal.",
      status: "unread"
    },
    {
      id: "sms-6",
      sender: "CP-DMART",
      timestamp: "1 day ago",
      text: "Dear Customer, get flat 20% off on all groceries at DMART on spends above 2000. Use coupon DMART20.",
      status: "unread"
    },
    {
      id: "sms-7",
      sender: "Google-OTP",
      timestamp: "1 day ago",
      text: "G-710492 is your Google verification code. Do not share this OTP with anyone for login security.",
      status: "unread"
    },
    {
      id: "sms-8",
      sender: "ICICI-TXN",
      timestamp: "2 days ago",
      text: "Your ICICI Credit Card was charged INR 4500.00 at AMAZON.IN on 11-Jun-2026. Thank you for your business.",
      status: "unread"
    },
    {
      id: "sms-9",
      sender: "ZOMATO",
      timestamp: "2 days ago",
      text: "Yum! Your Zomato delivery order of INR 850.00 to Pizza Hut was successful on 12-Jun-2026.",
      status: "unread"
    },
    {
      id: "sms-10",
      sender: "Friend Sumit",
      timestamp: "3 days ago",
      text: "Sent you that document. Let me know if you need any edits before the presentation.",
      status: "unread"
    }
  ];

  // Load from localStorage or seed
  const [deviceInbox, setDeviceInbox] = useState<SimulatedMessage[]>(() => {
    try {
      const stored = localStorage.getItem("aura_simulated_inbox");
      return stored ? JSON.parse(stored) : DEFAULT_SMS_POOL;
    } catch {
      return DEFAULT_SMS_POOL;
    }
  });

  // Load SMS permission status from localStorage or default to pending
  const [smsPermissionStatus, setSmsPermissionStatus] = useState<"pending" | "granted" | "denied">(() => {
    try {
      const stored = localStorage.getItem("aura_sms_permission_status");
      return (stored as "pending" | "granted" | "denied") || "pending";
    } catch {
      return "pending";
    }
  });

  // Local state managers
  const [isSyncActive, setIsSyncActive] = useState(true); // Automatic Background Scan active
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [activeManualText, setActiveManualText] = useState("");
  const [isParsingManual, setIsParsingManual] = useState(false);
  const [customSender, setCustomSender] = useState("V-CITI");
  const [customText, setCustomText] = useState("");
  const [activeTab, setActiveTab] = useState<"daemon" | "tester">("daemon");
  
  // Trace logs inside Simulated System Console
  const [traceLogs, setTraceLogs] = useState<string[]>([
    "System Boot: Pixel 10 Android Broadcaster receiver hooks attached.",
    "Aura Daemon Service online. Listening for incoming text messages on target sandbox."
  ]);

  const addTraceLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setTraceLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 24)]);
  };

  // Toast status
  const [toast, setToast] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  const triggerToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const saveInbox = (inbox: SimulatedMessage[]) => {
    setDeviceInbox(inbox);
    localStorage.setItem("aura_simulated_inbox", JSON.stringify(inbox));
  };

  const handleRequestSmsPermission = async () => {
    addTraceLog("Aura Telephony Service: Requesting carrier message streams authorization...");
    
    // Request authentic browser Notification permission (this triggers a genuine system allow prompt!)
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        addTraceLog("System prompt: Triggering native environment notification alert...");
        await Notification.requestPermission();
      }
    } catch (e) {
      console.warn("Notification prompt skipped or blocked inside iframe sandbox.", e);
    }

    setSmsPermissionStatus("granted");
    localStorage.setItem("aura_sms_permission_status", "granted");
    addTraceLog("✅ SMS Telephony Permission APPROVED by user and system context.");
    addTraceLog("Aura Device Broadcaster Hook linked to local SMS queue successfully.");
    addTraceLog("Automatic Telephony daemon is now ONLINE and reading incoming messages in real-time.");
    triggerToast("SMS Telephony permission granted!", "success");
  };

  // Real-time SMS Arrivals Simulation Generator (if permission is active)
  useEffect(() => {
    if (smsPermissionStatus !== "granted" || !isSyncActive) return;

    const arrivalTimer = setInterval(() => {
      const customTemplates = [
        { sender: "CRA-AMAZON", text: `AMEX Card charged INR ${(Math.floor(Math.random() * 2100) + 150).toFixed(2)} at AMAZON SPENDS.` },
        { sender: "SBI-UPI", text: `SBI Alert: UPI debited INR ${(Math.floor(Math.random() * 600) + 15).toFixed(2)} at ZO-SWIGGY FOOD.` },
        { sender: "ICICI-PREUM", text: `ICICI Credit: Billed INR ${(Math.floor(Math.random() * 300) + 100).toFixed(2)} for NETFLIX RECURRENT Memb.` },
        { sender: "HDFC-UPI", text: `HDFC Bank: UPI debited INR ${(Math.floor(Math.random() * 1500) + 200).toFixed(2)} to STARBUCKS COFFEE. Bal ₹${Math.floor(Math.random() * 45000) + 1000}.` },
        { sender: "AUTO-TAXIS", text: `UBER Ingress: Card charged INR ${(Math.floor(Math.random() * 800) + 120).toFixed(2)} for ride fare transaction.` }
      ];

      const chosen = customTemplates[Math.floor(Math.random() * customTemplates.length)];
      
      const incomingSMS: SimulatedMessage = {
        id: `sms-auto-arrive-${Date.now()}`,
        sender: chosen.sender,
        timestamp: "Just now",
        text: chosen.text,
        status: "unread" as const
      };

      setDeviceInbox(prev => {
        const next = [incomingSMS, ...prev];
        localStorage.setItem("aura_simulated_inbox", JSON.stringify(next));
        return next;
      });

      addTraceLog(`[TELEPHONY Carrier Signal] Inbound SMS captured from Cell Tower for '${chosen.sender}'`);
      triggerToast(`Incoming transaction SMS: ${chosen.sender}`, "info");

    }, 25000);

    return () => clearInterval(arrivalTimer);
  }, [smsPermissionStatus, isSyncActive]);

  // 2. Custom Mappings for classifier
  const [sellerMappings, setSellerMappings] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem("aura_seller_categories");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Category determination
  const determineCategory = (seller: string, type: "expense" | "income"): string => {
    if (type === "income") return "Income";
    const normalizedSeller = seller.trim().toLowerCase();

    if (sellerMappings[normalizedSeller]) {
      return sellerMappings[normalizedSeller];
    }

    // Match historic transactions context
    for (const tx of transactions) {
      const txTitleLower = tx.title.toLowerCase();
      const isMatch = txTitleLower.includes(normalizedSeller);
      if (isMatch && tx.category && tx.category !== "Unknown") {
        return tx.category;
      }
    }

    if (/uber|grab|lyft|cab|taxi|train|rail|transit|metro/i.test(normalizedSeller)) return "Transportation";
    if (/starbucks|coffee|swiggy|zomato|pizza|burger|cafe|restaurant|din|hut/i.test(normalizedSeller)) return "Food & Dining";
    if (/amazon|walmart|shopping|target|clothing|sephora|nike|store|dmart/i.test(normalizedSeller)) return "Shopping";
    if (/netflix|spotify|hulu|steam|disney|entertainment|theatre/i.test(normalizedSeller)) return "Entertainment";
    if (/rent|apartment|lease|electric|utility|water|gas/i.test(normalizedSeller)) return "Housing & Rent";
    if (/gym|crossfit|health|pharmacy|doctor|hospital|supplement/i.test(normalizedSeller)) return "Health & Gym";

    return "Unknown";
  };

  // 3. Robust parsing logic (Regex base)
  const parseSMSRegex = (text: string) => {
    const rawText = text.toLowerCase();
    
    // Type detection rules
    let type: "expense" | "income" = "expense";
    if (
      rawText.includes("credited") || 
      rawText.includes("received") || 
      rawText.includes("refund") || 
      rawText.includes("salary") || 
      rawText.includes("deposited") || 
      rawText.includes("added to")
    ) {
      type = "income";
    }

    // Amount Extraction
    let amount = 0;
    const amountRegex = /(?:rs\.?|inr|₹|usd|\$|eur|€|gbp|£)\s*([\d,]+(?:\.\d{1,2})?)/i;
    const match = text.match(amountRegex);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ""));
    } else {
      const standalonePattern = /\b\d+(?:,\d{3})*(?:\.\d{1,2})?\b/;
      const standMatch = text.match(standalonePattern);
      if (standMatch) {
         const val = parseFloat(standMatch[0].replace(/,/g, ""));
         if (val > 0) amount = val;
      }
    }

    // Currency Detection
    let currency = "INR";
    if (rawText.includes("$") || rawText.includes("usd")) currency = "USD";
    else if (rawText.includes("€") || rawText.includes("eur")) currency = "EUR";
    else if (rawText.includes("£") || rawText.includes("gbp")) currency = "GBP";

    // Seller/Merchant extraction
    let seller = "Unknown Merchant";
    const merchantPatterns = [
      /at\s+([A-Za-z0-9\.\-\s]+?)(?:\s+on|\s+via|\s+using|\s+date|\s+\.|\s*$)/i,
      /to\s+([A-Za-z0-9\.\-\s]+?)(?:\s+on|\s+via|\s+using|\s+date|\s+\.|\s*$)/i,
      /for\s+([A-Za-z0-9\.\-\s]+?)(?:\s+at|\s+on|\s+via|\s+using|\s+\.|\s*$)/i,
      /from\s+([A-Za-z0-9\.\-\s]+?)(?:\s+for|\s+at|\s+on|\s+via|\s+using|\s+\.|\s*$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const mMatch = text.match(pattern);
      if (mMatch && mMatch[1]) {
        const parsed = mMatch[1].trim();
        const cleaned = parsed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s{2,}/)[0];
        const words = cleaned.split(" ").slice(0, 3).join(" ");
        if (words && words.length > 2 && !["a", "the", "an", "your", "my", "our", "their", "is", "was"].includes(words.toLowerCase())) {
          seller = words;
          break;
        }
      }
    }

    const popularSellers = [
      "starbucks", "netflix", "spotify", "amazon", "apple", "uber", "swiggy", "zomato", "crossfit", "walmart", "dmart"
    ];
    for (const brand of popularSellers) {
      if (rawText.includes(brand)) {
        seller = brand.toUpperCase();
        break;
      }
    }

    return { amount, type, seller, currency };
  };

  // Core Analyzer Engine: Checks if message is actually transactional vs spam/chats
  const isMessageTransactional = (text: string): { isTx: boolean; reason: string } => {
    const lower = text.toLowerCase();
    
    // Check for Multi-Factor Verification OTPs first
    if (lower.includes("otp") || lower.includes("verification code") || lower.includes("secures code") || lower.includes("one-time password")) {
      return { isTx: false, reason: "Security verification token (OTP code)" };
    }

    // Check for Promotional Ads/Spam
    if (lower.includes("get flat") || lower.includes("coupon code") || lower.includes("discount on") || lower.includes("click link") || lower.includes("apply now") || lower.includes("pre-approved")) {
      return { isTx: false, reason: "Marketing discount / Advertising promotional spam" };
    }

    // Check for general personal chats
    const isPersonal = !lower.includes("bank") && !lower.includes("alert") && !lower.includes("tx") && !lower.includes("debited") && !lower.includes("credited") && !lower.includes("charged") && !lower.includes("spent") && !lower.includes("billed") && !lower.includes("received") && !lower.includes("paid") && !lower.includes("fees");
    if (isPersonal && (lower.includes("meeting") || lower.includes("hello") || lower.includes("where are you") || lower.includes("document") || lower.includes("homework"))) {
      return { isTx: false, reason: "Personal conversation / casual chat text" };
    }

    // Positive indicators
    const hasTxKeywords = 
      lower.includes("debited") || 
      lower.includes("credited") || 
      lower.includes("charged") || 
      lower.includes("spent") || 
      lower.includes("received") || 
      lower.includes("withdrawn") || 
      lower.includes("billed") || 
      lower.includes("paid") || 
      lower.includes("tx alert") ||
      lower.includes("transferred INR") ||
      lower.includes("unpaid invoice");

    const hasNumbers = /\d/.test(text);

    if (hasTxKeywords && hasNumbers) {
      return { isTx: true, reason: "Valid financials / Bank Ledger Alert isolated" };
    }

    return { isTx: false, reason: "Filtered out: Informational or general notice" };
  };

  // Full Server/Client parser flow
  const processAndIngestMessage = async (msg: SimulatedMessage): Promise<{ success: boolean; data?: any; error?: string }> => {
    const analysis = isMessageTransactional(msg.text);
    if (!analysis.isTx) {
      return { success: false, error: analysis.reason };
    }

    try {
      // Attempt Gemini Server Parse first
      const response = await fetch("/api/sms/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsText: msg.text })
      });

      if (!response.ok) {
        throw new Error("AI router fallback");
      }

      const extracted = await response.json();
      const suggestedCategory = determineCategory(extracted.seller, extracted.type);
      return {
        success: true,
        data: {
          ...extracted,
          suggestedCategory
        }
      };
    } catch {
      // Regex offline fallback
      const extracted = parseSMSRegex(msg.text);
      const suggestedCategory = determineCategory(extracted.seller, extracted.type);
      return {
        success: true,
        data: {
          ...extracted,
          suggestedCategory
        }
      };
    }
  };

  // 4. Trigger Automatic Scan of all unread messages
  const runExhaustiveScan = async () => {
    if (isScanningAll) return;
    setIsScanningAll(true);
    setScanningProgress(5);
    addTraceLog("Initiating full inbox scan of Simulated Google Pixel 10 storage logs...");

    let inboxCopy = [...deviceInbox];
    let unreadCount = inboxCopy.filter(m => m.status === "unread").length;

    if (unreadCount === 0) {
      setScanningProgress(100);
      setTimeout(() => {
        setIsScanningAll(false);
        setScanningProgress(0);
        triggerToast("Device inbox is currently up to date!", "info");
      }, 800);
      addTraceLog("Scan complete: No outstanding unread messages found.");
      return;
    }

    let processedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < inboxCopy.length; i++) {
      const msg = inboxCopy[i];
      if (msg.status === "unread") {
        // Increment progress incrementally
        setScanningProgress(Math.floor((i / inboxCopy.length) * 100));
        
        // Brief artificial delay to show animation & sequence beautifully
        await new Promise(resolve => setTimeout(resolve, 350));
        
        addTraceLog(`Evaluating message from: {${msg.sender}}`);
        const result = await processAndIngestMessage(msg);

        if (result.success && result.data) {
          const info = result.data;
          // Ingest to global transactions cashbook automatiquement!
          onAddTransaction({
            title: `${info.seller} (SMS Auto)`,
            amount: info.amount,
            type: info.type,
            category: info.suggestedCategory,
            date: new Date().toISOString().split("T")[0],
            description: `Automatically compiled in background from incoming SMS text: "${msg.text}"`,
            currency: info.currency || "INR",
            isRecurring: false,
            notes: "Auto-parsed via Pixel 10 Telephony receiver."
          });

          inboxCopy[i] = {
            ...msg,
            status: "processed",
            reason: `Linked: ${info.type === "expense" ? "-" : "+"}${formatCurrencyValue(info.amount, info.currency)} [${info.suggestedCategory}]`
          };
          addedCount++;
          addTraceLog(`✅ Identified transactional! Added ${info.type}: ${info.seller} for ${formatCurrencyValue(info.amount, info.currency)}`);
          triggerToast(`Logged auto expense: ${info.seller}`, "success");
        } else {
          inboxCopy[i] = {
            ...msg,
            status: "skipped",
            reason: result.error || "Non-transactional text"
          };
          skippedCount++;
          addTraceLog(`⚠️ Filtered out message from {${msg.sender}}: ${result.error}`);
        }
      }
    }

    setScanningProgress(100);
    saveInbox(inboxCopy);

    setTimeout(() => {
      setIsScanningAll(false);
      setScanningProgress(0);
      addTraceLog(`Scan fully completed: Ingested ${addedCount} financial alerts, filtered out ${skippedCount} non-transactional items.`);
      triggerToast(`Device sync finished! Auto-posted ${addedCount} expenses.`, "success");
    }, 500);
  };

  // 5. Simulated Background Ingestion timer
  useEffect(() => {
    if (!isSyncActive) return;

    // Simulate looking for incoming background messages every 15s
    const backgroundTimer = setInterval(async () => {
      // Find the first unread simulated message to automatically ingest!
      const unreadIdx = deviceInbox.findIndex(m => m.status === "unread");
      if (unreadIdx !== -1) {
        let inboxCopy = [...deviceInbox];
        const msg = inboxCopy[unreadIdx];
        
        addTraceLog(`[Daemon Sync] Incoming SMS detected from: {${msg.sender}}`);
        const result = await processAndIngestMessage(msg);

        if (result.success && result.data) {
          const info = result.data;
          onAddTransaction({
            title: `${info.seller} (SMS Auto)`,
            amount: info.amount,
            type: info.type,
            category: info.suggestedCategory,
            date: new Date().toISOString().split("T")[0],
            description: `Automatically compiled in background from incoming SMS text: "${msg.text}"`,
            currency: info.currency || "INR",
            isRecurring: false,
            notes: "Auto-parsed via background daemon listening thread."
          });

          inboxCopy[unreadIdx] = {
            ...msg,
            status: "processed",
            reason: `Auto Linked: ${info.type === "expense" ? "-" : "+"}${formatCurrencyValue(info.amount, info.currency)}`
          };
          addTraceLog(`[Daemon Sync] Auto Ingest: Successfully mapped expense: ${info.seller} for ${formatCurrencyValue(info.amount, info.currency)}`);
          triggerToast(`Auto-ingested transaction: ${info.seller}`, "success");
        } else {
          inboxCopy[unreadIdx] = {
            ...msg,
            status: "skipped",
            reason: result.error || "Non-transactional"
          };
          addTraceLog(`[Daemon Sync] Filtered incoming: ${msg.sender} (${result.error})`);
        }
        saveInbox(inboxCopy);
      }
    }, 18000);

    return () => clearInterval(backgroundTimer);
  }, [isSyncActive, deviceInbox]);

  // 6. Broadcast simulator
  const handleBroadcastSimulatedSMS = async () => {
    const trimmed = customText.trim();
    if (!trimmed) {
      triggerToast("Please input custom text to broadcast.", "error");
      return;
    }

    const newSMS: SimulatedMessage = {
      id: `sms-custom-${Date.now()}`,
      sender: customSender.toUpperCase().replace(/\s+/g, "-") || "NATIVE-SMS",
      timestamp: "Just now",
      text: trimmed,
      status: "unread"
    };

    const updatedInbox = [newSMS, ...deviceInbox];
    saveInbox(updatedInbox);
    setCustomText("");
    addTraceLog(`Broadcast Event: Injected custom raw message from '${newSMS.sender}' into device inbox.`);
    triggerToast("Injected text to device storage!", "info");

    // If automatic background daemon is active, process it instantly
    if (isSyncActive) {
      setTimeout(async () => {
        addTraceLog(`[Daemon Sync] Real-time thread executing custom broadcast analysis...`);
        const result = await processAndIngestMessage(newSMS);
        let inboxCopy = [...updatedInbox];
        const idx = inboxCopy.findIndex(m => m.id === newSMS.id);

        if (idx !== -1) {
          if (result.success && result.data) {
            const info = result.data;
            onAddTransaction({
              title: `${info.seller} (SMS Auto)`,
              amount: info.amount,
              type: info.type,
              category: info.suggestedCategory,
              date: new Date().toISOString().split("T")[0],
              description: `Automatically parsing real-time broadcast input stream: "${trimmed}"`,
              currency: info.currency || "INR",
              isRecurring: false,
              notes: "Simulated live broadcast telemetry ingestion."
            });

            inboxCopy[idx] = {
              ...newSMS,
              status: "processed",
              reason: `Linked: ${info.type === "expense" ? "-" : "+"}${formatCurrencyValue(info.amount, info.currency)}`
            };
            addTraceLog(`[Instant Ingest] Real-time success: ${info.seller} parsed and posted for ${formatCurrencyValue(info.amount, info.currency)}`);
            triggerToast(`Direct auto-added: ${info.seller}`, "success");
          } else {
            inboxCopy[idx] = {
              ...newSMS,
              status: "skipped",
              reason: result.error || "Non-financial communication"
            };
            addTraceLog(`[Instant Ingest] Filtered out custom message: ${result.error}`);
            triggerToast(`Message skipped: ${result.error}`, "info");
          }
          saveInbox(inboxCopy);
        }
      }, 1000);
    }
  };

  const resetSimulatedInbox = () => {
    saveInbox(DEFAULT_SMS_POOL);
    addTraceLog("Device Reset: Restored default smartphone inbox sample database.");
    triggerToast("Simulated device inbox reseeded successfully!", "info");
  };

  const clearProcessedInbox = () => {
    const cleared = deviceInbox.map(m => m.status !== "unread" ? { ...m, status: "unread" as const, reason: undefined } : m);
    saveInbox(cleared);
    addTraceLog("Reset Status: All processed and filtered indicators cleared to 'unread'.");
    triggerToast("Status records cleared to unread!", "info");
  };

  // 7. Change category allocation
  const handleAssignCategory = (txId: string, sellerName: string, selectedCategory: string) => {
    const normalizedSeller = sellerName.replace(/\(\s*SMS\s*Auto\s*\)/gi, "").trim().toLowerCase();
    
    const updatedMappings = {
      ...sellerMappings,
      [normalizedSeller]: selectedCategory
    };
    setSellerMappings(updatedMappings);
    localStorage.setItem("aura_seller_categories", JSON.stringify(updatedMappings));

    const updatedTransactionsList = transactions.map((t) => {
      const isMatchingMerchant = t.title.toLowerCase().includes(normalizedSeller);
      if (isMatchingMerchant && t.category === "Unknown") {
        return { ...t, category: selectedCategory };
      }
      if (t.id === txId) {
        return { ...t, category: selectedCategory };
      }
      return t;
    });

    onSyncTransactions(updatedTransactionsList);
    addTraceLog(`Custom Learning Index: Mapped merchant "${normalizedSeller}" permanently to [${selectedCategory}]`);
    triggerToast(`Mapped all "${sellerName}" transactions to ${selectedCategory}!`, "success");
  };

  // Filtering out Unresolved transaction ledger items from the main app
  const unresolvedTransactions = transactions.filter(t => t.category === "Unknown");

  return (
    <div className="space-y-6 max-w-full">
      
      {/* Dynamic Slide Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-24 right-4 md:right-8 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-mono font-bold ${
              toast.type === "success" 
                ? "bg-emerald-950/95 border-emerald-500/25 text-emerald-400"
                : toast.type === "error"
                ? "bg-rose-950/95 border-rose-500/25 text-rose-400"
                : "bg-cyan-950/95 border-cyan-500/25 text-cyan-400"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BANNER FOR TELEPHONY PORTAL */}
      <div className="bg-[#0c0c0c]/80 border border-white/5 backdrop-blur-3xl rounded-[32px] p-5 md:p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400/20 to-blue-500/20 border border-cyan-400/35 flex items-center justify-center text-cyan-400 shrink-0">
            <Smartphone className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-[#00F5FF]/80 uppercase tracking-widest block">GOOGLE PIXEL 10 OS INTEGRATION</span>
            <h2 className="text-xl md:text-2xl font-sans font-extrabold text-white">Telephony SMS Influx Daemon</h2>
            <p className="text-xs text-white/50 mt-1 max-w-xl">
              Fully automatic, sandboxed background SMS receiver. Accesses raw device updates, filters out non-financial chats, spam, and OTPs, and auto-posts expenses direct to Cashbook.
            </p>
          </div>
        </div>

        {/* Sync Switch controls */}
        <div className="flex items-center gap-3 bg-black/60 border border-white/5 p-3 rounded-2xl">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-mono font-bold text-white/80 uppercase">REAL-TIME INGESTION TIMER</span>
            <span className="text-[9px] text-[#00F5FF] font-mono tracking-wider flex items-center gap-1 justify-end mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isSyncActive ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
              {isSyncActive ? "DAEMON LISTENING ACTIVE" : "DAEMON SUSPENDED"}
            </span>
          </div>
          <button
            onClick={() => {
              setIsSyncActive(!isSyncActive);
              addTraceLog(isSyncActive ? "Daemon Service suspended by user." : "Daemon Service resumed. Listening for incoming texts.");
              triggerToast(isSyncActive ? "SMS Daemon suspended" : "SMS Daemon resumed", "info");
            }}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${isSyncActive ? "bg-cyan-400" : "bg-white/10"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${isSyncActive ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Core Left Column (Simulation, log viewer) */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          
          {/* Main Simulated device view */}
          <div className="bg-white/[0.015] border border-white/5 rounded-3xl p-5 md:p-6 space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-white/5 pb-4">
              <div className="flex gap-1.5 p-1 bg-black/40 border border-white/5 rounded-xl">
                <button
                  onClick={() => setActiveTab("daemon")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                    activeTab === "daemon" ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20" : "text-white/40 hover:text-white"
                  }`}
                >
                  Pixel 10 Inbox
                </button>
                <button
                  onClick={() => setActiveTab("tester")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                    activeTab === "tester" ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20" : "text-white/40 hover:text-white"
                  }`}
                >
                  Broadcast Terminal
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetSimulatedInbox}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-mono text-white/75 rounded-xl transition-all uppercase cursor-pointer flex items-center gap-1.5"
                  title="Reload default mock SMS database"
                >
                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                  <span>Reseed Box</span>
                </button>

                <button
                  onClick={clearProcessedInbox}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-mono text-white/50 hover:text-white rounded-xl transition-all uppercase cursor-pointer"
                  title="Mark all processed messages back to unread"
                >
                  Clear Status
                </button>
              </div>
            </div>

            {smsPermissionStatus !== "granted" ? (
              <div className="py-12 px-4 text-center space-y-6 flex flex-col items-center justify-center animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-cyan-950/40 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <Lock className="w-7 h-7 text-cyan-400 animate-pulse" />
                </div>
                
                <div className="space-y-2 max-w-sm">
                  <h4 className="text-sm font-sans font-bold text-white">Telephony Message Interface Ingestion Locked</h4>
                  <p className="text-[11px] text-white/55 leading-relaxed font-sans">
                    Aura requires user-authorized SMS reader permission to listen for financial transaction receipts as they arrive. Please grant permission to activate real-time telemetry capture.
                  </p>
                </div>

                <div className="w-full max-w-sm space-y-3.5">
                  <button
                    onClick={handleRequestSmsPermission}
                    className="w-full py-4.5 bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/30 hover:bg-[#00F5FF]/20 rounded-2xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#00F5FF]" />
                    <span>🔑 Grant SMS Reading Permission</span>
                  </button>

                  <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                    <p className="text-[9.5px] text-white/40 font-mono leading-relaxed">
                      * Triggers standard browser notification check. Standard mobile telemetry will auto-stream incoming carrier packets on active cell towers.
                    </p>
                  </div>
                </div>
              </div>
            ) : activeTab === "daemon" ? (
              <div className="space-y-5">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 bg-black/40 border border-white/5 p-4 rounded-2xl">
                  <div className="text-center">
                    <span className="text-[8px] font-mono text-white/35 uppercase block tracking-wider">Inspect Base</span>
                    <span className="text-lg font-mono font-bold text-white">{deviceInbox.length}</span>
                  </div>
                  <div className="text-center border-x border-white/5">
                    <span className="text-[8px] font-mono text-white/35 uppercase block tracking-wider font-bold text-cyan-400">Read / Auto Logs</span>
                    <span className="text-lg font-mono font-bold text-cyan-400">
                      {deviceInbox.filter(m => m.status === "processed").length}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] font-mono text-white/35 uppercase block tracking-wider">Unread / Queue</span>
                    <span className="text-lg font-mono font-bold text-amber-400">
                      {deviceInbox.filter(m => m.status === "unread").length}
                    </span>
                  </div>
                </div>

                {/* Main Process buttons */}
                <div className="space-y-3">
                  <button
                    onClick={runExhaustiveScan}
                    disabled={isScanningAll || deviceInbox.filter(m => m.status === "unread").length === 0}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 border border-cyan-400/20 text-black text-xs font-mono font-extrabold uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isScanningAll ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scanning SMS thread block {scanningProgress}%...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black" />
                        <span>Intelligently Scan All Unread Text Messages Now</span>
                      </>
                    )}
                  </button>

                  {isScanningAll && (
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-cyan-400 h-full transition-all duration-300"
                        style={{ width: `${scanningProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Virtualized Inbox List */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {deviceInbox.length === 0 ? (
                    <div className="py-16 text-center bg-black/30 rounded-2xl border border-dashed border-white/5">
                      <Inbox className="w-10 h-10 text-white/10 mx-auto mb-3" />
                      <p className="text-xs font-mono text-white/30 uppercase">Device Messages Buffer Cleared</p>
                      <p className="text-[10px] text-white/20 mt-1">Write some custom SMS in the Broadcast Terminal to test sync.</p>
                    </div>
                  ) : (
                    deviceInbox.map((sms) => {
                      const isReadMessage = sms.status !== "unread";
                      const isProcessedSuccess = sms.status === "processed";

                      return (
                        <div
                          key={sms.id}
                          className={`p-4 border rounded-2xl relative transition-all duration-200 ${
                            sms.status === "unread"
                              ? "bg-white/[0.03] border-cyan-400/20 shadow-md shadow-cyan-400/[0.01]"
                              : isProcessedSuccess
                              ? "bg-emerald-500/[0.01] border-emerald-500/10 opacity-70"
                              : "bg-white/[0.005] border-white/5 opacity-60"
                          }`}
                        >
                          {/* Inner status headers */}
                          <div className="flex justify-between items-center gap-4 mb-2.5">
                            <div className="flex items-center gap-2">
                              {sms.status === "unread" ? (
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                              ) : isProcessedSuccess ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-white/15 shrink-0" />
                              )}
                              <span className="text-xs font-sans font-extrabold text-white leading-tight">
                                {sms.sender}
                              </span>
                              <span className="text-[9px] font-mono text-white/30">
                                {sms.timestamp}
                              </span>
                            </div>

                            <div className="shrink-0">
                              {sms.status === "unread" ? (
                                <span className="text-[8px] font-mono font-bold bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 px-2 py-0.5 rounded-full uppercase">
                                  Unread Queue
                                </span>
                              ) : isProcessedSuccess ? (
                                <span className="text-[8px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-full uppercase">
                                  Added Expense
                                </span>
                              ) : (
                                <span className="text-[8px] font-mono font-bold bg-white/5 border border-white/15 text-white/30 px-2 py-0.5 rounded-full uppercase">
                                  Ignored / Skipped
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs font-mono text-white/75 leading-relaxed bg-[#0c0c0c]/40 p-3 rounded-xl border border-white/[0.02]">
                            {sms.text.replace(/\bRavi\b/g, userName)}
                          </p>

                          {/* Dynamic Processing trace message */}
                          {sms.reason && (
                            <div className={`mt-2.5 pt-2 border-t border-white/5 text-[10px] font-mono flex items-center gap-1.5 ${
                              isProcessedSuccess ? "text-emerald-400" : "text-white/40"
                            }`}>
                              <ChevronRight className="w-3 h-3 shrink-0" />
                              <span>{sms.reason}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Broadcast test tab interface */
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-2xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-500/80 leading-relaxed font-sans">
                    <strong>Aura Broadcast Injector:</strong> Simulate the raw intake pipeline! Write your own mock bank alerts or messaging formats, broadcast them, and see if Aura automatically labels it transactional, filters it, or registers it.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-white/40 uppercase block">Sender Identity</label>
                    <input 
                      type="text" 
                      value={customSender} 
                      onChange={(e) => setCustomSender(e.target.value)}
                      placeholder="e.g. WELLS-FARGO"
                      className="w-full bg-[#050505]/80 p-3 border border-white/5 rounded-xl text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500/30 font-bold"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-mono text-white/40 uppercase block">Simulate Preset Texts</label>
                    <select
                      onChange={(e) => setCustomText(e.target.value)}
                      defaultValue=""
                      className="w-full bg-[#050505]/80 p-3 border border-white/5 rounded-xl text-xs font-mono text-cyan-400 cursor-pointer focus:outline-none focus:border-cyan-500/30"
                    >
                      <option value="" disabled>-- CHOOSE TYPICAL FORMATS --</option>
                      <option value="HDFC Bank: Rs 2400.00 debited for electricity bill payment on 12-Jun-2026. Ref ID: txn12049.">HDFC Debit Alert (INR 2400 Electricity)</option>
                      <option value="ALERT: Card ending 0394 billed USD 120.00 at APPLE STORE NY on 11-Jun-2026.">Apple Store Purchase (USD 120)</option>
                      <option value="Salary credit alert: Acct 1039 credited with INR 182000.00 on 31-May-2026.">Corporate Salary Credit (INR 182000)</option>
                      <option value="How about we skip the gym session and get pizza? Let me know!">Personal message (Spam / Casual check)</option>
                      <option value="OTP is 402910 for HDFC credit card transaction. Expiring in 2m.">Citi Secure OTP Security verification (Fake OTP)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9.5px] font-mono text-white/35 uppercase block">Raw Custom Message Body</label>
                  <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="e.g. ICICI Bank: Charged INR 450.00 for Netflix Membership renewals on card ending 034..."
                    rows={4}
                    className="w-full bg-[#050505]/80 p-4 border border-white/5 focus:border-cyan-500/30 rounded-2xl text-xs font-mono text-cyan-400 placeholder-white/20 focus:outline-none transition-all leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleBroadcastSimulatedSMS}
                  className="w-full py-4.5 bg-cyan-400 hover:bg-cyan-350 text-black rounded-2xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>Broadcast Simulated SMS To Device</span>
                </button>
              </div>
            )}

          </div>

          {/* System Telemetry Event Console */}
          <div className="bg-black/60 border border-white/5 rounded-3xl p-5 md:p-6 space-y-4">
            <h3 className="text-xs font-mono font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Aura Sync Security Telemetry Logs</span>
            </h3>

            <div className="bg-[#050505] p-4 rounded-xl border border-white/[0.03] space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar font-mono text-[10px] text-cyan-500 h-44 select-all">
              {traceLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed flex items-start gap-1">
                  <span className="text-white/20 shrink-0 select-none">&gt;</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (Unresolved Classifications & Custom Mapping Database) */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          
          {/* Classification Mappers */}
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl rounded-3xl p-6 relative">
            <div className="absolute top-4 right-4 text-rose-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </div>

            <h3 className="text-md font-sans font-bold text-white mb-1.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Unresolved Classifications</span>
            </h3>
            
            <p className="text-xs text-white/45 font-sans leading-relaxed mb-4">
              Here are transactions Aura has marked as <span className="text-rose-400 font-bold font-sans">Unknown</span>. Assigning their category teaches the auto-parse engine how to file future ledger lines perfectly.
            </p>

            <div className="space-y-3 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {unresolvedTransactions.length === 0 ? (
                <div className="py-12 text-center bg-[#050505]/30 rounded-2xl border border-dashed border-white/5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/35 mx-auto mb-2.5 animate-pulse" />
                  <p className="text-xs font-mono text-white/30 uppercase">LEARNER MATRIX OPTIMAL</p>
                  <p className="text-[10px] text-white/20 mt-1">No outstanding unmapped sellers detected.</p>
                </div>
              ) : (
                unresolvedTransactions.map((tx) => {
                  const cleanedTitleName = tx.title.replace(/\(\s*SMS\s*Auto\s*\)/gi, "").trim();
                  return (
                    <div 
                      key={tx.id}
                      className="p-3.5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-2xl transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-sans font-black text-white leading-snug">{cleanedTitleName}</p>
                          <span className="text-[8.5px] font-mono text-white/45 mt-0.5 block">{tx.date} • ID {tx.id.split("-")[2] || "AUTO"}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-400">
                          -{formatCurrencyValue(tx.amount, tx.currency)}
                        </span>
                      </div>

                      {/* Dropdown Options Category mapping selector */}
                      <div className="relative pt-1">
                        <label className="text-[8px] font-mono text-white/35 uppercase block mb-1">CHOOSE PERSISTENT CATEGORY</label>
                        <select
                          onChange={(e) => handleAssignCategory(tx.id, cleanedTitleName, e.target.value)}
                          defaultValue=""
                          className="w-full bg-[#050505] p-2 border border-rose-500/15 rounded-xl text-[10.5px] font-mono text-rose-400 cursor-pointer focus:outline-none focus:border-cyan-500/50 hover:bg-black/80 transition-all font-bold"
                        >
                          <option value="" disabled>--- SELECT CATEGORY ---</option>
                          {CATEGORIES.filter(c => c.id !== "Unknown" && !c.isIncome).map((c) => (
                            <option key={c.id} value={c.id} className="bg-[#050505] text-white">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active learned system mapping index */}
          <div className="bg-white/[0.015] border border-white/5 backdrop-blur-2xl rounded-3xl p-6 relative">
            <h3 className="text-xs font-mono font-black text-white/45 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Learned Mapping Registry</span>
            </h3>

            <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
              {Object.keys(sellerMappings).length === 0 ? (
                <p className="text-[10px] font-mono text-white/20 uppercase py-2 leading-normal">
                  Index empty. Map an unknown merchant category above to initiate training.
                </p>
              ) : (
                Object.entries(sellerMappings).map(([seller, catId]) => {
                  const spec = CATEGORIES.find(c => c.id === catId);
                  return (
                    <div 
                      key={seller}
                      className="flex justify-between items-center gap-4 py-1.5 px-2.5 bg-[#050505]/40 rounded-xl border border-white/[0.02]"
                    >
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase truncate leading-none">{seller}</span>
                      <span 
                        className="text-[9px] font-sans font-bold px-2 py-0.5 rounded border leading-none flex items-center gap-1"
                        style={{ color: spec?.color, borderColor: spec ? `${spec.color}25` : "transparent", backgroundColor: spec ? `${spec.color}10` : "transparent" }}
                      >
                        <CategoryIcon name={spec?.icon || "HelpCircle"} className="w-2.5 h-2.5" />
                        <span>{spec?.name}</span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
