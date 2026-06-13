# Aura Ledger — Complete Enterprise Feature Map

Aura Ledger is a highly stylized, high-fidelity personal and enterprise financial intelligence cockpit. Below is a comprehensive, production-grade map detailing each core module, dynamic utility, and interactive capability integrated into this platform.

---

## 1. Global Command Palette & Keyboard shortcuts System
*Access: Strike `Ctrl + K` (or `Cmd + K`) anywhere in the portal. Strike `?` to invoke the Cheat Sheet Panel directly.*
* **Console Command Bar (`Ctrl+K`)**: Opens a modal command console allowing rapid navigation, backups, data utilities, and syntax-based action posting.
* **Navigation Key Chords**: Hit `g` then strike a destination key to trigger instant, lag-free viewport pathing:
  * `g` → `d` : Cockpit Dashboard Portal
  * `g` → `t` : Treasury & Asset Pools
  * `g` → `l` : Cash Posting Ledger
  * `g` → `s` : SMS Linked Sync Log
  * `g` → `n` : Auditing Alerts
  * `g` → `b` : Limits & Budgets Controls
  * `g` → `c` : Financial Calculators Suite
  * `g` → `a` : Deep AI Advisor Engine
* **Command Syntax Parser**: Execute CLI-style commands inside the console:
  * `/add-expense [amount] [category] [title]` : Instantly record an outflow ledger transaction (e.g., `/add-expense 1250 Food Gourmet Bistro Dinner`).
  * `/add-income [amount] [category] [title]` : Record an inflow deposit transaction (e.g., `/add-income 25000 Consulting Client retainer payment`).
* **Multi-Format Enterprise Exports**:
  * `/export-xlsx` : Builds and downloads a highly styled Excel workbook using `exceljs` featuring professional borders, font hierarchies, auto-calculated dashboard statistics, metric profiles, and zebra-striped transaction log tables.
  * `/export-csv` : Compiles and downloads a standard comma-separated text file for raw data importing.
  * `/export-json` : Dumps the complete applet state (user settings, transaction array, metadata) into a JSON backup file to ensure portable local redundancy.
* **Portal Utilities**:
  * `/seed` : Resets or appends standard benchmark mockup transactions.
  * `/clear-ledger` : Purges all current ledger transactions from local storage for a blank state.
  * `/help` : Opens the keyboard cheat sheet help center.

---

## 2. Onboarding Portal & Intake Management
* **First-Time Setup**: Prompts new users to configure their preferred portal username before granting cockpit clearance.
* **Persistent Cache Locking**: Saves credentials, selected avatars, and state configurations in secure localized standard browser configurations (`localStorage`).
* **Dynamic Header Greetings**: Adapts time-sensitive welcome headers (e.g., "Good morning, [User]") alongside high-contrast secure profile identity banners.

---

## 3. High-Fidelity Cockpit Dashboard
* **Dynamic Key Performance Indicators (KPIs)**:
  * **Consolidated Cashpools (Liquid Balance)** : Tracks aggregate liquid balances in selected portal currencies.
  * **Dynamic Average Daily Burn** : Automatically calculates average daily outbound cash flow over active transaction cycles.
  * **Surplus Retention Margin** : Evaluates remaining income-retention margins to inspect financial durability.
* **Visual Data Visualizations**:
  * **Trend Breakdown Waves** : Interactive charts plotting inflow and outflow levels.
  * **Category Distribution Doughnuts** : Visual charts grouping transactions into categorized colored sectors (Food, Rent, Shopping, Transport, Income sources, etc.).
* **Quick Access Log**: Lists active, scrollable recent transaction postings with search and quick actions.

---

## 4. Treasury & Asset Pools Simulator
* **Virtual Asset Allocation**: Lock and partition capital into dedicated segregated virtual treasury pots (e.g., *Emergency Cash*, *Business Runway*, *Crypto Ventures*) preventing daily liquid pool blending.
* **Predictive Cashflow Burn Trajectory**: Displays a multi-regime simulation charting balances forward (30, 60, or 90 days):
  * **Status Quo Projection** : Standard burn projection using the current average daily burn rate.
  * **Optimized Frugal Projection** : Simulates a tighter 30% reduction in daily expenditures.
  * **Overloaded Scaling Projection** : Simulates a 40% peak spike to pressure-test runway timelines.
