/**
 * Headed Chromium for the four-path test. Human login, sends, and delegate
 * grant go through the website. The client must be Base Sepolia.
 */

import { chromium, type Browser, type Frame, type Locator, type Page } from "playwright";
import { getAddress, type Address } from "viem";

const SEPOLIA_TEXT = "Base Sepolia testnet";

export class CutBrowser {
  private constructor(
    private readonly browser: Browser,
    private readonly page: Page,
    private readonly origin: string,
  ) {}

  static async open(origin: string): Promise<CutBrowser> {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(30_000);
    return new CutBrowser(browser, page, origin);
  }

  async close(): Promise<void> {
    await this.browser.close();
  }

  async assertSepolia(): Promise<void> {
    await this.leaveOnboarding();
    await this.page.goto(`${this.origin}/account/funds`, { waitUntil: "domcontentloaded" });
    await this.leaveOnboarding();
    const note = this.page.getByText(SEPOLIA_TEXT);
    try {
      await note.waitFor({ timeout: 15_000 });
    } catch {
      throw new Error(
        "Client is not on Base Sepolia. Start it with VITE_TARGET_CHAIN=testnet.",
      );
    }
  }

  /** `code` runs after Privy has asked for the email code. */
  async signIn(email: string, code: string | (() => Promise<string>)): Promise<void> {
    await this.page.goto(`${this.origin}/connect`, { waitUntil: "domcontentloaded" });
    await this.page.getByRole("button", { name: "Sign in" }).click();
    const emailInput = await this.visible("#email-input");
    await emailInput.fill(email);
    const frame = await emailInput.elementHandle().then((handle) => handle?.ownerFrame());
    if (!frame) throw new Error("Could not find the Privy email form");
    await frame.getByRole("button", { name: "Submit" }).first().click();
    const otp = await this.visible('input[name="code-0"]');
    const digits = typeof code === "function" ? await code() : code;
    await otp.click();
    await this.page.keyboard.type(digits, { delay: 40 });
    await this.page.waitForURL((url) => !url.pathname.startsWith("/connect"), { timeout: 120_000 });
    await this.leaveOnboarding();
  }

  async signOut(): Promise<void> {
    await this.page.goto(`${this.origin}/account/settings`, { waitUntil: "domcontentloaded" });
    await this.page.getByRole("button", { name: "Sign Out" }).click();
    await this.page.waitForURL(/\/connect/, { timeout: 30_000 });
  }

  async kernelAddress(): Promise<Address> {
    await this.leaveOnboarding();
    await this.page.goto(`${this.origin}/account/settings`, { waitUntil: "domcontentloaded" });
    const title = await this.page
      .locator("div", { has: this.page.getByText("Wallet address", { exact: true }) })
      .locator('span[title^="0x"]')
      .first()
      .getAttribute("title");
    if (!title) throw new Error("Settings did not show a wallet");
    return getAddress(title);
  }

  async send(to: Address, amount: string): Promise<void> {
    await this.assertSepolia();
    await this.page.goto(`${this.origin}/account/funds?tab=send`, { waitUntil: "domcontentloaded" });
    await this.page.locator("#recipient").fill(to);
    await this.page.locator("#send-amount").fill(amount);
    const review = this.page.getByRole("button", { name: "Review send" });
    await review.waitFor();
    await this.page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find((node) =>
        node.textContent?.includes("Review send"),
      );
      return button instanceof HTMLButtonElement && !button.disabled;
    });
    await review.click();
    await this.page.getByRole("button", { name: /^Send / }).click();
    await this.waitUntilConfirmed();
  }

  async grant(publicKey: string): Promise<void> {
    await this.page.goto(`${this.origin}/account/agents`, { waitUntil: "domcontentloaded" });
    await this.page.locator("#agent-public-key").fill(publicKey);
    await this.page.getByRole("button", { name: "Grant full access" }).click();
    const shown = `${publicKey.slice(0, 8)}…${publicKey.slice(-8)}`;
    const granted = this.page.getByText(shown);
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (await granted.isVisible().catch(() => false)) return;
      const alert = this.page.getByRole("alert");
      if (await alert.isVisible().catch(() => false)) {
        throw new Error((await alert.innerText()) || "Grant failed");
      }
      await this.page.waitForTimeout(300);
    }
    throw new Error("Delegate grant was not confirmed");
  }

  private async leaveOnboarding(): Promise<void> {
    if (!this.page.url().includes("/onboarding")) return;
    const skip = this.page.getByRole("button", { name: "Skip for now" });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else await this.page.getByRole("button", { name: "Exit" }).click();
    await this.page.waitForURL((url) => !url.pathname.startsWith("/onboarding"), {
      timeout: 30_000,
    });
  }

  private async waitUntilConfirmed(): Promise<void> {
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const confirmed = this.page.getByRole("button", { name: "Confirmed" });
      if (await confirmed.isVisible().catch(() => false)) return;
      const alert = this.page.getByRole("alert");
      if (await alert.isVisible().catch(() => false)) {
        throw new Error((await alert.innerText()) || "Send failed");
      }
      await this.page.waitForTimeout(400);
    }
    throw new Error("Send was not confirmed");
  }

  private async visible(selector: string, timeout = 20_000): Promise<Locator> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      for (const frame of this.frames()) {
        const locator = frame.locator(selector).first();
        if (await locator.isVisible().catch(() => false)) return locator;
      }
      await this.page.waitForTimeout(200);
    }
    throw new Error(`Could not find ${selector}`);
  }

  private frames(): Frame[] {
    return this.page.frames();
  }
}
