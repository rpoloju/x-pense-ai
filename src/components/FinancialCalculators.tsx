import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calculator, 
  Percent, 
  TrendingUp, 
  Coins, 
  ShieldAlert, 
  Scale, 
  ArrowRight, 
  Table, 
  DollarSign, 
  Info,
  Calendar,
  Hourglass,
  ArrowUpRight,
  TrendingDown,
  PercentSquare
} from "lucide-react";
import { convertAmount, formatCurrencyValue, CURRENCIES } from "../utils/currencyUtils";

interface FinancialCalculatorsProps {
  displayCurrency: string;
  exchangeRates: Record<string, number>;
}

type CalculatorType = 
  | "fire" 
  | "sip" 
  | "stepup_sip" 
  | "swp" 
  | "swp_infl" 
  | "fd" 
  | "rd" 
  | "compound" 
  | "tax";

export function FinancialCalculators({ displayCurrency, exchangeRates }: FinancialCalculatorsProps) {
  const [activeCalc, setActiveCalc] = useState<CalculatorType>("fire");

  // Calculators definitions
  const calculators = [
    { id: "fire", label: "FIRE Retirement", icon: Hourglass, desc: "Financial Independence, Retire Early milestone calculations" },
    { id: "sip", label: "SIP Calculator", icon: TrendingUp, desc: "Systematic Investment Plan growth projections" },
    { id: "stepup_sip", label: "Step-up SIP", icon: ArrowUpRight, desc: "SIP growth featuring annual progressive contributions" },
    { id: "swp", label: "SWP Withdrawal", icon: TrendingDown, desc: "Regular withdrawals from a fixed-compounded corpus" },
    { id: "swp_infl", label: "SWP Tracker (Inflation)", icon: Coins, desc: "SWP compounding with progressive cost-of-living adjustments" },
    { id: "fd", label: "Fixed Deposit (FD)", icon: Calculator, desc: "Low-risk lumpsum compounding with multiple frequencies" },
    { id: "rd", label: "Recurring Deposit", icon: Calendar, desc: "Quarterly compounded regular saving plan" },
    { id: "compound", label: "Compound Interest", icon: Percent, desc: "Compound returns on primary reserves & routine refills" },
    { id: "tax", label: "Indian Income Tax", icon: Scale, desc: "Comparative assessment of FY 2026-27 tax regimes" },
  ];

  // 1. FIRE Calculator State
  const [fireCurrentAge, setFireCurrentAge] = useState(28);
  const [fireRetireAge, setFireRetireAge] = useState(45);
  const [fireLifeExpectancy, setFireLifeExpectancy] = useState(85);
  const [fireMonthlyExpense, setFireMonthlyExpense] = useState(50000); // in displayCurrency
  const [fireInflation, setFireInflation] = useState(6.0);
  const [firePreReturn, setFirePreReturn] = useState(12.0);
  const [firePostReturn, setFirePostReturn] = useState(8.0);
  const [fireCurrentPortfolio, setFireCurrentPortfolio] = useState(500000); // in displayCurrency

  // 2. SIP Calculator State
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipRate, setSipRate] = useState(12.0);
  const [sipYears, setSipYears] = useState(15);

  // 3. Step-up SIP State
  const [stepupMonthly, setStepupMonthly] = useState(10000);
  const [stepupRate, setStepupRate] = useState(12.0);
  const [stepupYears, setStepupYears] = useState(15);
  const [stepupPercentage, setStepupPercentage] = useState(10);

  // 4. SWP State
  const [swpInitial, setSwpInitial] = useState(1000000);
  const [swpWithdrawal, setSwpWithdrawal] = useState(10000);
  const [swpRate, setSwpRate] = useState(8.0);
  const [swpYears, setSwpYears] = useState(15);

  // 5. SWP Inflation State
  const [swpInflInitial, setSwpInflInitial] = useState(1000000);
  const [swpInflWithdrawal, setSwpInflWithdrawal] = useState(10000);
  const [swpInflRate, setSwpInflRate] = useState(8.0);
  const [swpInflInflation, setSwpInflInflation] = useState(6.0);
  const [swpInflYears, setSwpInflYears] = useState(15);

  // 6. FD State
  const [fdPrincipal, setFdPrincipal] = useState(100000);
  const [fdRate, setFdRate] = useState(7.1);
  const [fdYears, setFdYears] = useState(5);
  const [fdCompounding, setFdCompounding] = useState(4); // 4 = Quarterly, 12 = Monthly, 2 = Half-yearly, 1 = Yearly

  // 7. RD State
  const [rdMonthly, setRdMonthly] = useState(5000);
  const [rdRate, setRdRate] = useState(6.8);
  const [rdYears, setRdYears] = useState(5);

  // 8. Compound Interest State
  const [ciPrincipal, setCiPrincipal] = useState(100000);
  const [ciMonthly, setCiMonthly] = useState(5000);
  const [ciRate, setCiRate] = useState(10.0);
  const [ciYears, setCiYears] = useState(10);
  const [ciCompounding, setCiCompounding] = useState(12); // compounding per year

  // 9. Tax State (Values strictly in INR since it's the Indian Tax Code)
  const [taxSalary, setTaxSalary] = useState(1200000);
  const [taxOther, setTaxOther] = useState(100000);
  const [taxIsSalaried, setTaxIsSalaried] = useState(true);
  const [tax80C, setTax80C] = useState(150000);
  const [tax80D, setTax80D] = useState(25000);
  const [taxHomeLoanRent, setTaxHomeLoanRent] = useState(100000); // 80GG or Rent HRA Exemption / 24(b) Home loan
  const [taxSection10, setTaxSection10] = useState(50000); // standard professional tax, LTA etc.

  // --- CALCULATION LOGICS ---

  // 1. FIRE Calculator Computations
  const fireResults = useMemo(() => {
    const yearsToRetire = Math.max(1, fireRetireAge - fireCurrentAge);
    const yearsInRetirement = Math.max(1, fireLifeExpectancy - fireRetireAge);

    // Inflated monthly expense at retirement point
    const inflatedExpMonthly = fireMonthlyExpense * Math.pow(1 + fireInflation / 100, yearsToRetire);
    const inflatedExpAnnual = inflatedExpMonthly * 12;

    // Year-by-year depletion model during retirement to compute exact Net Present Value (NPV) required corpus
    let requiredCorpus = 0;
    let withdrawal = inflatedExpAnnual;
    const depletionSchedule: { age: number; balanceStart: number; withdraw: number; growth: number; balanceEnd: number }[] = [];

    // Working back from retirement year 1 to final life expectancy year
    let currentWithdrawal = inflatedExpAnnual;
    for (let yr = 1; yr <= yearsInRetirement; yr++) {
      requiredCorpus += currentWithdrawal / Math.pow(1 + firePostReturn / 100, yr - 1);
      currentWithdrawal *= (1 + fireInflation / 100);
    }

    // Now model pre-retirement growth of current portfolio
    const currentPortfolioAtRetirement = fireCurrentPortfolio * Math.pow(1 + firePreReturn / 100, yearsToRetire);
    const deficitAtRetirement = Math.max(0, requiredCorpus - currentPortfolioAtRetirement);

    // Monthly Savings required pre-retirement to fill the gap (Sinking deposit ordinary annuity rule)
    const monthlyPreRate = firePreReturn / 12 / 100;
    const preMonths = yearsToRetire * 12;
    const sipFvFactor = ((Math.pow(1 + monthlyPreRate, preMonths) - 1) / monthlyPreRate) * (1 + monthlyPreRate);
    const requiredSipMonthly = deficitAtRetirement / sipFvFactor;

    // Simulation trajectory from now to end-of-life
    const trajectory: { age: number; totalCorpus: number; isRetiree: boolean }[] = [];
    const detailedYears: { age: number; yearNum: number; saving: number; withdrawal: number; returnGained: number; yearEndCorpus: number; isRetiree: boolean }[] = [];

    let activeCorpus = fireCurrentPortfolio;
    const annualSipSaved = requiredSipMonthly * 12;

    // Pre-retirement phase
    for (let y = 1; y <= yearsToRetire; y++) {
      const age = fireCurrentAge + y;
      const startCorpus = activeCorpus;
      // Monthly simulation under pre-retirement returns
      let corpusAccumulated = startCorpus;
      for (let m = 0; m < 12; m++) {
        corpusAccumulated = (corpusAccumulated + requiredSipMonthly) * (1 + monthlyPreRate);
      }
      const growthEarned = corpusAccumulated - startCorpus - (requiredSipMonthly * 12);
      activeCorpus = corpusAccumulated;

      trajectory.push({ age, totalCorpus: activeCorpus, isRetiree: false });
      detailedYears.push({
        age,
        yearNum: y,
        saving: requiredSipMonthly * 12,
        withdrawal: 0,
        returnGained: growthEarned,
        yearEndCorpus: activeCorpus,
        isRetiree: false
      });
    }

    // Post-retirement phase
    let postRetireCorpus = activeCorpus;
    let inflatedWithdrawalCur = inflatedExpAnnual;
    for (let yr = 1; yr <= yearsInRetirement; yr++) {
      const age = fireRetireAge + yr;
      const startCorpus = postRetireCorpus;

      if (postRetireCorpus > 0) {
        // withdrawal is at beginning of year
        const afterWithdrawal = Math.max(0, postRetireCorpus - inflatedWithdrawalCur);
        const growth = afterWithdrawal * (firePostReturn / 100);
        postRetireCorpus = afterWithdrawal + growth;

        trajectory.push({ age, totalCorpus: postRetireCorpus, isRetiree: true });
        detailedYears.push({
          age,
          yearNum: yearsToRetire + yr,
          saving: 0,
          withdrawal: inflatedWithdrawalCur,
          returnGained: growth,
          yearEndCorpus: postRetireCorpus,
          isRetiree: true
        });

        // Inflate cost of living for next year
        inflatedWithdrawalCur *= (1 + fireInflation / 100);
      } else {
        postRetireCorpus = 0;
        trajectory.push({ age, totalCorpus: 0, isRetiree: true });
        detailedYears.push({
          age,
          yearNum: yearsToRetire + yr,
          saving: 0,
          withdrawal: 0,
          returnGained: 0,
          yearEndCorpus: 0,
          isRetiree: true
        });
      }
    }

    return {
      yearsToRetire,
      yearsInRetirement,
      inflatedExpMonthly,
      inflatedExpAnnual,
      requiredCorpus,
      currentPortfolioAtRetirement,
      deficitAtRetirement,
      requiredSipMonthly,
      trajectory,
      detailedYears
    };
  }, [fireCurrentAge, fireRetireAge, fireLifeExpectancy, fireMonthlyExpense, fireInflation, firePreReturn, firePostReturn, fireCurrentPortfolio]);

  // 2. SIP Computations
  const sipResults = useMemo(() => {
    const monthlyRate = sipRate / 12 / 100;
    const months = sipYears * 12;
    const futureValue = sipMonthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const totalInvested = sipMonthly * months;
    const wealthGained = futureValue - totalInvested;

    // Trajectory mapping
    const detailedYears: { year: number; investment: number; corpus: number; interestGained: number }[] = [];
    let currentCorpus = 0;
    for (let y = 1; y <= sipYears; y++) {
      const investedTillNow = sipMonthly * 12 * y;
      for (let m = 0; m < 12; m++) {
        currentCorpus = (currentCorpus + sipMonthly) * (1 + monthlyRate);
      }
      detailedYears.push({
        year: y,
        investment: investedTillNow,
        corpus: currentCorpus,
        interestGained: currentCorpus - investedTillNow
      });
    }

    return {
      totalInvested,
      wealthGained,
      futureValue,
      detailedYears
    };
  }, [sipMonthly, sipRate, sipYears]);

  // 3. Step-up SIP Computations
  const stepupResults = useMemo(() => {
    let currentMonthly = stepupMonthly;
    let totalInvested = 0;
    let futureValue = 0;
    const detailedYears: { year: number; monthlyAmt: number; investment: number; corpus: number; interestGained: number }[] = [];

    const monthlyRate = stepupRate / 12 / 100;

    for (let y = 1; y <= stepupYears; y++) {
      let annualInvestment = 0;
      const startCorpus = futureValue;
      for (let m = 0; m < 12; m++) {
        totalInvested += currentMonthly;
        annualInvestment += currentMonthly;
        futureValue = (futureValue + currentMonthly) * (1 + monthlyRate);
      }
      
      detailedYears.push({
        year: y,
        monthlyAmt: currentMonthly,
        investment: totalInvested,
        corpus: futureValue,
        interestGained: futureValue - totalInvested
      });

      // Apply annual percentage step-up
      currentMonthly = currentMonthly * (1 + stepupPercentage / 100);
    }

    return {
      totalInvested,
      wealthGained: futureValue - totalInvested,
      futureValue,
      detailedYears
    };
  }, [stepupMonthly, stepupRate, stepupYears, stepupPercentage]);

  // 4. SWP Computations
  const swpResults = useMemo(() => {
    let currentBalance = swpInitial;
    let totalWithdrawn = 0;
    const monthlyRate = swpRate / 12 / 100;
    const months = swpYears * 12;
    const detailedYears: { year: number; startingCorpus: number; withdrawal: number; interestGained: number; endingCorpus: number }[] = [];

    for (let y = 1; y <= swpYears; y++) {
      const startYearCorpus = currentBalance;
      let yearlyWithdrawn = 0;
      let yearlyInterest = 0;

      for (let m = 0; m < 12; m++) {
        if (currentBalance > 0) {
          // Accumulate interest
          const interest = currentBalance * monthlyRate;
          yearlyInterest += interest;
          currentBalance += interest;

          // Withdraw
          const toWithdraw = Math.min(currentBalance, swpWithdrawal);
          currentBalance -= toWithdraw;
          yearlyWithdrawn += toWithdraw;
          totalWithdrawn += toWithdraw;
        } else {
          currentBalance = 0;
        }
      }

      detailedYears.push({
        year: y,
        startingCorpus: startYearCorpus,
        withdrawal: yearlyWithdrawn,
        interestGained: yearlyInterest,
        endingCorpus: currentBalance
      });
    }

    return {
      totalWithdrawn,
      endingBalance: currentBalance,
      detailedYears
    };
  }, [swpInitial, swpWithdrawal, swpRate, swpYears]);

  // 5. SWP Inflation Computations
  const swpInflResults = useMemo(() => {
    let currentBalance = swpInflInitial;
    let totalWithdrawn = 0;
    let activeMonthlyWithdrawal = swpInflWithdrawal;
    const monthlyRate = swpInflRate / 12 / 100;
    const detailedYears: { year: number; currentMonthlyWithdrawal: number; startingCorpus: number; withdrawal: number; interestGained: number; endingCorpus: number }[] = [];

    for (let y = 1; y <= swpInflYears; y++) {
      const startYearCorpus = currentBalance;
      let yearlyWithdrawn = 0;
      let yearlyInterest = 0;

      for (let m = 0; m < 12; m++) {
        if (currentBalance > 0) {
          const interest = currentBalance * monthlyRate;
          yearlyInterest += interest;
          currentBalance += interest;

          const toWithdraw = Math.min(currentBalance, activeMonthlyWithdrawal);
          currentBalance -= toWithdraw;
          yearlyWithdrawn += toWithdraw;
          totalWithdrawn += toWithdraw;
        } else {
          currentBalance = 0;
        }
      }

      detailedYears.push({
        year: y,
        currentMonthlyWithdrawal: activeMonthlyWithdrawal,
        startingCorpus: startYearCorpus,
        withdrawal: yearlyWithdrawn,
        interestGained: yearlyInterest,
        endingCorpus: currentBalance
      });

      // Inflate withdrawal cost for the next year
      activeMonthlyWithdrawal *= (1 + swpInflInflation / 100);
    }

    return {
      totalWithdrawn,
      endingBalance: currentBalance,
      detailedYears
    };
  }, [swpInflInitial, swpInflWithdrawal, swpInflRate, swpInflInflation, swpInflYears]);

  // 6. FD Computations
  const fdResults = useMemo(() => {
    // Formula for FD compounded f times/year: FV = P * (1 + r/f)^(f * t)
    const timesPerYear = fdCompounding;
    const totalPeriods = timesPerYear * fdYears;
    const futureValue = fdPrincipal * Math.pow(1 + (fdRate / 100) / timesPerYear, totalPeriods);
    const interestEarned = futureValue - fdPrincipal;

    const detailedYears: { year: number; compoundingStart: number; interestEarned: number; compoundingEnd: number }[] = [];
    let currentCapital = fdPrincipal;

    for (let y = 1; y <= fdYears; y++) {
      const yrStart = currentCapital;
      const yrEnd = fdPrincipal * Math.pow(1 + (fdRate / 100) / timesPerYear, timesPerYear * y);
      const yrInterestIncurred = yrEnd - yrStart;
      currentCapital = yrEnd;

      detailedYears.push({
        year: y,
        compoundingStart: yrStart,
        interestEarned: yrInterestIncurred,
        compoundingEnd: currentCapital
      });
    }

    return {
      maturityValue: futureValue,
      interestEarned,
      detailedYears
    };
  }, [fdPrincipal, fdRate, fdYears, fdCompounding]);

  // 7. RD Computations (Quarterly compounding of recurring deposits - Standard Indian Banking Formula)
  const rdResults = useMemo(() => {
    // Formula: Maturity Value = Sum of each monthly contribution compounded quarterly till maturity
    const totalMonths = rdYears * 12;
    let maturityValue = 0;
    const totalInvested = rdMonthly * totalMonths;

    for (let i = 1; i <= totalMonths; i++) {
      const monthsCompounded = totalMonths - i + 1;
      const quartersCompounded = monthsCompounded / 3;
      maturityValue += rdMonthly * Math.pow(1 + rdRate / 400, quartersCompounded);
    }

    const detailedYears: { year: number; monthlyDeposit: number; totalContributionsYtd: number; endingValue: number; interestGained: number }[] = [];
    let runningInvested = 0;

    for (let y = 1; y <= rdYears; y++) {
      const activeMonthsYtd = y * 12;
      runningInvested = rdMonthly * activeMonthsYtd;
      let activeMaturityValueYtd = 0;

      for (let i = 1; i <= activeMonthsYtd; i++) {
        const mc = activeMonthsYtd - i + 1;
        const qc = mc / 3;
        activeMaturityValueYtd += rdMonthly * Math.pow(1 + rdRate / 400, qc);
      }

      detailedYears.push({
        year: y,
        monthlyDeposit: rdMonthly,
        totalContributionsYtd: runningInvested,
        endingValue: activeMaturityValueYtd,
        interestGained: activeMaturityValueYtd - runningInvested
      });
    }

    return {
      totalInvested,
      maturityValue,
      interestEarned: maturityValue - totalInvested,
      detailedYears
    };
  }, [rdMonthly, rdRate, rdYears]);

  // 8. Compound Interest Computations
  const ciResults = useMemo(() => {
    let runningBalance = ciPrincipal;
    let totalInvested = ciPrincipal;
    const detailedYears: { year: number; principalStart: number; contributions: number; interestEarned: number; balanceEnd: number }[] = [];

    // Compounding times annually
    const compoundsPerMonth = ciCompounding / 12;

    for (let y = 1; y <= ciYears; y++) {
      const yStart = runningBalance;
      let yContributions = 0;

      for (let m = 0; m < 12; m++) {
        // Contribution placed at the start of the month
        runningBalance += ciMonthly;
        yContributions += ciMonthly;
        totalInvested += ciMonthly;

        // Compound interest for the month
        const monthlyMultiplier = Math.pow(1 + (ciRate / 100 / ciCompounding), compoundsPerMonth);
        runningBalance *= monthlyMultiplier;
      }

      const yInterest = runningBalance - yStart - yContributions;

      detailedYears.push({
        year: y,
        principalStart: yStart,
        contributions: yContributions,
        interestEarned: yInterest,
        balanceEnd: runningBalance
      });
    }

    return {
      totalInvested,
      compoundInterest: runningBalance - totalInvested,
      futureValue: runningBalance,
      detailedYears
    };
  }, [ciPrincipal, ciMonthly, ciRate, ciYears, ciCompounding]);

  // 9. Indian Income Tax Computations (Comparative Old vs New Regime - FY 2026-27 rules)
  const taxResults = useMemo(() => {
    // Total income
    const grossIncome = taxSalary + taxOther;

    // --- NEW REGIME CALCS ---
    // Standard deduction under New regime for FY 2026-27 remains Rs 75,000 for salaried
    const stdDeductionNew = taxIsSalaried ? 75000 : 0;
    const taxableNew = Math.max(0, grossIncome - stdDeductionNew);

    // Calculate tax under New Regime slabs:
    // Up to 3,00,000 - Nil
    // 3,00,001 - 7,00,000 - 5%
    // 7,00,001 - 10,00,000 - 10%
    // 10,00,001 - 12,00,000 - 15%
    // 12,00,001 - 15,00,000 - 20%
    // Above 15,00,000 - 30%
    let calculatedTaxNew = 0;
    const newSlabBreakdowns: { slab: string; rate: number; taxableAmt: number; tax: number }[] = [];

    const newSlabs = [
      { min: 0, max: 300000, rate: 0 },
      { min: 300000, max: 700000, rate: 5 },
      { min: 700000, max: 1000000, rate: 10 },
      { min: 1000000, max: 1200000, rate: 15 },
      { min: 1200000, max: 1500000, rate: 20 },
      { min: 1500000, max: Infinity, rate: 30 }
    ];

    let tempNew = taxableNew;
    newSlabs.forEach(slab => {
      const range = slab.max - slab.min;
      if (taxableNew > slab.min) {
        const taxableInSlab = Math.min(range, taxableNew - slab.min);
        const taxInSlab = (taxableInSlab * slab.rate) / 100;
        calculatedTaxNew += taxInSlab;
        newSlabBreakdowns.push({
          slab: slab.max === Infinity ? `Above ₹${slab.min.toLocaleString("en-IN")}` : `₹${slab.min.toLocaleString("en-IN")} - ₹${slab.max.toLocaleString("en-IN")}`,
          rate: slab.rate,
          taxableAmt: taxableInSlab,
          tax: taxInSlab
        });
      } else {
        newSlabBreakdowns.push({
          slab: slab.max === Infinity ? `Above ₹${slab.min.toLocaleString("en-IN")}` : `₹${slab.min.toLocaleString("en-IN")} - ₹${slab.max.toLocaleString("en-IN")}`,
          rate: slab.rate,
          taxableAmt: 0,
          tax: 0
        });
      }
    });

    // Rebate under Section 87A: If net taxable income <= Rs 7,00,000 under New Regime, the tax rebate is 100%, up to Rs 20,000.
    // Plus marginal relief check standardly applied: if taxable income slightly exceeds 7L
    let rebateNew = 0;
    if (taxableNew <= 700000) {
      rebateNew = calculatedTaxNew;
    } else {
      // Marginal relief: tax liability cannot exceed the income exceeding ₹7 Lakhs.
      // Net Income minus ₹7 Lakhs is the delta.
      const incomeExceeding7L = taxableNew - 700000;
      if (calculatedTaxNew > incomeExceeding7L) {
        rebateNew = calculatedTaxNew - incomeExceeding7L;
      }
    }

    const netTaxBeforeCessNew = Math.max(0, calculatedTaxNew - rebateNew);
    const cessNew = netTaxBeforeCessNew * 0.04;
    const finalTaxNew = netTaxBeforeCessNew + cessNew;


    // --- OLD REGIME CALCS ---
    // Deductions under Old regime: 80C (max 1.5L), 80D (max 75k overall here), Home loan Rent (limitless but let's deduct whatever is input), section 10 standard.
    // Standard deduction inside old regime is 50,050 for salaried
    const stdDeductionOld = taxIsSalaried ? 50000 : 0;
    const deductionsTotal = Math.min(150000, tax80C) + Math.min(75000, tax80D) + taxHomeLoanRent + taxSection10 + stdDeductionOld;
    const taxableOld = Math.max(0, grossIncome - deductionsTotal);

    // Old Slabs:
    // Up to 2,50,000 - Nil
    // 2,50,001 - 5,00,000 - 5%
    // 5,00,001 - 10,00,000 - 20%
    // Above 10,00,000 - 30%
    let calculatedTaxOld = 0;
    const oldSlabBreakdowns: { slab: string; rate: number; taxableAmt: number; tax: number }[] = [];

    const oldSlabs = [
      { min: 0, max: 250000, rate: 0 },
      { min: 250000, max: 500000, rate: 5 },
      { min: 500000, max: 1000000, rate: 20 },
      { min: 1000000, max: Infinity, rate: 30 }
    ];

    oldSlabs.forEach(slab => {
      const range = slab.max - slab.min;
      if (taxableOld > slab.min) {
        const taxableInSlab = Math.min(range, taxableOld - slab.min);
        const taxInSlab = (taxableInSlab * slab.rate) / 100;
        calculatedTaxOld += taxInSlab;
        oldSlabBreakdowns.push({
          slab: slab.max === Infinity ? `Above ₹${slab.min.toLocaleString("en-IN")}` : `₹${slab.min.toLocaleString("en-IN")} - ₹${slab.max.toLocaleString("en-IN")}`,
          rate: slab.rate,
          taxableAmt: taxableInSlab,
          tax: taxInSlab
        });
      } else {
        oldSlabBreakdowns.push({
          slab: slab.max === Infinity ? `Above ₹${slab.min.toLocaleString("en-IN")}` : `₹${slab.min.toLocaleString("en-IN")} - ₹${slab.max.toLocaleString("en-IN")}`,
          rate: slab.rate,
          taxableAmt: 0,
          tax: 0
        });
      }
    });

    // Rebate Section 87A Old Regime: Tax rebate up to ₹12,500 if taxable income <= 5,00,000
    let rebateOld = 0;
    if (taxableOld <= 500000) {
      rebateOld = Math.min(calculatedTaxOld, 12500);
    }

    const netTaxBeforeCessOld = Math.max(0, calculatedTaxOld - rebateOld);
    const cessOld = netTaxBeforeCessOld * 0.04;
    const finalTaxOld = netTaxBeforeCessOld + cessOld;

    const netSaved = Math.abs(finalTaxOld - finalTaxNew);
    const recommendation = finalTaxNew < finalTaxOld 
      ? `New Regime is hyper-optimal for you, preserving ₹${Math.round(netSaved).toLocaleString("en-IN")} in additional net liquidity!`
      : finalTaxOld < finalTaxNew 
        ? `Old Regime is more optimal by ₹${Math.round(netSaved).toLocaleString("en-IN")} because of your high combined standard tax deductions.`
        : "Both tax regimes compute equivalent tax output.";

    return {
      grossIncome,
      taxableNew,
      calculatedTaxNew,
      rebateNew,
      cessNew,
      finalTaxNew,
      newSlabBreakdowns,
      deductionsTotal,
      taxableOld,
      calculatedTaxOld,
      rebateOld,
      cessOld,
      finalTaxOld,
      oldSlabBreakdowns,
      netSaved,
      recommendation
    };
  }, [taxSalary, taxOther, taxIsSalaried, tax80C, tax80D, taxHomeLoanRent, taxSection10]);

  // Layout animations helper
  const rightColumnAnimation = {
    initial: { opacity: 0, y: 15, filter: "blur(2px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0)" },
    exit: { opacity: 0, y: -15, filter: "blur(2px)" },
    transition: { duration: 0.25, ease: "easeOut" }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="financial-calculators-root">
      
      {/* LEFT COLUMN: SIDEBAR CALCULATORS NAVIGATION */}
      <div className="lg:col-span-4 space-y-4">
        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/10 text-[#00F5FF]">
              <Calculator className="w-5 h-5 animate-spinSlower" />
            </div>
            <div>
              <h2 className="text-md font-sans font-bold leading-tight text-white select-none uppercase tracking-tight">Smart Engines</h2>
              <p className="text-[10px] font-mono font-bold text-white/40 leading-none mt-1 select-none">QUANTITATIVE FINANCE SYSTEM</p>
            </div>
          </div>
          <p className="text-xs text-white/50 font-sans leading-relaxed mt-3">
            Simulate retirement horizons, tactical cost-of-living adjustments, compounded mutual fund growth, and comparative tax allocations using real-time formulas.
          </p>
        </div>

        {/* Desktop sidebar selector */}
        <div className="hidden lg:flex flex-col bg-white/[0.02] border border-white/5 p-2 rounded-3xl gap-1.5 shadow-xl">
          {calculators.map((calc) => {
            const Icon = calc.icon;
            const isActive = activeCalc === calc.id;
            return (
              <button
                key={calc.id}
                onClick={() => setActiveCalc(calc.id as CalculatorType)}
                className={`w-full px-4.5 py-3.5 rounded-2xl text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                  isActive 
                    ? "bg-[#00F5FF]/10 border border-[#00F5FF]/20 text-white shadow-lg" 
                    : "border border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.015]"
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${isActive ? "bg-[#00F5FF]/10 text-[#00F5FF]" : "bg-white/5 text-white/45"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className={`text-xs font-mono font-black uppercase leading-tight tracking-wide ${isActive ? "text-[#00F5FF]" : ""}`}>{calc.label}</div>
                  <div className="text-[10px] text-white/35 font-sans leading-tight mt-0.5 truncate">{calc.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile select dropdown */}
        <div className="block lg:hidden bg-white/[0.01] border border-white/5 p-4 rounded-3xl">
          <label className="block text-[9px] font-mono font-black text-white/40 uppercase tracking-widest mb-2 px-1">Choose Projection Engine</label>
          <select
            value={activeCalc}
            onChange={(e) => setActiveCalc(e.target.value as CalculatorType)}
            className="w-full bg-[#0c0c0c] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-cyan-455 font-mono focus:outline-none focus:border-[#00F5FF]/30 cursor-pointer"
          >
            {calculators.map((calc) => (
              <option key={calc.id} value={calc.id} className="bg-black text-white">{calc.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* RIGHT COLUMN: CALCULATOR INTERFACE & VISUALS */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCalc}
            {...rightColumnAnimation}
            className="space-y-6"
          >
            
            {/* 1. FIRE RETIREMENT CALCULATOR */}
            {activeCalc === "fire" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-[#00F5FF] font-bold uppercase tracking-widest">Horizon Estimator</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">FIRE Retirement Corpus</h3>
                    </div>
                    <Hourglass className="w-5 h-5 text-cyan-500 animate-pulse" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    {/* Input sliders */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Current Age</span>
                          <span className="text-[#00F5FF]">{fireCurrentAge} Years</span>
                        </div>
                        <input 
                          type="range" min="18" max={fireRetireAge - 1} value={fireCurrentAge} 
                          onChange={(e) => setFireCurrentAge(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Target Retirement Age</span>
                          <span className="text-[#00F5FF]">{fireRetireAge} Years</span>
                        </div>
                        <input 
                          type="range" min={fireCurrentAge + 1} max="75" value={fireRetireAge} 
                          onChange={(e) => setFireRetireAge(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Life Expectancy</span>
                          <span className="text-[#00F5FF]">{fireLifeExpectancy} Years</span>
                        </div>
                        <input 
                          type="range" min={fireRetireAge + 5} max="100" value={fireLifeExpectancy} 
                          onChange={(e) => setFireLifeExpectancy(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Current Monthly Expenses</span>
                          <span className="text-[#00F5FF]">{formatCurrencyValue(fireMonthlyExpense, displayCurrency)}</span>
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-[10px] font-mono text-white/30">{displayCurrency}</span>
                          <input 
                            type="number" value={fireMonthlyExpense} 
                            onChange={(e) => setFireMonthlyExpense(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-black/50 border border-white/5 rounded-xl pl-12 pr-4 py-2 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Expected Inflation Rate</span>
                          <span className="text-[#00F5FF]">{fireInflation}% / year</span>
                        </div>
                        <input 
                          type="range" min="1" max="15" step="0.5" value={fireInflation} 
                          onChange={(e) => setFireInflation(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Equities Yield (Pre-Retirement)</span>
                          <span className="text-[#00F5FF]">{firePreReturn}%</span>
                        </div>
                        <input 
                          type="range" min="4" max="25" step="0.5" value={firePreReturn} 
                          onChange={(e) => setFirePreReturn(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Post-Retirement Safe Yield</span>
                          <span className="text-[#00F5FF]">{firePostReturn}%</span>
                        </div>
                        <input 
                          type="range" min="3" max="15" step="0.5" value={firePostReturn} 
                          onChange={(e) => setFirePostReturn(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Current Portfolio Balance</span>
                          <span className="text-[#00F5FF]">{formatCurrencyValue(fireCurrentPortfolio, displayCurrency)}</span>
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-[10px] font-mono text-white/30">{displayCurrency}</span>
                          <input 
                            type="number" value={fireCurrentPortfolio} 
                            onChange={(e) => setFireCurrentPortfolio(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-black/50 border border-white/5 rounded-xl pl-12 pr-4 py-2 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FIRE Outputs block */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl space-y-1">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold leading-none">TARGET RETIREMENT CORPUS</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] block">{formatCurrencyValue(fireResults.requiredCorpus, displayCurrency)}</span>
                    <span className="text-[9.5px] text-white/30 block leading-tight">NPV needed to fund {fireResults.yearsInRetirement} years of inflation-adjusted life</span>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl space-y-1">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold leading-none">ESTIMATED DEFICIT</span>
                    <span className="text-xl font-bold font-mono text-rose-450 block">{formatCurrencyValue(fireResults.deficitAtRetirement, displayCurrency)}</span>
                    <span className="text-[9.5px] text-white/30 block leading-tight">Shortfall after current savings grow at {firePreReturn}% for {fireResults.yearsToRetire} years</span>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl space-y-1">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold leading-none">REQUIRED MONTHLY SIP REFILL</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 block">{formatCurrencyValue(fireResults.requiredSipMonthly, displayCurrency)}/mo</span>
                    <span className="text-[9.5px] text-white/30 block leading-tight">SIP required to cover deficit; inflation-adjusted monthly costs peak at {formatCurrencyValue(fireResults.inflatedExpMonthly, displayCurrency)}/mo</span>
                  </div>
                </div>

                {/* FIRE trajectory visual */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <span className="text-[9px] font-mono text-[#00F5FF] font-black uppercase tracking-widest block mb-4">CORPUS TRAJECTORY MOUNTAIN</span>
                  
                  {/* Custom SVG line representing retirement mountain */}
                  <div className="w-full h-44 relative bg-black/25 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                    {/* SVG renders the trajectory */}
                    <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {(() => {
                        const maxVal = Math.max(...fireResults.trajectory.map(t => t.totalCorpus), 1);
                        const points = fireResults.trajectory.map((t, index) => {
                          const x = (index / (fireResults.trajectory.length - 1)) * 100;
                          const y = 100 - (t.totalCorpus / maxVal) * 100;
                          return `${x},${y}`;
                        }).join(" ");
                        
                        return (
                          <>
                            {/* Area fill */}
                            <polygon 
                              points={`0,100 ${points} 100,100`} 
                              fill="url(#fireAreaGlow)" 
                              opacity="0.25"
                            />
                            {/* Line */}
                            <polyline 
                              points={points} 
                              fill="none" 
                              stroke="#00F5FF" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                            
                            <defs>
                              <linearGradient id="fireAreaGlow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00F5FF" />
                                <stop offset="100%" stopColor="#00F5FF" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                          </>
                        );
                      })()}
                    </svg>

                    <div className="flex justify-between w-full font-mono text-[9px] text-white/30 z-10 select-none pointer-events-none">
                      <span>Age {fireCurrentAge}</span>
                      <span className="text-[#00F5FF] font-bold">Retirement (Age {fireRetireAge})</span>
                      <span>Age {fireLifeExpectancy}</span>
                    </div>

                    <div className="absolute top-3 right-3 flex gap-4 text-[9px] font-mono z-10 bg-black/50 border border-white/10 px-2.5 py-1 rounded-lg">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[#00F5FF]"></span> Corpus</span>
                    </div>
                  </div>
                </div>

                {/* Projections Table Detail */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Table className="w-4 h-4 text-cyan-455" />
                    <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-wider">ANNUAL HORIZON PROJECTIONS LEDGER</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9.5px]">
                        <tr>
                          <th className="p-3">Age</th>
                          <th className="p-3">Contribution</th>
                          <th className="p-3">Withdrawal</th>
                          <th className="p-3">Growth Gained</th>
                          <th className="p-3 text-right">End Corpus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {fireResults.detailedYears.filter((_, idx) => idx % 2 === 0 || idx === fireResults.detailedYears.length - 1).map((val, idx) => (
                          <tr key={idx} className={val.isRetiree ? "bg-cyan-950/5" : ""}>
                            <td className="p-3 text-white font-bold">{val.age} yrs {val.isRetiree ? "🏖️" : "💼"}</td>
                            <td className="p-3 text-emerald-400">+{formatCurrencyValue(val.saving, displayCurrency)}</td>
                            <td className="p-3 text-rose-400">-{formatCurrencyValue(val.withdrawal, displayCurrency)}</td>
                            <td className="p-3 text-white/50">+{formatCurrencyValue(val.returnGained, displayCurrency)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatCurrencyValue(val.yearEndCorpus, displayCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SIP CALCULATOR */}
            {activeCalc === "sip" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-[#00F5FF] font-bold uppercase tracking-widest">Growth Estimator</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">SIP Calculator</h3>
                    </div>
                    <TrendingUp className="w-5 h-5 text-cyan-500" />
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Monthly Investment</span>
                        <span className="text-[#00F5FF]">{formatCurrencyValue(sipMonthly, displayCurrency)}</span>
                      </div>
                      <div className="flex gap-4">
                        <input 
                          type="range" min="500" max="100000" step="500" value={sipMonthly} 
                          onChange={(e) => setSipMonthly(Number(e.target.value))}
                          className="flex-1 accent-[#00F5FF] cursor-pointer"
                        />
                        <input 
                          type="number" value={sipMonthly} 
                          onChange={(e) => setSipMonthly(Math.max(0, Number(e.target.value)))}
                          className="w-24 bg-black/50 border border-white/5 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Expected Return Rate (p.a.)</span>
                        <span className="text-[#00F5FF]">{sipRate}%</span>
                      </div>
                      <div className="flex gap-4">
                        <input 
                          type="range" min="1" max="25" step="0.5" value={sipRate} 
                          onChange={(e) => setSipRate(Number(e.target.value))}
                          className="flex-1 accent-[#00F5FF] cursor-pointer"
                        />
                        <input 
                          type="number" step="any" value={sipRate} 
                          onChange={(e) => setSipRate(Math.max(0, Number(e.target.value)))}
                          className="w-21 bg-black/50 border border-white/5 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Time Horizon (Years)</span>
                        <span className="text-[#00F5FF]">{sipYears} Years</span>
                      </div>
                      <div className="flex gap-4">
                        <input 
                          type="range" min="1" max="40" value={sipYears} 
                          onChange={(e) => setSipYears(Number(e.target.value))}
                          className="flex-1 accent-[#00F5FF] cursor-pointer"
                        />
                        <input 
                          type="number" value={sipYears} 
                          onChange={(e) => setSipYears(Math.max(1, Number(e.target.value)))}
                          className="w-21 bg-black/50 border border-white/5 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Invested Capital</span>
                    <span className="text-xl font-bold font-mono text-white mt-1 block">{formatCurrencyValue(sipResults.totalInvested, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Estimated Return Gain</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] mt-1 block">+{formatCurrencyValue(sipResults.wealthGained, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-[#00F5FF]/5 border border-[#00F5FF]/10 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Total Maturity Value</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] mt-1 block">{formatCurrencyValue(sipResults.futureValue, displayCurrency)}</span>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Table className="w-4 h-4 text-cyan-455" />
                    <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-wider">YEAR-BY-YEAR ACCUMULATION TRAJECTORY</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9.5px]">
                        <tr>
                          <th className="p-3">Year</th>
                          <th className="p-3">Total Invested</th>
                          <th className="p-3">Interest Earned</th>
                          <th className="p-3 text-right">Wealth Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {sipResults.detailedYears.map((val) => (
                          <tr key={val.year} className="hover:bg-white/[0.015]">
                            <td className="p-3 text-white font-bold">Yr {val.year}</td>
                            <td className="p-3 text-white/60">{formatCurrencyValue(val.investment, displayCurrency)}</td>
                            <td className="p-3 text-emerald-400">+{formatCurrencyValue(val.interestGained, displayCurrency)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatCurrencyValue(val.corpus, displayCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. STEP-UP SIP CALCULATOR */}
            {activeCalc === "stepup_sip" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-[#00F5FF] font-bold uppercase tracking-widest">Progressive Refills</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">Step-up SIP Calculator</h3>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-[#00F5FF]" />
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Initial Monthly Installment</span>
                          <span className="text-[#00F5FF]">{formatCurrencyValue(stepupMonthly, displayCurrency)}</span>
                        </div>
                        <input 
                          type="range" min="1000" max="100000" step="1000" value={stepupMonthly} 
                          onChange={(e) => setStepupMonthly(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Annual Step-up Increment</span>
                          <span className="text-[#00F5FF]">{stepupPercentage}% every year</span>
                        </div>
                        <input 
                          type="range" min="1" max="50" value={stepupPercentage} 
                          onChange={(e) => setStepupPercentage(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Expected Return Rate (p.a.)</span>
                          <span className="text-[#00F5FF]">{stepupRate}%</span>
                        </div>
                        <input 
                          type="range" min="1" max="25" step="0.5" value={stepupRate} 
                          onChange={(e) => setStepupRate(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Duration (Years)</span>
                          <span className="text-[#00F5FF]">{stepupYears} Years</span>
                        </div>
                        <input 
                          type="range" min="1" max="40" value={stepupYears} 
                          onChange={(e) => setStepupYears(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Cumulative Deposits</span>
                    <span className="text-xl font-bold font-mono text-white mt-1 block">{formatCurrencyValue(stepupResults.totalInvested, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Growth Surplus</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] mt-1 block">+{formatCurrencyValue(stepupResults.wealthGained, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-cyan-950/20 border border-cyan-500/10 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-[#00F5FF] block uppercase font-bold">Progressive Maturity</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] mt-1 block">{formatCurrencyValue(stepupResults.futureValue, displayCurrency)}</span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Table className="w-4 h-4 text-cyan-455" />
                    <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-wider">STEPPED ACCUMULATIONS LEDGER</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9.5px]">
                        <tr>
                          <th className="p-3">Year</th>
                          <th className="p-3">Monthly Save</th>
                          <th className="p-3">Total Invested</th>
                          <th className="p-3 text-right">Maturity Corpus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {stepupResults.detailedYears.map((val) => (
                          <tr key={val.year} className="hover:bg-white/[0.015]">
                            <td className="p-3 text-white font-bold">Yr {val.year}</td>
                            <td className="p-3 text-[#00F5FF]">{formatCurrencyValue(val.monthlyAmt, displayCurrency)}/mo</td>
                            <td className="p-3 text-white/60">{formatCurrencyValue(val.investment, displayCurrency)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatCurrencyValue(val.corpus, displayCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SWP CONVENTIONAL CALCULATOR */}
            {activeCalc === "swp" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-[#00F5FF] font-bold uppercase tracking-widest">Reserve Depletions</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">Systematic Withdrawal Plan (SWP)</h3>
                    </div>
                    <TrendingDown className="w-5 h-5 text-rose-450 animate-pulse" />
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      <div className="col-span-2">
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Initial Principal Investment</span>
                          <span className="text-[#00F5FF]">{formatCurrencyValue(swpInitial, displayCurrency)}</span>
                        </div>
                        <div className="flex gap-4">
                          <input 
                            type="range" min="100000" max="10000000" step="100000" value={swpInitial} 
                            onChange={(e) => setSwpInitial(Number(e.target.value))}
                            className="flex-1 accent-[#00F5FF] cursor-pointer"
                          />
                          <input 
                            type="number" value={swpInitial} 
                            onChange={(e) => setSwpInitial(Math.max(0, Number(e.target.value)))}
                            className="w-26 bg-black/50 border border-white/5 rounded-xl px-2 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Monthly Desired Withdrawal</span>
                          <span className="text-[#00F5FF]">{formatCurrencyValue(swpWithdrawal, displayCurrency)}</span>
                        </div>
                        <input 
                          type="range" min="1000" max="100000" step="1000" value={swpWithdrawal} 
                          onChange={(e) => setSwpWithdrawal(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Annual Expected Return Rate</span>
                          <span className="text-[#00F5FF]">{swpRate}%</span>
                        </div>
                        <input 
                          type="range" min="1" max="20" step="0.5" value={swpRate} 
                          onChange={(e) => setSwpRate(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>

                      <div className="col-span-2">
                        <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                          <span>Withdrawal Horizon (Years)</span>
                          <span className="text-[#00F5FF]">{swpYears} Years</span>
                        </div>
                        <input 
                          type="range" min="1" max="40" value={swpYears} 
                          onChange={(e) => setSwpYears(Number(e.target.value))}
                          className="w-full accent-[#00F5FF] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Total Capital Withdrawn</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">+{formatCurrencyValue(swpResults.totalWithdrawn, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Remaining Portfolio Balance</span>
                    <span className={`text-xl font-bold font-mono mt-1 block ${swpResults.endingBalance > 0 ? "text-white" : "text-rose-500 font-extrabold"}`}>
                      {formatCurrencyValue(swpResults.endingBalance, displayCurrency)}
                    </span>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block">Status</span>
                    <span className={`text-xs font-sans font-bold uppercase mt-1.5 block ${swpResults.endingBalance > 0 ? "text-emerald-400" : "text-rose-450"}`}>
                      {swpResults.endingBalance > 0 ? "✅ Sustainable Horizon" : "⚠️ Capital Depleted Early"}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-wider block mb-3">ANNUAL WITHDRAWAL RUNTIME LEDGER</span>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9.5px]">
                        <tr>
                          <th className="p-3">Year</th>
                          <th className="p-3">Starting Balance</th>
                          <th className="p-3">Withdrawn</th>
                          <th className="p-3">Compounded Growth</th>
                          <th className="p-3 text-right">Closing Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {swpResults.detailedYears.map((val) => (
                          <tr key={val.year} className="hover:bg-white/[0.015]">
                            <td className="p-3 text-white font-bold">Yr {val.year}</td>
                            <td className="p-3 text-white/50">{formatCurrencyValue(val.startingCorpus, displayCurrency)}</td>
                            <td className="p-3 text-rose-400">-{formatCurrencyValue(val.withdrawal, displayCurrency)}</td>
                            <td className="p-3 text-[#00F5FF]">+{formatCurrencyValue(val.interestGained, displayCurrency)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatCurrencyValue(val.endingCorpus, displayCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SWP WITH INFLATION ADJUSTMENT */}
            {activeCalc === "swp_infl" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-[#00F5FF] font-bold uppercase tracking-widest">Adaptive Depletions</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">SWP with Inflation Adjustments</h3>
                    </div>
                    <Coins className="w-5 h-5 text-amber-500 animate-bounce" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="col-span-2">
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Total Initial Corpus Value</span>
                        <span className="text-[#00F5FF]">{formatCurrencyValue(swpInflInitial, displayCurrency)}</span>
                      </div>
                      <input 
                        type="range" min="100000" max="10000000" step="100000" value={swpInflInitial} 
                        onChange={(e) => setSwpInflInitial(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Base Monthly Desired Cashout</span>
                        <span className="text-[#00F5FF]">{formatCurrencyValue(swpInflWithdrawal, displayCurrency)}</span>
                      </div>
                      <input 
                        type="range" min="1000" max="100000" step="1000" value={swpInflWithdrawal} 
                        onChange={(e) => setSwpInflWithdrawal(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Inflation Rate (Adjusts cashout p.a.)</span>
                        <span className="text-rose-400">{swpInflInflation}%</span>
                      </div>
                      <input 
                        type="range" min="1" max="15" step="0.5" value={swpInflInflation} 
                        onChange={(e) => setSwpInflInflation(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Portfolio Safe Return yield</span>
                        <span className="text-[#00F5FF]">{swpInflRate}%</span>
                      </div>
                      <input 
                        type="range" min="1" max="20" step="0.5" value={swpInflRate} 
                        onChange={(e) => setSwpInflRate(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Withdrawal Plan Duration</span>
                        <span className="text-[#00F5FF]">{swpInflYears} Years</span>
                      </div>
                      <input 
                        type="range" min="1" max="40" value={swpInflYears} 
                        onChange={(e) => setSwpInflYears(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Sum of Inflated Cashouts</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">+{formatCurrencyValue(swpInflResults.totalWithdrawn, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Final Residual Val</span>
                    <span className={`text-xl font-bold font-mono mt-1 block ${swpInflResults.endingBalance > 0 ? "text-white" : "text-rose-500 font-extrabold"}`}>
                      {formatCurrencyValue(swpInflResults.endingBalance, displayCurrency)}
                    </span>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block">Forecast</span>
                    <span className={`text-xs font-sans font-bold uppercase mt-1.5 block ${swpInflResults.endingBalance > 0 ? "text-emerald-400" : "text-rose-450"}`}>
                      {swpInflResults.endingBalance > 0 ? "✅ Inflation Resilient" : "⚠️ Out of Capital Early"}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-wider block mb-3">ADAPTIVE INFLATED WITHDRAWALS RUNTIME LEDGER</span>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9.5px]">
                        <tr>
                          <th className="p-3">Year</th>
                          <th className="p-3">Active Monthly Pay</th>
                          <th className="p-3">Yearly Withdrawal</th>
                          <th className="p-3">Compounded Growth</th>
                          <th className="p-3 text-right">Residual Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {swpInflResults.detailedYears.map((val) => (
                          <tr key={val.year} className="hover:bg-white/[0.015]">
                            <td className="p-3 text-white font-bold">Yr {val.year}</td>
                            <td className="p-3 text-[#00F5FF]">{formatCurrencyValue(val.currentMonthlyWithdrawal, displayCurrency)}/mo</td>
                            <td className="p-3 text-rose-400">-{formatCurrencyValue(val.withdrawal, displayCurrency)}</td>
                            <td className="p-3 text-white/50">+{formatCurrencyValue(val.interestGained, displayCurrency)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatCurrencyValue(val.endingCorpus, displayCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. FIXED DEPOSIT (FD) */}
            {activeCalc === "fd" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-[#00F5FF] font-bold uppercase tracking-widest">Guaranteed Returns</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">Fixed Deposit (FD)</h3>
                    </div>
                    <PercentSquare className="w-5 h-5 text-teal-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="col-span-2">
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>FD Principal Amount</span>
                        <span className="text-[#00F5FF]">{formatCurrencyValue(fdPrincipal, displayCurrency)}</span>
                      </div>
                      <input 
                        type="range" min="10000" max="2500000" step="10000" value={fdPrincipal} 
                        onChange={(e) => setFdPrincipal(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Interest Rate (p.a.)</span>
                        <span className="text-[#00F5FF]">{fdRate}%</span>
                      </div>
                      <input 
                        type="range" min="3" max="15" step="0.1" value={fdRate} 
                        onChange={(e) => setFdRate(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Compounding Frequency</span>
                        <span className="text-[#00F5FF]">
                          {fdCompounding === 12 ? "Monthly" : fdCompounding === 4 ? "Quarterly" : fdCompounding === 2 ? "Half-Yearly" : "Yearly"}
                        </span>
                      </div>
                      <select
                        value={fdCompounding}
                        onChange={(e) => setFdCompounding(Number(e.target.value))}
                        className="w-full bg-[#0c0c0c] border border-white/10 rounded-2xl px-4.5 py-2 text-xs text-cyan-455 font-mono focus:outline-none cursor-pointer"
                      >
                        <option value={12}>Monthly compounding (12/year)</option>
                        <option value={4}>Quarterly compounding (4/year - Standard)</option>
                        <option value={2}>Half-Yearly compounding (2/year)</option>
                        <option value={1}>Yearly compounding (1/year)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Tenure (Years)</span>
                        <span className="text-[#00F5FF]">{fdYears} Years</span>
                      </div>
                      <input 
                        type="range" min="1" max="25" value={fdYears} 
                        onChange={(e) => setFdYears(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Absolute Interest Accrued</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] mt-1 block">+{formatCurrencyValue(fdResults.interestEarned, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Maturity Output Value</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">{formatCurrencyValue(fdResults.maturityValue, displayCurrency)}</span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-wider block mb-3">GUARANTEED ACCRUAL STEPS</span>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9.5px]">
                        <tr>
                          <th className="p-3">Year</th>
                          <th className="p-3">Starting Reserves</th>
                          <th className="p-3">Interest Gained</th>
                          <th className="p-3 text-right">Closing Reserves</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {fdResults.detailedYears.map((val) => (
                          <tr key={val.year} className="hover:bg-white/[0.015]">
                            <td className="p-3 text-white font-bold">Yr {val.year}</td>
                            <td className="p-3 text-white/50">{formatCurrencyValue(val.compoundingStart, displayCurrency)}</td>
                            <td className="p-3 text-emerald-400">+{formatCurrencyValue(val.interestEarned, displayCurrency)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatCurrencyValue(val.compoundingEnd, displayCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 7. RECURRING DEPOSIT (RD) */}
            {activeCalc === "rd" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-[#00F5FF] font-bold uppercase tracking-widest">Disciplined Saving</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">Recurring Deposit (RD)</h3>
                    </div>
                    <Calendar className="w-5 h-5 text-pink-400" />
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Monthly Installment deposit</span>
                        <span className="text-[#00F5FF]">{formatCurrencyValue(rdMonthly, displayCurrency)}</span>
                      </div>
                      <input 
                        type="range" min="500" max="100000" step="500" value={rdMonthly} 
                        onChange={(e) => setRdMonthly(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Interest Rate (Compounded Quarterly)</span>
                        <span className="text-[#00F5FF]">{rdRate}% p.a.</span>
                      </div>
                      <input 
                        type="range" min="3" max="12" step="0.1" value={rdRate} 
                        onChange={(e) => setRdRate(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Duration tenure</span>
                        <span className="text-[#00F5FF]">{rdYears} Years</span>
                      </div>
                      <input 
                        type="range" min="1" max="15" value={rdYears} 
                        onChange={(e) => setRdYears(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Sum of Contributions</span>
                    <span className="text-xl font-bold font-mono text-white mt-1 block">{formatCurrencyValue(rdResults.totalInvested, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Interest Earned</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] mt-1 block">+{formatCurrencyValue(rdResults.interestEarned, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-[#00F5FF]/5 border border-[#00F5FF]/15 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-[#00F5FF] block uppercase font-bold">Maturity Yield Value</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] mt-1 block">{formatCurrencyValue(rdResults.maturityValue, displayCurrency)}</span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-wider block mb-3">ANNUAL RETIREMENT SAVING INTERVALS</span>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9.5px]">
                        <tr>
                          <th className="p-3">Year</th>
                          <th className="p-3">Cumulative Deposit</th>
                          <th className="p-3">Growth Gained</th>
                          <th className="p-3 text-right">Value Asset</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {rdResults.detailedYears.map((val) => (
                          <tr key={val.year} className="hover:bg-white/[0.015]">
                            <td className="p-3 text-white font-bold">Yr {val.year}</td>
                            <td className="p-3 text-white/50">{formatCurrencyValue(val.totalContributionsYtd, displayCurrency)}</td>
                            <td className="p-3 text-emerald-400">+{formatCurrencyValue(val.interestGained, displayCurrency)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatCurrencyValue(val.endingValue, displayCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 8. COMPOUND INTEREST */}
            {activeCalc === "compound" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-[#00F5FF] font-bold uppercase tracking-widest">Exponential Expansion</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">Compound Interest Calculator</h3>
                    </div>
                    <Percent className="w-5 h-5 text-indigo-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Initial Principal</span>
                        <span className="text-[#00F5FF]">{formatCurrencyValue(ciPrincipal, displayCurrency)}</span>
                      </div>
                      <input 
                        type="range" min="0" max="1000000" step="5000" value={ciPrincipal} 
                        onChange={(e) => setCiPrincipal(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Monthly Top-up Contribution</span>
                        <span className="text-[#00F5FF]">{formatCurrencyValue(ciMonthly, displayCurrency)}</span>
                      </div>
                      <input 
                        type="range" min="0" max="100000" step="500" value={ciMonthly} 
                        onChange={(e) => setCiMonthly(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Interest Rate Yield (p.a.)</span>
                        <span className="text-[#00F5FF]">{ciRate}%</span>
                      </div>
                      <input 
                        type="range" min="1" max="25" step="0.25" value={ciRate} 
                        onChange={(e) => setCiRate(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Compounding Frequency</span>
                        <span className="text-[#00F5FF]">{ciCompounding === 365 ? "Daily" : ciCompounding === 12 ? "Monthly" : ciCompounding === 4 ? "Quarterly" : "Yearly"}</span>
                      </div>
                      <select
                        value={ciCompounding}
                        onChange={(e) => setCiCompounding(Number(e.target.value))}
                        className="w-full bg-[#0c0c0c] border border-white/10 rounded-2xl px-4.5 py-2 text-xs text-cyan-455 font-mono focus:outline-none cursor-pointer"
                      >
                        <option value={365}>Daily compounding (365/year)</option>
                        <option value={12}>Monthly compounding (12/year)</option>
                        <option value={4}>Quarterly compounding (4/year)</option>
                        <option value={1}>Yearly compounding (1/year)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Compound Period (Years)</span>
                        <span className="text-[#00F5FF]">{ciYears} Years</span>
                      </div>
                      <input 
                        type="range" min="1" max="40" value={ciYears} 
                        onChange={(e) => setCiYears(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Sum of Contributions</span>
                    <span className="text-xl font-bold font-mono text-white mt-1 block">{formatCurrencyValue(ciResults.totalInvested, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Compounded Interest</span>
                    <span className="text-xl font-bold font-mono text-[#00F5FF] mt-1 block">+{formatCurrencyValue(ciResults.compoundInterest, displayCurrency)}</span>
                  </div>
                  <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl text-left">
                    <span className="text-[9px] font-mono text-white/40 block uppercase font-bold">Cumulative Portfolio Cash</span>
                    <span className="text-xl font-bold font-mono text-indigo-400 mt-1 block">{formatCurrencyValue(ciResults.futureValue, displayCurrency)}</span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <span className="text-[10px] font-mono text-white/40 font-bold uppercase tracking-wider block mb-3">ANNUAL ACCUMULATING STEPS LEDGER</span>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9.5px]">
                        <tr>
                          <th className="p-3">Year</th>
                          <th className="p-3">Starting Pool</th>
                          <th className="p-3">Deposits Added</th>
                          <th className="p-3">Interest Gained</th>
                          <th className="p-3 text-right">Closing Pool</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {ciResults.detailedYears.map((val) => (
                          <tr key={val.year} className="hover:bg-white/[0.015]">
                            <td className="p-3 text-white font-bold">Yr {val.year}</td>
                            <td className="p-3 text-white/50">{formatCurrencyValue(val.principalStart, displayCurrency)}</td>
                            <td className="p-3 text-indigo-400">+{formatCurrencyValue(val.contributions, displayCurrency)}</td>
                            <td className="p-3 text-emerald-400">+{formatCurrencyValue(val.interestEarned, displayCurrency)}</td>
                            <td className="p-3 text-right font-bold text-white">{formatCurrencyValue(val.balanceEnd, displayCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 9. INDIAN INCOME TAX COMPARATIVE CALCULATOR */}
            {activeCalc === "tax" && (
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
                    <div>
                      <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest">Fiscal Slabs Code</span>
                      <h3 className="text-lg font-sans font-extrabold text-white leading-tight">Indian Income Tax Comparator (FY 2026-27 / 2025-26)</h3>
                    </div>
                    <Scale className="w-5 h-5 text-[#00F5FF]" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Annual Gross Salary / Profit</span>
                        <span className="text-[#00F5FF]">₹{taxSalary.toLocaleString("en-IN")}</span>
                      </div>
                      <input 
                        type="range" min="100000" max="5000000" step="50000" value={taxSalary} 
                        onChange={(e) => setTaxSalary(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono font-bold text-white/50 mb-1">
                        <span>Other Income (Rent, Interest, CapGains)</span>
                        <span className="text-[#00F5FF]">₹{taxOther.toLocaleString("en-IN")}</span>
                      </div>
                      <input 
                        type="range" min="0" max="1000000" step="20000" value={taxOther} 
                        onChange={(e) => setTaxOther(Number(e.target.value))}
                        className="w-full accent-[#00F5FF] cursor-pointer"
                      />
                    </div>

                    <div className="col-span-2 flex items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                      <input 
                        type="checkbox" checked={taxIsSalaried} id="taxIsSalaried"
                        onChange={(e) => setTaxIsSalaried(e.target.checked)}
                        className="w-4 h-4 accent-[#00F5FF] cursor-pointer"
                      />
                      <label htmlFor="taxIsSalaried" className="text-xs font-sans text-white/80 cursor-pointer">
                        Is Salaried Individual? (Enables standard deductions of ₹75,000 for New Regime, ₹50,000 for Old Regime)
                      </label>
                    </div>

                    {/* Old Regime settings */}
                    <div className="col-span-2 border-t border-white/5 pt-4">
                      <span className="text-[10px] font-mono text-white/40 block font-bold uppercase tracking-wider mb-3">EXEMPTIONS & DEDUCTIONS FOR OLD REGIME SENSITIVITY</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-white/50 mb-1">
                            <span>Sec 80C Deductions (ELSS/PPF/LIC)</span>
                            <span>₹{tax80C.toLocaleString("en-IN")} (Max 1.5L)</span>
                          </div>
                          <input 
                            type="range" min="0" max="150000" step="10000" value={tax80C} 
                            onChange={(e) => setTax80C(Number(e.target.value))}
                            className="w-full accent-[#00F5FF] cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-white/50 mb-1">
                            <span>Sec 80D (Health Insurance premium)</span>
                            <span>₹{tax80D.toLocaleString("en-IN")} (Max 75k)</span>
                          </div>
                          <input 
                            type="range" min="0" max="75000" step="5000" value={tax80D} 
                            onChange={(e) => setTax80D(Number(e.target.value))}
                            className="w-full accent-[#00F5FF] cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-white/50 mb-1">
                            <span>Sec 24b / Rent HRA Exemption</span>
                            <span>₹{taxHomeLoanRent.toLocaleString("en-IN")}</span>
                          </div>
                          <input 
                            type="range" min="0" max="300000" step="10000" value={taxHomeLoanRent} 
                            onChange={(e) => setTaxHomeLoanRent(Number(e.target.value))}
                            className="w-full accent-[#00F5FF] cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-mono text-white/50 mb-1">
                            <span>Other exemptions / Sec 10 / professional tax</span>
                            <span>₹{taxSection10.toLocaleString("en-IN")}</span>
                          </div>
                          <input 
                            type="range" min="0" max="100000" step="5000" value={taxSection10} 
                            onChange={(e) => setTaxSection10(Number(e.target.value))}
                            className="w-full accent-[#00F5FF] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compare Outputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* New Regime Card */}
                  <div className="p-6 bg-[#00F5FF]/5 border border-[#00F5FF]/10 rounded-3xl relative overflow-hidden">
                    <span className="absolute top-3 right-3 text-[9px] font-mono font-bold bg-[#00F5FF]/10 px-2 py-0.5 rounded text-[#00F5FF]">RECOMMENDED REGIME</span>
                    <span className="text-[10px] font-mono text-white/50 block font-bold uppercase tracking-wider mb-2">NEW TAX REGIME (FY 2026-27 Standard)</span>
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Taxable Income:</span>
                        <span>₹{taxResults.taxableNew.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Calculated Tax:</span>
                        <span>₹{Math.round(taxResults.calculatedTaxNew).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Sec 87A Rebate:</span>
                        <span className="text-emerald-400">-₹{Math.round(taxResults.rebateNew).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Health & Education Cess (4%):</span>
                        <span>₹{Math.round(taxResults.cessNew).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-[#00F5FF]">
                        <span>Net Tax Payable:</span>
                        <span>₹{Math.round(taxResults.finalTaxNew).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Old Regime Card */}
                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                    <span className="text-[10px] font-mono text-white/50 block font-bold uppercase tracking-wider mb-2">OLD TAX REGIME (Optional)</span>
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Deductions Allowed:</span>
                        <span className="text-cyan-450">₹{taxResults.deductionsTotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Taxable Income:</span>
                        <span>₹{taxResults.taxableOld.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Calculated Tax:</span>
                        <span>₹{Math.round(taxResults.calculatedTaxOld).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Sec 87A Rebate:</span>
                        <span className="text-emerald-400">-₹{Math.round(taxResults.rebateOld).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Health & Education Cess (4%):</span>
                        <span>₹{Math.round(taxResults.cessOld).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-white">
                        <span>Net Tax Payable:</span>
                        <span>₹{Math.round(taxResults.finalTaxOld).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparative assessment report alert */}
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl flex gap-3.5 items-start">
                  <Info className="w-5 h-5 text-cyan-450 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-white/40 block font-black uppercase">Regime Recommendation Report</span>
                    <p className="text-xs text-white/80 leading-relaxed font-sans font-semibold">
                      {taxResults.recommendation}
                    </p>
                    <p className="text-[10px] text-white/40 font-sans leading-tight">
                      * Rebate of ₹20,000 applies up to ₹7,00,000 taxable salary under New Tax Regime.
                    </p>
                  </div>
                </div>

                {/* Slabs breakdown details */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <span className="text-[9.5px] font-mono text-white/40 font-bold uppercase tracking-wider block mb-3">NEW REGIME EXCISE TAX SLABS DETAILS</span>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-[#0c0c0c] text-white/45 sticky top-0 uppercase text-[9px]">
                        <tr>
                          <th className="p-3">Income Range</th>
                          <th className="p-3">Slab Rate %</th>
                          <th className="p-3">Taxable Value in Slab</th>
                          <th className="p-3 text-right">Tax Liability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10">
                        {taxResults.newSlabBreakdowns.map((val, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.015]">
                            <td className="p-3 text-white font-bold">{val.slab}</td>
                            <td className="p-3 text-[#00F5FF]">{val.rate}%</td>
                            <td className="p-3 text-white/60">₹{Math.round(val.taxableAmt).toLocaleString("en-IN")}</td>
                            <td className="p-3 text-right font-bold text-white">₹{Math.round(val.tax).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
