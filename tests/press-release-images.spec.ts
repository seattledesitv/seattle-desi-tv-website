import { test, expect } from "@playwright/test";

const photos = (count: number) => Array.from({ length: count }, (_, i) => ({
  name: `gallery-${i + 1}.png`, mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/YQAAAAASUVORK5CYII=", "base64"),
}));

test("30 gallery images save and replacing the primary image does not create a 31st slot", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/attachments");
  const input = page.getByLabel("Images (up to 30)", { exact: false });
  await input.setInputFiles(photos(30));
  await expect(page.getByTestId("upload-count")).toHaveText("30");
  await expect(page.getByRole("button", { name: /Remove image/ })).toHaveCount(30);
  await expect(input).toBeDisabled();
  await page.getByLabel("Replace primary image and choose its visible card area").setInputFiles({ ...photos(1)[0], name: "replacement.png" });
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByTestId("saved-release")).not.toBeEmpty();
  const saved = JSON.parse(await page.getByTestId("saved-release").textContent() || "{}");
  expect(saved.image_urls).toHaveLength(30);
  expect(saved.image_urls[0]).toBe("https://example.com/uploads/replacement.png");
  expect(saved.image_urls[1]).toBe("https://example.com/uploads/gallery-2.png");
  expect(saved.image_urls[29]).toBe("https://example.com/uploads/gallery-30.png");
});

test("31 gallery images are rejected before upload", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/attachments");
  await page.getByLabel("Images (up to 30)").setInputFiles(photos(31));
  await expect(page.getByTestId("upload-count")).toHaveText("0");
  await expect(page.getByText("You can add 30 more images (30 per press release).")).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove image/ })).toHaveCount(0);
});
