import { test, expect } from "@playwright/test";

test("gallery opens at the clicked image and supports next, previous, keys, wraparound, and focus restoration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/gallery");
  const opener = page.getByRole("button", { name: "View image 2 of 30", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("2 / 30");
  await dialog.getByRole("button", { name: "Next image", exact: true }).click();
  await expect(dialog.getByRole("img", { name: /image 3 of 30/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Previous image", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("2 / 30");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("status")).toHaveText("3 / 30");
  await page.keyboard.press("End");
  await expect(dialog.getByRole("status")).toHaveText("30 / 30");
  await dialog.getByRole("button", { name: "Next image", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("1 / 30");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByRole("status")).toHaveText("30 / 30");
  await page.keyboard.press("Home");
  await expect(dialog.getByRole("status")).toHaveText("1 / 30");
  await dialog.getByRole("button", { name: "Go to image 15", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("15 / 30");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  expect(errors).toEqual([]);
});

test("gallery handles a single image and an empty release", async ({ page }) => {
  await test.step("open singleton fixture", async () => { await page.goto("http://127.0.0.1:4173/gallery?single", { timeout: 10000 }); });
  await test.step("open singleton gallery", async () => { await page.getByRole("button", { name: "View image", exact: true }).click({ timeout: 5000 }); });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status")).toHaveText("1 / 1");
  await expect(dialog.getByRole("button", { name: "Next image" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Previous image" })).toBeDisabled();
  await test.step("close singleton gallery", async () => { await dialog.getByRole("button", { name: "Close image gallery" }).click({ timeout: 5000 }); });
  await expect(dialog).not.toBeVisible();
  await test.step("open empty fixture", async () => { await page.goto("http://127.0.0.1:4173/gallery?empty", { timeout: 10000 }); });
  await expect(page.getByText("Seattle Desi TV", { exact: false })).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
});

test("gallery fits mobile portrait and landscape, and traps keyboard focus", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto("http://127.0.0.1:4173/gallery");
    await page.getByRole("button", { name: "View all 30 images" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Close image gallery" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    const next = dialog.getByRole("button", { name: "Next image", exact: true });
    const control = await next.boundingBox();
    expect(control!.y + control!.height).toBeLessThanOrEqual(viewport.height);
    await next.click();
    await expect(dialog.getByRole("status")).toHaveText("2 / 30");
    await page.screenshot({ path: `test-results/release-gallery-${viewport.width}.png`, fullPage: true });
    await dialog.getByRole("button", { name: "Close image gallery" }).click();
    await expect(dialog).not.toBeVisible();
  }
});
