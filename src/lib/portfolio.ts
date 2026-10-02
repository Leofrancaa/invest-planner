export const categories = [
  "Fixed income",
  "Brazilian stocks",
  "Real estate funds",
  "International",
] as const;
export type Category = (typeof categories)[number];
export type Holding = {
  id: string;
  name: string;
  ticker: string;
  category: Category;
  value: number;
  target: number;
};
export type Contribution = { id: string; month: string; amount: number };
export type Portfolio = {
  holdings: Holding[];
  monthlyAmount: number;
  contributions: Contribution[];
};
export const initialPortfolio: Portfolio = {
  monthlyAmount: 500,
  contributions: [],
  holdings: [
    {
      id: "btg",
      name: "BTG Pactual CDB",
      ticker: "",
      category: "Fixed income",
      value: 820.43,
      target: 60,
    },
    {
      id: "itau",
      name: "Itaú Unibanco",
      ticker: "ITUB4",
      category: "Brazilian stocks",
      value: 0,
      target: 6,
    },
    {
      id: "taesa",
      name: "Taesa",
      ticker: "TAEE11",
      category: "Brazilian stocks",
      value: 0,
      target: 4,
    },
    {
      id: "weg",
      name: "WEG",
      ticker: "WEGE3",
      category: "Brazilian stocks",
      value: 0,
      target: 5,
    },
    {
      id: "maxi",
      name: "Maxi Renda",
      ticker: "MXRF11",
      category: "Real estate funds",
      value: 181.8,
      target: 10,
    },
    {
      id: "world",
      name: "Investo Global Equities",
      ticker: "WRLD11",
      category: "International",
      value: 0,
      target: 15,
    },
  ],
};
export function validatePortfolio(value: unknown): value is Portfolio {
  if (!value || typeof value !== "object") return false;
  const p = value as Portfolio;
  return (
    Array.isArray(p.holdings) &&
    p.holdings.length > 0 &&
    p.holdings.length <= 50 &&
    new Set(p.holdings.map((h) => h.id)).size === p.holdings.length &&
    p.holdings.every(
      (h) =>
        typeof h.id === "string" &&
        typeof h.name === "string" &&
        h.name.trim().length > 0 &&
        h.name.length <= 100 &&
        typeof h.ticker === "string" &&
        /^[A-Z0-9]{0,12}$/.test(h.ticker) &&
        categories.includes(h.category) &&
        Number.isFinite(h.value) &&
        h.value >= 0 &&
        h.value <= 1e12 &&
        Number.isFinite(h.target) &&
        h.target >= 0 &&
        h.target <= 100,
    ) &&
    Number.isFinite(p.monthlyAmount) &&
    p.monthlyAmount >= 0 &&
    p.monthlyAmount <= 1e9 &&
    Array.isArray(p.contributions) &&
    p.contributions.length <= 120 &&
    new Set(p.contributions.map((c) => c.month)).size ===
      p.contributions.length &&
    p.contributions.every(
      (c) =>
        typeof c.id === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(c.month) &&
        Number.isFinite(c.amount) &&
        c.amount >= 0 &&
        c.amount <= 1e9,
    )
  );
}
export function allocate(
  holdings: Holding[],
  amount: number,
  mode: "target" | "rebalance",
) {
  const target = holdings.reduce((s, h) => s + h.target, 0);
  if (!Number.isFinite(amount) || amount < 0 || Math.abs(target - 100) > 0.001)
    throw new Error(
      "Targets must total 100% and the contribution must be non-negative.",
    );
  const total = holdings.reduce((s, h) => s + h.value, 0);
  const weights = holdings.map((h) =>
    mode === "target"
      ? h.target
      : Math.max(0, ((total + amount) * h.target) / 100 - h.value),
  );
  const sum = weights.reduce((s, w) => s + w, 0),
    cents = Math.round(amount * 100);
  const exact = weights.map((w) => (sum ? (cents * w) / sum : 0)),
    rounded = exact.map(Math.floor);
  const order = exact
    .map((v, i) => ({ i, fraction: v - rounded[i] }))
    .sort((a, b) => b.fraction - a.fraction);
  const remainder = cents - rounded.reduce((s, v) => s + v, 0);
  for (let i = 0; i < remainder; i++) rounded[order[i].i]++;
  return holdings.map((h, i) => ({
    ...h,
    allocation: rounded[i] / 100,
    currentPercent: total ? (h.value / total) * 100 : 0,
    afterPercent:
      total + amount
        ? ((h.value + rounded[i] / 100) / (total + amount)) * 100
        : 0,
  }));
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(
    value,
  );
