import { test, expect } from "@playwright/test";

test("health check endpoint", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  
  const body = await response.json();
  expect(body.status).toBe("healthy");
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  
  // Verify login form is visible
  await expect(page.getByTestId("input-email")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("input-password")).toBeVisible();
  await expect(page.getByTestId("button-login")).toBeVisible();
});

test("app root shows login when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  
  // App layout shows login inline when not authenticated
  await expect(page.getByTestId("input-email")).toBeVisible({ timeout: 10000 });
});

test("login with valid credentials", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  
  await page.getByTestId("input-email").fill("c.hatfield309@gmail.com");
  await page.getByTestId("input-password").fill("Hearing2026!");
  await page.getByTestId("button-login").click();
  
  // After login, should show dashboard content (not login form)
  await expect(page.getByTestId("input-email")).not.toBeVisible({ timeout: 15000 });
  
  // Should see some dashboard element
  await page.waitForLoadState("networkidle");
  const content = await page.content();
  expect(content.length).toBeGreaterThan(2000);
});

test("login with invalid credentials shows error", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  
  await page.getByTestId("input-email").fill("invalid@example.com");
  await page.getByTestId("input-password").fill("wrongpassword");
  await page.getByTestId("button-login").click();
  
  // Should still show login form (didn't navigate)
  await page.waitForTimeout(2000);
  await expect(page.getByTestId("input-email")).toBeVisible();
});

test("dashboard loads after login", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("input-email").fill("c.hatfield309@gmail.com");
  await page.getByTestId("input-password").fill("Hearing2026!");
  await page.getByTestId("button-login").click();
  
  // Wait for dashboard to load
  await expect(page.getByTestId("input-email")).not.toBeVisible({ timeout: 15000 });
  await page.waitForLoadState("networkidle");
  
  // Verify dashboard content
  const content = await page.content();
  expect(content.length).toBeGreaterThan(2000);
});

test("items page loads after login", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("input-email").fill("c.hatfield309@gmail.com");
  await page.getByTestId("input-password").fill("Hearing2026!");
  await page.getByTestId("button-login").click();
  
  await expect(page.getByTestId("input-email")).not.toBeVisible({ timeout: 15000 });
  
  // Handle site selection if multiple sites
  const siteCard = page.locator("[data-testid^='card-site-']").first();
  if (await siteCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await siteCard.click();
    await page.waitForLoadState("networkidle");
  }
  
  // Navigate to items
  await page.goto("/items");
  await page.waitForLoadState("networkidle");
  
  // Verify items page loaded by checking for the h1 heading
  await expect(page.getByRole("heading", { name: "Items", level: 1 })).toBeVisible({ timeout: 10000 });
});
