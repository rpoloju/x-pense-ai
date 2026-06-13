export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO String or YYYY-MM-DD
  description?: string;
  isRecurring?: boolean;
  currency?: string; // Optional code like 'INR', 'USD', 'EUR', etc.
  notes?: string; // Additional user-written notes
  tags?: string[]; // Custom tags for filtering
}

export interface Budget {
  category: string;
  limit: number;
}

export interface AICategoryInsight {
  category: string;
  insight: string;
  severity: "info" | "warning" | "optimal";
}

export interface AIActionableTip {
  title: string;
  description: string;
  estimatedSavings: number;
  challengeDays: number;
}

export interface AISuggestions {
  summary: string;
  burnRateStatus: "excellent" | "satisfactory" | "warning" | "critical";
  burnRateExplanation: string;
  categoryInsights: AICategoryInsight[];
  actionableTips: AIActionableTip[];
  savingsProjection: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface CategorySpec {
  id: string;
  name: string;
  color: string; // Hex or Tailwind color class
  icon: string;  // Name of Lucide icon
  glowClass: string; // Custom glow classes for visual elegance
  isIncome?: boolean; // True for deposit inflow classification
}

export interface CategorizationRule {
  id: string;
  keyword: string;
  category: string;
  type: TransactionType;
  tags?: string[];
  isActive: boolean;
}

export interface TreasuryPot {
  id: string;
  name: string;
  percent: number; // Slider ratio allocation
  color: string;
  icon: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  potId: string; // Backing pot
  deadline: string;
  isCompleted: boolean;
}

