import { CategorySpec, Transaction } from "./types";

export const CATEGORIES: CategorySpec[] = [
  {
    id: "Food & Dining",
    name: "Food & Dining",
    color: "#10B981", // Emerald
    icon: "Utensils",
    glowClass: "shadow-emerald-500/20",
  },
  {
    id: "Shopping",
    name: "Shopping",
    color: "#3B82F6", // Blue
    icon: "ShoppingBag",
    glowClass: "shadow-blue-500/20",
  },
  {
    id: "Housing & Rent",
    name: "Housing & Rent",
    color: "#F59E0B", // Amber
    icon: "Home",
    glowClass: "shadow-amber-500/20",
  },
  {
    id: "Entertainment",
    name: "Entertainment",
    color: "#8B5CF6", // Purple
    icon: "Tv",
    glowClass: "shadow-purple-500/20",
  },
  {
    id: "Transportation",
    name: "Transportation",
    color: "#EC4899", // Pink
    icon: "Car",
    glowClass: "shadow-pink-500/20",
  },
  {
    id: "Health & Gym",
    name: "Health & Gym",
    color: "#06B6D4", // Cyan
    icon: "Activity",
    glowClass: "shadow-cyan-500/20",
  },
  {
    id: "GROCERY",
    name: "GROCERY",
    color: "#10B981", // Emerald
    icon: "Apple",
    glowClass: "shadow-emerald-500/20",
  },
  {
    id: "Income",
    name: "Income",
    color: "#10B981", // Emerald
    icon: "TrendingUp",
    glowClass: "shadow-emerald-500/20",
    isIncome: true,
  },
  {
    id: "Rent Inflow",
    name: "Rent",
    color: "#22C55E", // Green
    icon: "Home",
    glowClass: "shadow-emerald-500/20",
    isIncome: true,
  },
  {
    id: "Interest",
    name: "Interest",
    color: "#3B82F6", // Blue
    icon: "Percent",
    glowClass: "shadow-blue-500/20",
    isIncome: true,
  },
  {
    id: "Cashback",
    name: "Cashback",
    color: "#F59E0B", // Amber
    icon: "Sparkles",
    glowClass: "shadow-amber-500/20",
    isIncome: true,
  },
  {
    id: "Refund",
    name: "Refund",
    color: "#EC4899", // Pink
    icon: "RotateCcw",
    glowClass: "shadow-pink-500/20",
    isIncome: true,
  },
  {
    id: "Profit",
    name: "Profit",
    color: "#10B981", // Emerald
    icon: "Award",
    glowClass: "shadow-emerald-500/20",
    isIncome: true,
  },
  {
    id: "Investment",
    name: "Investment",
    color: "#8B5CF6", // Purple
    icon: "Briefcase",
    glowClass: "shadow-purple-500/20",
    isIncome: true,
  },
  {
    id: "Other",
    name: "Other",
    color: "#6B7280", // Gray
    icon: "Layers",
    glowClass: "shadow-gray-500/20",
  },
  {
    id: "Unknown",
    name: "Unknown / Uncategorized",
    color: "#F43F5E", // Rose/red
    icon: "AlertTriangle",
    glowClass: "shadow-rose-500/20",
  },
];

// Helper to get back full date relative to current year/month
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    title: "Monthly Corporate Salary",
    amount: 145000,
    type: "income",
    category: "Income",
    date: `${year}-${month}-01`,
    description: "Primary paycheck deposit via direct transfer",
    isRecurring: true,
    currency: "INR"
  },
  {
    id: "tx-2",
    title: "Freelance UI Design gig",
    amount: 1200,
    type: "income",
    category: "Income",
    date: `${year}-${month}-08`,
    description: "Milestone payment for design and development services",
    isRecurring: false,
    currency: "USD"
  },
  {
    id: "tx-3",
    title: "Eco City Apartment Rent",
    amount: 28000,
    type: "expense",
    category: "Housing & Rent",
    date: `${year}-${month}-01`,
    description: "Monthly lease payment plus utility cover fee",
    isRecurring: true,
    currency: "INR"
  },
  {
    id: "tx-4",
    title: "Organic Whole Foods Produce",
    amount: 145.50,
    type: "expense",
    category: "Food & Dining",
    date: `${year}-${month}-03`,
    description: "Multi-grain healthy groceries and bulk items",
    isRecurring: false,
    currency: "USD"
  },
  {
    id: "tx-5",
    title: "Aura Roast Coffee Bar",
    amount: 450,
    type: "expense",
    category: "Food & Dining",
    date: `${year}-${month}-04`,
    description: "Vanilla cold brew with house-baked pastry",
    isRecurring: false,
    currency: "INR"
  },
  {
    id: "tx-6",
    title: "Train Transit Pass",
    amount: 45,
    type: "expense",
    category: "Transportation",
    date: `${year}-${month}-05`,
    description: "Weekly rail system pass purchased abroad",
    isRecurring: false,
    currency: "EUR"
  },
  {
    id: "tx-7",
    title: "Starbucks Grind & Latte",
    amount: 380,
    type: "expense",
    category: "Food & Dining",
    date: `${year}-${month}-07`,
    description: "Grande double shot latte",
    isRecurring: false,
    currency: "INR"
  },
  {
    id: "tx-8",
    title: "Monthly Utility Power Grid",
    amount: 5200,
    type: "expense",
    category: "Housing & Rent",
    date: `${year}-${month}-09`,
    description: "Water and electric backup settlement",
    isRecurring: false,
    currency: "INR"
  },
  {
    id: "tx-9",
    title: "Netflix Ultra HD Plan",
    amount: 649,
    type: "expense",
    category: "Entertainment",
    date: `${year}-${month}-02`,
    description: "Monthly subscription package in local currency",
    isRecurring: true,
    currency: "INR"
  },
  {
    id: "tx-10",
    title: "Spotify Premium Duo",
    amount: 14.99,
    type: "expense",
    category: "Entertainment",
    date: `${year}-${month}-02`,
    description: "Shared audio premium subscription billed in USD",
    isRecurring: true,
    currency: "USD"
  },
  {
    id: "tx-11",
    title: "CrossFit Box Membership",
    amount: 4500,
    type: "expense",
    category: "Health & Gym",
    date: `${year}-${month}-04`,
    description: "Unlimited physical coaching monthly subscription",
    isRecurring: true,
    currency: "INR"
  },
  {
    id: "tx-12",
    title: "Airport Uber Ride",
    amount: 45,
    type: "expense",
    category: "Transportation",
    date: `${year}-${month}-06`,
    description: "Cab ride to terminal in USD",
    isRecurring: false,
    currency: "USD"
  },
  {
    id: "tx-13",
    title: "Tokyo Lined Shearling Coat",
    amount: 28000,
    type: "expense",
    category: "Shopping",
    date: `${year}-${month}-03`,
    description: "Heavy wool boutique jacket bought in JPY",
    isRecurring: false,
    currency: "JPY"
  },
  {
    id: "tx-14",
    title: "Apple iCloud Storage 2TB",
    amount: 9.99,
    type: "expense",
    category: "Shopping",
    date: `${year}-${month}-05`,
    description: "Cloud backup auto renew",
    isRecurring: true,
    currency: "USD"
  },
  {
    id: "tx-15",
    title: "Equinox Gym Water Bottle",
    amount: 3200,
    type: "expense",
    category: "Shopping",
    date: `${year}-${month}-10`,
    description: "Double insulated flask in INR",
    isRecurring: false,
    currency: "INR"
  }
];