* **Critical Runway Indicators**: Calculates precise expiration countdown timelines for each scenarios to issue redline warning thresholds transparently.

---

## 5. Cash Posting Ledger (Transaction Log)
* **Comprehensive Audit Table**: Detailed rows showcasing transaction titles, precise UTC dates, categories, notes, tags, and currency markers.
* **Interactive Filtering Operations**:
  * Real-time search across transaction titles, memos, and descriptions.
  * Filter postings by Transaction Type (Income vs. Expense) or custom categories.
  * Multi-select filtration by associated custom labels and tags.
* **Direct Hand-Posting**: Form with real-time numeric verification, currency conversion matching, recurring schedule declarations, note memos, and tagging selectors.

---

## 6. SMS Linked Sync Log (Automated Parsing Engine)
* **Simulated Device Inbox Feed**: Displays an inbox matching physical banking and UPI receipts received via SMS characters.
* **RegEx Automated Scanning Engine**: Parses text logs in real-time to locate transactions matching deposit or withdrawal keywords.
* **Dynamic Information Extraction**: Automatically extracts transfer values, UPI reference keys, transaction dates, and categories.
* **Manual Verification Controls**: Single-click posting allows users to review, confirm details, and append parsed transactions directly onto the cash posting ledger.

---

## 7. Budget Limits & Category Controls
* **Threshold Triggers**: Set upper boundaries for individual expense categories (e.g., limit *Entertainment* or *Food* budgets).
* **Interactive Alert Rings**: Renders visual alert meters comparing real-time spend curves against predefined limits.
* **Audited Status Flags**: Labels categories as `Safe` (under 75%), `Saturated` (75%–100%), or `Over Limit` (>100%) alongside visual notifications.

---

## 8. Auditing Alerts Hub & Notifications Centre
* **Weekly Performance Digest**: Generates structured safety summaries plotting current weekly spend parameters against safety thresholds.
* **Budget Warning Flags**: Transmits real-time warnings whenever expenditures breach categorical targets.
* **High-Value Transaction Flags**: Automatically tags and logs large transactional anomalies for immediate audit review.

---

## 9. Financial Suite & Indian Tax Calculators
* **Indian GST Billing Calculator**: Generates standard commercial estimates dividing gross base values into Central GST (CGST) and State GST (SGST) values matching regional criteria.
* **Wholesome New Tax Regime Engine (FY 2025-26 & FY 2026-27)**: Dedicated income tax calculator centered strictly on the New Tax Regime which handles standard and newly extended tax exemptions:
  * **Standard Salaried Deduction**: Automatically applies the standard deduction of ₹75,000 for pensioners and salaried individuals.
  * **Corporate Perk Exemptions**: Supports tax-exempt employer NPS contributions under Section 80CCD(2) (calculates their maximum legal cap based on salary), Sodexo/meal vouchers (up to ₹26,400), children education/hostel allowances (up to ₹9,600), and official duty expense reimbursements.
  * **Retirement & Resignation Exemptions**: Supports tax-exempt caps on Gratuity (up to ₹25 Lakhs), Leave Encashment on retirement (up to ₹25 Lakhs), and Voluntary Retirement Scheme (VRS) compensation (up to ₹5 Lakhs).
  * **Ancillary & Passive House Property Margins**: Allows offsetting passive let-out home loan interest against landlord tenant rent.
  * **State-of-the-Art Visual Analytics**: Renders real-time, interactive progression meters displaying exact income distributions and tax liabilities across each official tax bracket.

---

## 10. AI Advisor Deep Engine
* **Bespoke Financial Consultant Chatbot**: Integrated chat console linked to a server-side Gemini API.
* **Real-time Live Context Matching**: Automatically bundles the user's localized transaction logs, active portfolios, category breakdowns, and active budgets into the system prompt context.
* **Automated Blueprinting**: Generates actionable, context-aware financial suggestions, tax advisory mitigation files, or custom enterprise budget plans based on real ledger coordinates.
