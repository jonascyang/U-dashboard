import { expect, test } from "@playwright/test";

test("overview loads key sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fluid Protocol Dashboard" })).toBeVisible();
  await expect(page.getByText("1. TVL")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
});
