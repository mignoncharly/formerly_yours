import { test, expect } from "@playwright/test";

// Public happy-path smoke — the routes a broken deploy would take down first
// (this session had /auth/confirm 502 twice; these guard the rest).

test("landing page loads", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/Once Was Yours/i);
});

test("feed renders", async ({ page }) => {
  await page.goto("/feed");
  await expect(page).toHaveTitle(/Once Was Yours/i);
  await expect(page.getByRole("heading", { name: "Feed", exact: true })).toBeVisible();
});

test("browse exposes search", async ({ page }) => {
  await page.goto("/browse");
  await expect(page.getByPlaceholder(/search/i)).toBeVisible();
});

test("hall of fame renders", async ({ page }) => {
  await page.goto("/hall-of-fame");
  await expect(page.getByRole("heading", { name: "Hall of Fame" })).toBeVisible();
});

test("sign-in offers the magic link", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /sign-in link/i })).toBeVisible();
});

test("a protected route redirects to sign-in", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in/);
});
