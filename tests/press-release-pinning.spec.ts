import { test, expect } from "@playwright/test";

test("pin and unpin controls promote an older release and restore date order", async ({page}) => {
  await page.goto("http://127.0.0.1:4173/pinning");
  await expect(page.getByRole("article").first()).toHaveAttribute("aria-label","recent");
  const older=page.getByRole("article",{name:"older",exact:true});
  await older.getByRole("button",{name:"Pin to top",exact:true}).click();
  await expect(page.getByRole("article").first()).toHaveAttribute("aria-label","older");
  await expect(older.getByRole("button",{name:"Unpin",exact:true})).toHaveAttribute("aria-pressed","true");
  await older.getByRole("button",{name:"Unpin",exact:true}).click();
  await expect(page.getByRole("article").first()).toHaveAttribute("aria-label","recent");
});
test("failed pin saves show an error without changing pin state or list order", async ({page}) => {
  await page.goto("http://127.0.0.1:4173/pinning");
  await page.getByRole("button",{name:"Toggle failed save"}).click();
  const older=page.getByRole("article",{name:"older",exact:true});
  await older.getByRole("button",{name:"Pin to top",exact:true}).click();
  await expect(older.getByRole("alert")).toHaveText("Pin save failed. Try again.");
  await expect(older.getByRole("button",{name:"Pin to top",exact:true})).toBeEnabled();
  await expect(page.getByRole("article").first()).toHaveAttribute("aria-label","recent");
});
