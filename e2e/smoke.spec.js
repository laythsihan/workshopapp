import { expect, test } from "@playwright/test";

test("login page renders core auth UI", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /workshop/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in|create account/i })).toBeVisible();
});

test("unauthenticated dashboard access redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
