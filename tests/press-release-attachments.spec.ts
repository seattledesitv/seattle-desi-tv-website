import { test, expect } from "@playwright/test";

const files = (count: number, start = 0) => Array.from({ length: count }, (_, index) => ({
  name: `photo-${start + index + 1}.png`, mimeType: "image/png", buffer: Buffer.from("test-image"),
}));

test("30 attachments upload, save, and a removed attachment can be replaced", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/attachments");
  const attachments = page.getByLabel("Attachments (up to 30");
  await attachments.setInputFiles(files(30));
  await expect(page.getByTestId("upload-count")).toHaveText("30");
  await expect(page.getByRole("button", { name: /Remove document/ })).toHaveCount(30);
  await expect(attachments).toBeDisabled();
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByTestId("saved-release")).not.toBeEmpty();
  const saved = JSON.parse(await page.getByTestId("saved-release").textContent() || "{}");
  expect(saved.documents).toHaveLength(30);
  expect(saved.documents[29].name).toBe("photo-30.png");
  // The existing form resets after a successful submission.
  await expect(attachments).toBeEnabled();
  await attachments.setInputFiles(files(30));
  await page.getByRole("button", { name: "Remove document 1", exact: true }).click();
  await expect(attachments).toBeEnabled();
  await attachments.setInputFiles(files(1, 30));
  await expect(page.getByRole("button", { name: /Remove document/ })).toHaveCount(30);
  await expect(page.getByText("photo-31.png", { exact: true })).toBeVisible();
});

test("31 attachments and batches exceeding remaining capacity are rejected before uploading", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/attachments");
  const attachments = page.getByLabel("Attachments (up to 30");
  await attachments.setInputFiles(files(31));
  await expect(page.getByTestId("upload-count")).toHaveText("0");
  await expect(page.getByText("You can add 30 more attachments (30 per press release).")).toBeVisible();
  await attachments.setInputFiles(files(29));
  await expect(page.getByTestId("upload-count")).toHaveText("29");
  await attachments.setInputFiles(files(2, 29));
  await expect(page.getByTestId("upload-count")).toHaveText("29");
  await expect(page.getByText("You can add 1 more attachment (30 per press release).")).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove document/ })).toHaveCount(29);
  await expect(page.getByLabel("Images (up to 30)")).toBeEnabled();
});
