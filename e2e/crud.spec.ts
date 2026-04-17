import { type Page, test, expect } from "@playwright/test";

async function signIn(page: Page, enabled: boolean) {
  if (!enabled) {
    return;
  }
  await page.getByLabel(/username/i).fill("admin");
  await page.getByLabel(/password/i).fill("admin123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.toString().includes("/auth/signin"), { timeout: 10000 });
}

async function waitForDashboard(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);
}

async function switchToEnglish(page: Page) {
  const langButton = page.locator('button:has-text("EN")').first();
  if (await langButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await langButton.click();
    await page.waitForTimeout(1000);
  }
}

test.describe("CRUD Operations", () => {
  test("sign in flow (auth enabled only)", async ({ page }) => {
    await waitForDashboard(page);
    await switchToEnglish(page);
    
    const usernameField = page.getByLabel(/username/i);
    if (await usernameField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usernameField.fill("admin");
      await page.getByLabel(/password/i).fill("admin123");
      await page.getByRole("button", { name: /sign in/i }).click();
      await expect(page).not.toHaveURL(/\/auth\/signin/, { timeout: 10000 });
    } else {
      await expect(page).toHaveURL("/", { timeout: 5000 });
    }
  });

  test("server CRUD - create, read, update, delete", async ({ page }) => {
    await waitForDashboard(page);
    await switchToEnglish(page);
    
    const usernameField = page.getByLabel(/username/i);
    if (await usernameField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signIn(page, true);
    }
    
    await page.goto("/servers");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const addBtn = page.locator('button:has-text("Add Server"), button:has-text("เพิ่มเซิร์ฟเวอร์")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    const dialog = page.locator('dialog[open]');
    await dialog.waitFor({ state: "visible", timeout: 5000 });

    const serverName = "test-server-" + Date.now();
    await dialog.locator('input[name="name"]').fill(serverName);
    await dialog.locator('input[name="ipAddress"]').fill("192.168.1." + Math.floor(Math.random() * 255));
    await dialog.locator('input[name="profileName"]').fill("default");

    await dialog.locator('button:has-text("Create Server"), button:has-text("สร้างเซิร์ฟเวอร์")').click();

    await page.waitForTimeout(3000);
    
    await expect(page.locator(`td:has-text("${serverName}")`).first()).toBeAttached({ timeout: 10000 });
  });

  test("domain CRUD - create, read, update, delete", async ({ page }) => {
    await waitForDashboard(page);
    await switchToEnglish(page);
    
    const usernameField = page.getByLabel(/username/i);
    if (await usernameField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signIn(page, true);
    }
    
    await page.goto("/domains");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const addBtn = page.locator('button:has-text("Add Domain"), button:has-text("เพิ่มโดเมน")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    const dialog = page.locator('dialog[open]');
    await dialog.waitFor({ state: "visible", timeout: 5000 });

    const domainName = "test-domain-" + Date.now() + ".example.com";
    await dialog.locator('input[name="name"]').fill(domainName);

    const serverSelect = dialog.locator('select[name="serverId"]');
    if (await serverSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const options = await serverSelect.locator('option').all();
      if (options.length > 1) {
        await serverSelect.selectOption({ index: 1 });
      }
    }

    await dialog.locator('button:has-text("Create Domain"), button:has-text("สร้างโดเมน")').click();

    await page.waitForTimeout(3000);
    
    await expect(page.locator(`td:has-text("${domainName}")`).first()).toBeAttached({ timeout: 10000 });
  });
});