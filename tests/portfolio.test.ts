import test from "node:test";
import assert from "node:assert/strict";
import {
  allocate,
  initialPortfolio,
  validatePortfolio,
} from "../src/lib/portfolio";
test("target allocation matches 60/15/10/15 and preserves cents", () => {
  const rows = allocate(initialPortfolio.holdings, 500, "target");
  assert.equal(rows[0].allocation, 300);
  assert.equal(rows[4].allocation, 50);
  assert.equal(rows[5].allocation, 75);
  assert.equal(
    Math.round(rows.reduce((s, h) => s + h.allocation, 0) * 100),
    50000,
  );
});
test("rebalance avoids over-target positions and preserves every cent", () => {
  for (const amount of [0, 0.01, 1.23, 500, 815.77]) {
    const rows = allocate(initialPortfolio.holdings, amount, "rebalance");
    assert.equal(
      Math.round(rows.reduce((s, h) => s + h.allocation, 0) * 100),
      Math.round(amount * 100),
    );
    assert.ok(rows.every((h) => h.allocation >= 0));
    assert.equal(rows.find((h) => h.id === "maxi")?.allocation, 0);
  }
});
test("zero portfolio follows targets in deficit mode", () => {
  const holdings = initialPortfolio.holdings.map((h) => ({ ...h, value: 0 }));
  assert.deepEqual(
    allocate(holdings, 500, "rebalance"),
    allocate(holdings, 500, "target"),
  );
});
test("balance changes adapt suggested contributions without changing targets", () => {
  const before = allocate(initialPortfolio.holdings, 500, "rebalance");
  const holdings = initialPortfolio.holdings.map(h => h.id === "itau" ? { ...h, value: 300 } : h);
  const after = allocate(holdings, 500, "rebalance");
  assert.equal(after.find(h => h.id === "itau")?.allocation, 0);
  assert.ok((before.find(h => h.id === "itau")?.allocation ?? 0) > 0);
  assert.equal(after.find(h => h.id === "itau")?.target, 6);
  assert.equal(Math.round(after.reduce((sum, h) => sum + h.allocation, 0) * 100), 50000);
  assert.ok(after.find(h => h.id === "itau")!.currentPercent > 0);
});
test("invalid financial inputs cannot produce a plan", () => {
  assert.throws(() => allocate(initialPortfolio.holdings, -1, "target"));
  assert.throws(() =>
    allocate(
      initialPortfolio.holdings.map((h) => ({ ...h, target: 0 })),
      500,
      "target",
    ),
  );
  assert.equal(
    validatePortfolio({ ...initialPortfolio, monthlyAmount: Infinity }),
    false,
  );
  assert.equal(
    validatePortfolio({
      ...initialPortfolio,
      holdings: [{ ...initialPortfolio.holdings[0], value: -1 }],
    }),
    false,
  );
});
