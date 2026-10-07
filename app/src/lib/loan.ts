export type FieldKey = "amount" | "rate" | "tenure" | "payment";

export interface LoanState {
  amount: number; // principal in RM
  rate: number; // annual nominal rate, percent
  months: number; // tenure in months
  payment: number; // monthly instalment in RM
}

/** Monthly instalment for a reducing-balance loan on monthly rest. */
export function paymentFor(P: number, annualRate: number, n: number): number {
  if (n <= 0) return NaN;
  const i = annualRate / 100 / 12;
  if (Math.abs(i) < 1e-12) return P / n;
  return (P * i) / (1 - Math.pow(1 + i, -n));
}

/** Principal supportable by a given instalment. */
export function principalFor(M: number, annualRate: number, n: number): number {
  if (n <= 0) return NaN;
  const i = annualRate / 100 / 12;
  if (Math.abs(i) < 1e-12) return M * n;
  return (M * (1 - Math.pow(1 + i, -n))) / i;
}

/** Months needed to clear the loan. NaN when the instalment never clears it. */
export function monthsFor(P: number, annualRate: number, M: number): number {
  const i = annualRate / 100 / 12;
  if (Math.abs(i) < 1e-12) return M > 0 ? P / M : NaN;
  const interestOnly = P * i;
  if (M <= interestOnly) return NaN;
  return -Math.log(1 - (P * i) / M) / Math.log(1 + i);
}

/** Annual rate implied by principal, tenure and instalment. Bisection — payment rises with rate. */
export function rateFor(P: number, n: number, M: number): number {
  if (n <= 0 || M <= 0 || P <= 0) return NaN;
  if (M <= P / n) return NaN;
  if (M >= P) return NaN;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const guess =
      Math.abs(mid) < 1e-15 ? P / n : (P * mid) / (1 - Math.pow(1 + mid, -n));
    if (guess < M) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 12 * 100;
}

export interface SolveResult {
  value: number;
  error?: string;
}

/** Recompute whichever field is locked from the other three. */
export function solve(locked: FieldKey, s: LoanState): SolveResult {
  const { amount, rate, months, payment } = s;

  if (locked === "payment") {
    if (!(amount > 0)) return { value: NaN, error: "Enter a loan amount." };
    if (!(months > 0)) return { value: NaN, error: "Enter a tenure." };
    return { value: paymentFor(amount, rate, months) };
  }

  if (locked === "amount") {
    if (!(payment > 0)) return { value: NaN, error: "Enter an instalment." };
    if (!(months > 0)) return { value: NaN, error: "Enter a tenure." };
    return { value: principalFor(payment, rate, months) };
  }

  if (locked === "tenure") {
    if (!(amount > 0)) return { value: NaN, error: "Enter a loan amount." };
    if (!(payment > 0)) return { value: NaN, error: "Enter an instalment." };
    const n = monthsFor(amount, rate, payment);
    if (!isFinite(n) || isNaN(n)) {
      const monthlyInterest = (amount * rate) / 100 / 12;
      return {
        value: NaN,
        error: `Instalment only covers interest. Pay more than ${formatRM(
          monthlyInterest,
        )} a month.`,
      };
    }
    if (n > 12 * 60)
      return { value: NaN, error: "Over 60 years — raise the instalment." };
    return { value: Math.round(n) };
  }

  // locked === "rate"
  if (!(amount > 0)) return { value: NaN, error: "Enter a loan amount." };
  if (!(months > 0)) return { value: NaN, error: "Enter a tenure." };
  if (!(payment > 0)) return { value: NaN, error: "Enter an instalment." };
  if (payment <= amount / months) {
    return {
      value: NaN,
      error: `Instalment is below the interest-free minimum of ${formatRM(
        amount / months,
      )}.`,
    };
  }
  const r = rateFor(amount, months, payment);
  if (isNaN(r)) return { value: NaN, error: "No rate fits these numbers." };
  if (r > 40)
    return { value: NaN, error: "Implied rate above 40% — check the numbers." };
  return { value: r };
}

/* ---------- formatting ---------- */

/** RM 316,952.70 → "317k". RM 1,268,000 → "1.27M". */
export function formatShort(v: number): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) {
    const m = v / 1_000_000;
    return `${(Math.round(m * 100) / 100).toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}M`;
  }
  if (abs >= 1_000) return `${Math.round(v / 1_000).toLocaleString("en-MY")}k`;
  return Math.round(v).toLocaleString("en-MY");
}

export function formatRM(v: number, dp = 2): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  return `RM ${v.toLocaleString("en-MY", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`;
}

export function formatGrouped(v: number): string {
  if (!isFinite(v) || isNaN(v)) return "";
  return Math.round(v).toLocaleString("en-MY");
}

export function formatTenure(months: number): string {
  if (!isFinite(months) || isNaN(months)) return "—";
  const m = Math.round(months);
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y === 0) return `${rem} mo`;
  if (rem === 0) return `${y} yr`;
  return `${y} yr ${rem} mo`;
}

/** Accepts "317k", "1.2m", "316,952.70", "RM 450 000". */
export function parseAmount(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/rm/g, "").replace(/[,\s]/g, "");
  if (!s) return NaN;
  const mult = s.endsWith("k") ? 1_000 : s.endsWith("m") ? 1_000_000 : 1;
  const num = parseFloat(mult === 1 ? s : s.slice(0, -1));
  if (isNaN(num)) return NaN;
  return num * mult;
}
