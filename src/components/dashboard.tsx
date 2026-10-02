"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HoldingEditor } from "@/components/holding-editor";
import { AllocationBreakdown } from "@/components/allocation-breakdown";
import type { User } from "@supabase/supabase-js";
import {
  allocate,
  categories,
  initialPortfolio,
  money,
  validatePortfolio,
  type Holding,
  type Portfolio,
} from "@/lib/portfolio";
import { supabase } from "@/lib/supabase";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  timestamp?: string;
};
const colors = ["#177f7b", "#4361c2", "#bd8033", "#9366b4"];
const storageKey = "portfolio-planner-v1";
const monthNow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .replace("/", "-");

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio>(initialPortfolio);
  const [loaded, setLoaded] = useState(false);
  const [savedBalances, setSavedBalances] = useState<Record<string, number>>(
    Object.fromEntries(initialPortfolio.holdings.map((h) => [h.id, h.value])),
  );
  const [tab, setTab] = useState("Overview");
  const [amount, setAmount] = useState(500);
  const [month, setMonth] = useState("");
  const [mode, setMode] = useState<"target" | "rebalance">("rebalance");
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [removed, setRemoved] = useState<Holding | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteError, setQuoteError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [quoteVersion, setQuoteVersion] = useState(0);
  const generation = useRef(0);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudVersion, setCloudVersion] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const p: unknown = JSON.parse(stored);
          if (validatePortfolio(p)) {
            setPortfolio(p);
            setSavedBalances(
              Object.fromEntries(p.holdings.map((h) => [h.id, h.value])),
            );
            setAmount(p.monthlyAmount);
          } else
            setStatus(
              "Stored draft could not be loaded. Starting with the example portfolio.",
            );
        }
      } catch {
        setStatus(
          "Local storage is unavailable. Export your plan to keep a copy.",
        );
      }
      setMonth(monthNow());
      setLoaded(true);
    }, 0);
    if (!supabase) return () => clearTimeout(timer);
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCloudReady(false);
      setCloudVersion(null);
      generation.current++;
    });
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const symbols = [
    ...new Set([
      ...portfolio.holdings
        .map((h) => h.ticker)
        .filter((t) => /^[A-Z]{4}[0-9]{1,2}$/.test(t)),
      "ITUB4",
      "VALE3",
      "PETR4",
    ]),
  ]
    .slice(0, 12)
    .join(",");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setQuoteLoading(true);
      setQuoteError("");
    }, 0);
    fetch(`/api/quotes?symbols=${symbols}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load quotes.");
        if (!controller.signal.aborted) {
          setQuotes(data.quotes);
          setUnavailable(data.unavailable);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setQuoteError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuoteLoading(false);
      });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [symbols, quoteVersion]);

  const total = portfolio.holdings.reduce(
    (s, h) => s + (Number.isFinite(h.value) ? h.value : 0),
    0,
  );
  const savedTotal = Object.values(savedBalances).reduce(
    (sum, value) => sum + value,
    0,
  );
  const balanceChange = total - savedTotal;
  const targetTotal = portfolio.holdings.reduce((s, h) => s + h.target, 0);
  const valid =
    validatePortfolio(portfolio) &&
    Math.abs(targetTotal - 100) < 0.001 &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= 1e9;
  const allocation = valid ? allocate(portfolio.holdings, amount, mode) : [];
  function update(next: Portfolio) {
    setPortfolio(next);
    setDirty(true);
  }
  function updateHolding(id: string, patch: Partial<Holding>) {
    update({
      ...portfolio,
      holdings: portfolio.holdings.map((h) =>
        h.id === id ? { ...h, ...patch } : h,
      ),
    });
  }
  function selectMonth(value: string) {
    setMonth(value);
    setAmount(
      portfolio.contributions.find((c) => c.month === value)?.amount ??
        portfolio.monthlyAmount,
    );
  }
  function schedule() {
    if (!valid || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      setStatus("Use valid values, a month, and targets totaling 100%.");
      return;
    }
    update({
      ...portfolio,
      contributions: [
        ...portfolio.contributions.filter((c) => c.month !== month),
        { id: month, month, amount },
      ].sort((a, b) => a.month.localeCompare(b.month)),
    });
    setStatus(
      "Monthly override added to your draft. Balances have not changed.",
    );
  }
  async function save() {
    if (!valid || busy) {
      setStatus("Enter valid values and make sure targets total 100%.");
      return;
    }
    const client = supabase;
    if (user && client && !cloudReady) {
      setStatus(
        "Load your cloud plan before saving. Export the local draft first if needed.",
      );
      return;
    }
    setBusy(true);
    try {
      if (user && client) {
        const snapshot = generation.current;
        const stamp = new Date().toISOString();
        if (cloudVersion) {
          const { data, error } = await client
            .from("portfolio_plans")
            .update({ data: portfolio, updated_at: stamp })
            .eq("user_id", user.id)
            .eq("updated_at", cloudVersion)
            .select("updated_at")
            .maybeSingle();
          if (error) throw error;
          if (!data)
            throw new Error(
              "Your cloud plan changed elsewhere. Export this draft and reload before saving.",
            );
          if (snapshot !== generation.current) return;
          setCloudVersion(data.updated_at);
        } else {
          const { error } = await client
            .from("portfolio_plans")
            .insert({ user_id: user.id, data: portfolio, updated_at: stamp });
          if (error) throw error;
          if (snapshot !== generation.current) return;
          setCloudVersion(stamp);
        }
        setStatus("Plan saved to your account.");
      } else {
        localStorage.setItem(storageKey, JSON.stringify(portfolio));
        setStatus("Plan saved on this device.");
      }
      setSavedBalances(
        Object.fromEntries(portfolio.holdings.map((h) => [h.id, h.value])),
      );
      setDirty(false);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Save failed. Your draft is still available.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadCloud() {
    if (!user || !supabase || busy) return;
    if (dirty) {
      setStatus("Save or export your draft before loading the cloud plan.");
      return;
    }
    const snapshot = generation.current;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("portfolio_plans")
        .select("data,updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (snapshot !== generation.current) return;
      if (data) {
        if (!validatePortfolio(data.data))
          throw new Error("Cloud plan has invalid data.");
        setPortfolio(data.data);
        setSavedBalances(
          Object.fromEntries(
            data.data.holdings.map((h: Holding) => [h.id, h.value]),
          ),
        );
        setAmount(data.data.monthlyAmount);
        setCloudVersion(data.updated_at);
      }
      setCloudReady(true);
      setStatus(
        data
          ? "Cloud plan loaded."
          : "No cloud plan yet. You can save your current plan.",
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Cloud plan could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function authenticate(kind: "login" | "signup") {
    if (!supabase || busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      setStatus(
        "Enter a valid email and a password with at least 8 characters.",
      );
      return;
    }
    setBusy(true);
    const result =
      kind === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setStatus(
      result.error
        ? result.error.message
        : kind === "signup"
          ? "Account created. Check your email if confirmation is required."
          : "Signed in. Load your cloud plan to enable saving.",
    );
    setPassword("");
    setBusy(false);
  }
  function exportPlan() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(portfolio, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-plan.json";
    a.click();
    URL.revokeObjectURL(url);
    setDirty(false);
    setStatus("Draft exported. Cloud and local saves are unchanged.");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          ▥{" "}
          <span>
            Allocation
            <span className="brand-small">YOUR INVESTMENT WORKBENCH</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {["Overview", "Portfolio", "Contributions", "Market", "Account"].map(
            (label, i) => (
              <button
                key={label}
                className={tab === label ? "nav-item active" : "nav-item"}
                onClick={() => setTab(label)}
                aria-current={tab === label ? "page" : undefined}
              >
                <span aria-hidden="true">{["◫", "▦", "+", "↗", "○"][i]}</span>
                {label}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-note">
          <span className="small-label">THE LONG GAME</span>
          <p>
            Small contributions.
            <br />A clear direction.
          </p>
          <span>Build at your own pace.</span>
        </div>
        <div className="account-label">
          <span className="avatar">{user ? "●" : "L"}</span>
          <div>
            {user ? "Personal account" : "Local workspace"}
            <small>{user ? "Cloud available" : "Saved on this device"}</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Personal finance <span className="muted">/ {tab}</span>
          </span>
          <span className="tag">BRL · Brazil</span>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">MAKE EVERY CONTRIBUTION COUNT</span>
              <h1>{tab === "Overview" ? "Your money, with a plan." : tab}</h1>
              <p className="muted">
                Set your direction. See where your next contribution belongs.
              </p>
            </div>
            <button
              className="primary"
              onClick={save}
              disabled={!loaded || busy || !valid || (!!user && !cloudReady)}
            >
              {busy ? "Working…" : dirty ? "Save changes" : "Save plan"}
            </button>
          </div>
          <div className="status" role="status" aria-live="polite">
            {status ||
              (dirty
                ? "Unsaved changes"
                : user
                  ? "Account connected"
                  : "Local mode · Sign in to sync across devices")}
          </div>
          {!valid && (
            <div className="error" role="alert">
              Enter non-negative values, valid names/tickers, and targets
              totaling 100%. Current total: {targetTotal.toFixed(2)}%.
            </div>
          )}
          {tab === "Overview" && (
            <>
              <section className="stats">
                <div>
                  <span className="small-label">CURRENT PORTFOLIO</span>
                  <strong>{money(total)}</strong>
                  <small>
                    {portfolio.holdings.length} positions · manually entered
                    balances
                  </small>
                </div>
                <div>
                  <span className="small-label">MONTHLY BASELINE</span>
                  <strong>{money(portfolio.monthlyAmount)}</strong>
                  <small>Flexible amounts, consistent direction</small>
                </div>
                <div>
                  <span className="small-label">AFTER THIS CONTRIBUTION</span>
                  <strong>
                    {money(total + (Number.isFinite(amount) ? amount : 0))}
                  </strong>
                  <small>No assumed returns or market growth</small>
                </div>
              </section>
              <div className="overview-grid">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">YOUR BALANCE</span>
                      <h2>Where you stand</h2>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("Portfolio")}
                    >
                      Edit portfolio ↗
                    </button>
                  </div>
                  <div
                    className="allocation-strip"
                    aria-label="Current allocation"
                  >
                    {categories.map((category, i) => {
                      const value = portfolio.holdings
                        .filter((h) => h.category === category)
                        .reduce((s, h) => s + h.value, 0);
                      return (
                        <div
                          key={category}
                          style={{
                            width: `${total ? (value / total) * 100 : 0}%`,
                            background: colors[i],
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="legend">
                    <span>Current allocation</span>
                    <span>
                      Target allocation <i className="target-marker" />
                    </span>
                  </div>
                  {categories.map((category, i) => {
                    const rows = portfolio.holdings.filter(
                        (h) => h.category === category,
                      ),
                      value = rows.reduce((s, h) => s + h.value, 0),
                      target = rows.reduce((s, h) => s + h.target, 0),
                      current = total ? (value / total) * 100 : 0;
                    return (
                      <div className="category-row" key={category}>
                        <div className="flex justify-between gap-3">
                          <span>
                            <i
                              className="dot"
                              style={{ background: colors[i] }}
                            />
                            {category}
                          </span>
                          <span>
                            {current.toFixed(1)}%{" "}
                            <small className="muted">/ {target}% target</small>
                          </span>
                        </div>
                        <div className="bar-track">
                          <div
                            style={{
                              width: `${current}%`,
                              background: colors[i],
                            }}
                          />
                          <i style={{ left: `${Math.min(target, 99)}%` }} />
                        </div>
                        <small className="muted">{money(value)}</small>
                      </div>
                    );
                  })}
                </section>
                <section className="panel contribution-panel">
                  <span className="eyebrow">NEXT STEP</span>
                  <h2>Plan your contribution</h2>
                  <label className="field">
                    Contribution amount (BRL)
                    <input
                      aria-label="Contribution amount"
                      type="number"
                      min="0"
                      max="1000000000"
                      step="0.01"
                      value={Number.isNaN(amount) ? "" : amount}
                      onChange={(e) =>
                        setAmount(
                          e.target.value === "" ? NaN : Number(e.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Allocation method
                    <select
                      value={mode}
                      onChange={(e) =>
                        setMode(e.target.value as "target" | "rebalance")
                      }
                    >
                      <option value="rebalance">
                        Prioritize positions below target
                      </option>
                      <option value="target">Follow target percentages</option>
                    </select>
                  </label>
                  <p className="helper">
                    {mode === "rebalance"
                      ? "Distributes proportionally to deficits after the contribution. Positions above target receive zero. No sales required."
                      : "Splits the contribution using your target weights, regardless of current balances."}
                  </p>
                  <div className="contribution-summary">
                    <span>Amount to distribute</span>
                    <strong>
                      {money(Number.isFinite(amount) ? amount : 0)}
                    </strong>
                  </div>
                  <button
                    className="primary w-full"
                    onClick={() => setTab("Contributions")}
                  >
                    See contribution breakdown →
                  </button>
                  <small className="helper">
                    A planning tool. Trades, fees and whole-unit purchases are
                    not executed.
                  </small>
                </section>
              </div>
              <section className="panel mt-6">
                <div className="section-heading">
                  <h2>Your next allocation</h2>
                  <span className="tag">
                    {mode === "rebalance" ? "Deficit-based" : "Target-based"}
                  </span>
                </div>
                {allocationTable()}
              </section>
            </>
          )}
          {tab === "Portfolio" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Positions & target weights</h2>
                  <p className="muted">
                    Enter current balances per asset. Targets are percentages of
                    the entire portfolio.
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={portfolio.holdings.length >= 50}
                  onClick={() =>
                    update({
                      ...portfolio,
                      holdings: [
                        ...portfolio.holdings,
                        {
                          id: crypto.randomUUID(),
                          name: "New asset",
                          ticker: "",
                          category: "Fixed income",
                          value: 0,
                          target: 0,
                        },
                      ],
                    })
                  }
                >
                  + Add asset
                </button>
              </div>
              <div className="portfolio-summary" aria-live="polite">
                <div>
                  <span>Current portfolio</span>
                  <strong>{money(total)}</strong>
                </div>
                <div>
                  <span>Change since last save</span>
                  <strong>
                    {balanceChange > 0 ? "+" : ""}
                    {money(balanceChange)}
                  </strong>
                </div>
                <div>
                  <span>Next contribution</span>
                  <strong>{money(Number.isFinite(amount) ? amount : 0)}</strong>
                </div>
              </div>
              <label className="field portfolio-method">
                Allocation method
                <select
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as "target" | "rebalance")
                  }
                >
                  <option value="rebalance">
                    Prioritize positions below target
                  </option>
                  <option value="target">Follow target percentages</option>
                </select>
              </label>
              <p className="helper">
                Balance changes update the total, current shares and
                contribution suggestions immediately. Targets stay as you set
                them. Changes can include deposits, withdrawals or price
                movements; they are not calculated profits.
              </p>
              <div className="holdings-grid">
                {portfolio.holdings.map((h) => (
                  <HoldingEditor
                    key={h.id}
                    holding={h}
                    savedValue={savedBalances[h.id] ?? 0}
                    total={total}
                    suggestion={
                      valid
                        ? (allocation.find((row) => row.id === h.id)
                            ?.allocation ?? 0)
                        : null
                    }
                    canRemove={portfolio.holdings.length > 1}
                    onChange={(patch) => updateHolding(h.id, patch)}
                    onRemove={() => {
                      setRemoved(h);
                      update({
                        ...portfolio,
                        holdings: portfolio.holdings.filter(
                          (row) => row.id !== h.id,
                        ),
                      });
                    }}
                  />
                ))}
              </div>
              <div className="section-heading mt-4">
                <span>
                  Target total: <strong>{targetTotal.toFixed(2)}%</strong>
                </span>
                {removed && (
                  <button
                    className="secondary"
                    onClick={() => {
                      update({
                        ...portfolio,
                        holdings: [...portfolio.holdings, removed],
                      });
                      setRemoved(null);
                    }}
                  >
                    Undo removal of {removed.name}
                  </button>
                )}
              </div>
            </section>
          )}
          {tab === "Contributions" && (
            <>
              <section className="panel">
                <h2>Flexible monthly planning</h2>
                <div className="form-grid">
                  <label className="field">
                    Default monthly contribution (BRL)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={portfolio.monthlyAmount}
                      onChange={(e) =>
                        update({
                          ...portfolio,
                          monthlyAmount:
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Month
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => selectMonth(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Contribution for this month (BRL)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={Number.isNaN(amount) ? "" : amount}
                      onChange={(e) =>
                        setAmount(
                          e.target.value === "" ? NaN : Number(e.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Allocation method
                    <select
                      value={mode}
                      onChange={(e) =>
                        setMode(e.target.value as "target" | "rebalance")
                      }
                    >
                      <option value="rebalance">
                        Prioritize positions below target
                      </option>
                      <option value="target">Follow target percentages</option>
                    </select>
                  </label>
                </div>
                <button
                  className="primary"
                  onClick={schedule}
                  disabled={!valid || !month}
                >
                  Save monthly override to draft
                </button>
                <p className="helper">
                  Overrides change planned amounts only. Update balances after
                  making actual investments.
                </p>
              </section>
              <section className="panel mt-6">
                <h2>Contribution breakdown</h2>
                {allocationTable()}
              </section>
              <section className="panel mt-6">
                <h2>Scheduled amounts</h2>
                {portfolio.contributions.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Planned contribution</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.contributions.map((c) => (
                          <tr key={c.id}>
                            <td>{c.month}</td>
                            <td>{money(c.amount)}</td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => selectMonth(c.month)}
                              >
                                Use amount
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">
                    No monthly overrides yet. Other months use your default
                    contribution.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "Market" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Market watch</h2>
                  <p className="muted">
                    Your portfolio tickers and selected Brazilian stocks.
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={quoteLoading}
                  onClick={() => setQuoteVersion((v) => v + 1)}
                >
                  Refresh quotes
                </button>
              </div>
              <div className="quote-region" aria-busy={quoteLoading}>
                {quoteLoading && <p role="status">Loading quotes…</p>}
                {quoteError && (
                  <p className="error" role="alert">
                    {quoteError}
                  </p>
                )}
                <div className="quote-grid">
                  {quotes.map((q) => (
                    <article className="quote-card" key={q.symbol}>
                      <span className="small-label">{q.symbol}</span>
                      <p className="muted">{q.name}</p>
                      <strong>{money(q.price)}</strong>
                      <span className={q.change >= 0 ? "positive" : "negative"}>
                        {q.change >= 0 ? "+" : ""}
                        {q.change.toFixed(2)}%
                      </span>
                      <small>
                        {q.timestamp
                          ? new Date(q.timestamp).toLocaleString("en-US", {
                              timeZone: "America/Sao_Paulo",
                            })
                          : "Timestamp unavailable"}
                      </small>
                    </article>
                  ))}
                </div>
                {!quoteLoading && !quoteError && !quotes.length && (
                  <p>No quotes available for these tickers.</p>
                )}
              </div>
              {unavailable.length > 0 && (
                <p className="helper">
                  Unavailable: {unavailable.join(", ")}. Additional tickers may
                  require a brapi key and compatible plan.
                </p>
              )}
              <p className="helper">
                Source:{" "}
                <a
                  href="https://brapi.dev/docs"
                  target="_blank"
                  rel="noreferrer"
                >
                  brapi
                </a>{" "}
                · Responses cached for 5 minutes. Quotes may be delayed and
                never change your entered balances.
              </p>
            </section>
          )}
          {tab === "Account" && (
            <section className="panel account-panel">
              <h2>Keep your plan with you</h2>
              <p className="muted">
                Export your draft anytime. Sign in to save securely across
                devices.
              </p>
              <button className="secondary" onClick={exportPlan}>
                Export plan as JSON
              </button>
              {!supabase ? (
                <p className="helper mt-6">
                  Cloud sync is not configured. Local saving and all planning
                  tools are available.
                </p>
              ) : user ? (
                <>
                  <p className="mt-6">Signed in as {user.email}</p>
                  <button
                    className="primary"
                    disabled={busy || dirty}
                    onClick={loadCloud}
                  >
                    Load cloud plan
                  </button>
                  <p className="helper">
                    Loading replaces this workspace with your saved account
                    plan. Export any local draft first.
                  </p>
                  <button
                    className="secondary"
                    disabled={busy || dirty}
                    onClick={async () => {
                      setBusy(true);
                      const { error } = await supabase!.auth.signOut();
                      setBusy(false);
                      setStatus(error ? error.message : "Signed out.");
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    void authenticate("login");
                  }}
                  className="mt-6"
                >
                  <label className="field">
                    Email
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Password
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Hide password" : "Show password"}
                  </button>
                  <div className="flex gap-3 mt-4">
                    <button className="primary" disabled={busy}>
                      Sign in
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => void authenticate("signup")}
                    >
                      Create account
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
          <footer>
            Allocation is a planning tool, not investment advice.{" "}
            <span>Built for steady progress.</span>
          </footer>
        </div>
      </main>
    </div>
  );

  function allocationTable() {
    return <AllocationBreakdown rows={allocation} valid={valid} />;
  }
}
