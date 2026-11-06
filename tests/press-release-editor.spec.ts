import { test, expect } from "@playwright/test";

test("formatting, links, saving, editing, and reset work in the browser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173");
  const editor = page.getByRole("textbox", { name: "Full press release" });
  await expect(editor).toContainText("Existing release & community news");
  await expect(editor.locator("br")).toHaveCount(1);
  await editor.fill("Seattle community announcement");
  await editor.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(editor.locator("strong")).toHaveText("Seattle community announcement");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page.getByLabel("Link address").fill("https://example.com/news");
  await page.getByRole("button", { name: "Apply link", exact: true }).click();
  await page.getByRole("button", { name: "Save preview" }).click();
  const preview = page.getByRole("article", { name: "Published preview" });
  await expect(preview.locator("strong")).toHaveText("Seattle community announcement");
  await expect(preview.getByRole("link")).toHaveAttribute("href", "https://example.com/news");
  await expect(preview.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByRole("button", { name: "Reset body" }).click();
  await expect(editor).toBeEmpty();
  await page.getByRole("button", { name: "Reload saved body" }).click();
  await expect(editor.locator("strong")).toHaveText("Seattle community announcement");
  await expect(editor.locator("a")).toHaveAttribute("href", "https://example.com/news");
  await page.screenshot({ path: "test-results/press-release-editor.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("pasting rich text preserves formatting and typed URLs become links", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  const editor = page.getByRole("textbox", { name: "Full press release" });
  await editor.fill("");
  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.setData("text/html", '<h2>Community news</h2><p><em>Announcement</em></p><ul><li>First item</li></ul>');
    data.setData("text/plain", "Community news\nAnnouncement\nFirst item");
    element.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(editor.locator("h2")).toHaveText("Community news");
  await expect(editor.locator("em")).toHaveText("Announcement");
  await expect(editor.locator("li")).toContainText("First item");
  await editor.fill("");
  await editor.pressSequentially("https://example.com ");
  await expect(editor.locator("a")).toHaveAttribute("href", "https://example.com");
});
