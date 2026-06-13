export interface CurrencySpec {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencySpec[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" }
];

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  INR: 1.0,
  USD: 0.0119, // 1 INR = 0.0119 USD
  EUR: 0.0111, // 1 INR = 0.0111 EUR
  GBP: 0.0093, // 1 INR = 0.0093 GBP
  JPY: 1.87    // 1 INR = 1.87 JPY
};

/**
 * Converts any amount from `from` currency to `to` currency based on standard INR-base exchange rates.
 */
export function convertAmount(
  amount: number,
  from: string = "INR",
  to: string = "INR",
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): number {
  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();
  if (fromCode === toCode) return amount;

  const fromRate = rates[fromCode] || DEFAULT_EXCHANGE_RATES[fromCode] || 1;
  const toRate = rates[toCode] || DEFAULT_EXCHANGE_RATES[toCode] || 1;

  // Convert from source currency to INR base, then to target currency
  const amountInINR = amount / fromRate;
  return amountInINR * toRate;
}

/**
 * Format a formatted currency value with symbol and correct decimal places
 */
export function formatCurrencyValue(amount: number, currencyCode: string = "INR"): string {
  const spec = CURRENCIES.find(c => c.code.toUpperCase() === currencyCode.toUpperCase()) || { symbol: "₹" };
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${spec.symbol}${formatted}`;
}
