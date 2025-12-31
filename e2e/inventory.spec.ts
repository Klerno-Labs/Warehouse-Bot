import { test, expect } from "@playwright/test";

test("inventory flow smoke test", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("input-email").fill("admin@example.com");
  await page.getByTestId("input-password").fill("password123");
  await page.getByTestId("button-login").click();

  if (await page.getByText("Select a Site").isVisible()) {
    await page.locator("[data-testid^='card-site-']").first().click();
  }

  await page.goto("/modules/inventory/items");
  await expect(page.getByText("Paper Media")).toBeVisible();

  await page.goto("/stations/receiving");
  await page.getByTestId("button-action-RECEIVE").click();
  await page.getByTestId("input-station-sku").fill("PAPER-MEDIA");
  await page.getByTestId("input-station-to").fill("RECEIVING-01");
  await page.getByTestId("input-station-qty").fill("1");
  await page.getByTestId("select-station-uom").click();
  await page.getByText("ROLL").click();
  await page.getByTestId("button-station-submit").click();

  await page.goto("/stations/stockroom");
  await page.getByTestId("button-action-MOVE").click();
  await page.getByTestId("input-station-sku").fill("PAPER-MEDIA");
  await page.getByTestId("input-station-from").fill("RECEIVING-01");
  await page.getByTestId("input-station-to").fill("STOCK-A1");
  await page.getByTestId("input-station-qty").fill("100");
  await page.getByTestId("select-station-uom").click();
  await page.getByText("FT").click();
  await page.getByTestId("button-station-submit").click();

  await page.goto("/stations/pleater1");
  await page.getByTestId("button-action-ISSUE_TO_WORKCELL").click();
  await page.getByTestId("input-station-sku").fill("PAPER-MEDIA");
  await page.getByTestId("input-station-from").fill("STOCK-A1");
  await page.getByTestId("input-station-to").fill("PLEATER-STAGE");
  await page.getByTestId("input-station-qty").fill("50");
  await page.getByTestId("select-station-uom").click();
  await page.getByText("FT").click();
  await page.getByTestId("button-station-submit").click();

  await page.goto("/modules/inventory/balances");
  await expect(page.getByText("50")).toBeVisible();

  await page.goto("/modules/inventory/events");
  await expect(page.getByText("RECEIVE")).toBeVisible();
  await expect(page.getByText("MOVE")).toBeVisible();
  await expect(page.getByText("ISSUE_TO_WORKCELL")).toBeVisible();
});
