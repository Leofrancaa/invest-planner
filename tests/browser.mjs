import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000");
await page.getByRole("heading", { name: "Your money, with a plan." }).waitFor();
await page.getByRole("button", { name: "Portfolio", exact: true }).click();
assert.equal(
  await page
    .getByRole("textbox", { name: "Name btg", exact: true })
    .inputValue(),
  "BTG Pactual CDB",
);
await page
  .getByRole("spinbutton", { name: "Balance btg", exact: true })
  .fill("900");
assert.match(await page.locator(".portfolio-summary").innerText(), /79\.57/);
assert.equal(await page.getByRole("spinbutton", { name: "Target btg", exact: true }).inputValue(), "60");
const itauCard = page.getByRole("article", { name: "Position itau", exact: true });
await page.getByRole("spinbutton", { name: "Balance itau", exact: true }).fill("300");
assert.match(await itauCard.locator(".allocation-value").innerText(), /0\.00/);
await page.getByRole("spinbutton", { name: "Balance itau", exact: true }).fill("0");
await page.getByRole("button", { name: "Save changes" }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Plan saved on this device." })
  .waitFor();
await page.reload();
await page.getByRole("button", { name: "Portfolio", exact: true }).click();
assert.equal(
  await page
    .getByRole("spinbutton", { name: "Balance btg", exact: true })
    .inputValue(),
  "900",
);
assert.match(await page.locator(".portfolio-summary").innerText(), /Change since last save\s+R\$\s*0\.00/);
await page
  .getByRole("spinbutton", { name: "Target btg", exact: true })
  .fill("59");
await page.getByRole("alert").filter({ hasText: "99.00%" }).waitFor();
assert.equal(
  await page.getByRole("button", { name: "Save changes" }).isDisabled(),
  true,
);
await page
  .getByRole("spinbutton", { name: "Target btg", exact: true })
  .fill("60");
await page.getByRole("button", { name: "Remove", exact: true }).last().click();
await page.getByRole("button", { name: /Undo removal/ }).click();
await page.getByRole("button", { name: "Contributions", exact: true }).click();
await page.getByLabel("Month", { exact: true }).fill("2026-11");
await page.getByLabel("Contribution for this month (BRL)").fill("750");
await page
  .getByRole("button", { name: "Save monthly override to draft" })
  .click();
await page.getByRole("cell", { name: "2026-11", exact: true }).waitFor();
await page.getByRole("button", { name: "Save changes" }).click();
await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.screenshot({ path: "tests/desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "tests/mobile.png", fullPage: true });
for (const width of [320, 390, 768]) {
  await page.setViewportSize({ width, height: 844 });
  await page.getByRole("button", { name: "Portfolio", exact: true }).click();
  assert.equal(await page.getByRole("article", { name: "Position btg", exact: true }).isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  for (const name of ["Overview", "Portfolio", "Contributions", "Market", "Account"]) {
    const bounds = await page.getByRole("button", { name, exact: true }).boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
  }
}
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "tests/mobile-portfolio.png", fullPage: true });
await page.getByRole("button", { name: "Overview", exact: true }).click();
assert.equal(await page.locator(".allocation-cards").isVisible(), true);
assert.equal(await page.locator(".allocation-desktop").isVisible(), false);
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
  true,
);
await page.getByRole("button", { name: "Market", exact: true }).click();
await page.getByRole("heading", { name: "Market watch" }).waitFor();
await page.waitForTimeout(1500);
assert.deepEqual(errors, []);
console.log(
  "Browser checks passed: edit, persist, invalid weights, undo, monthly override, mobile layout, no page errors.",
);
await browser.close();
