import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
test("an installed shell prompts for updates and applies them", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => {}));
  await page.reload();
  const original = readFileSync("dist/sw.js", "utf8");
  writeFileSync(
    "dist/sw.js",
    original.replace(/arc-shell-[a-f0-9]+/g, "arc-shell-update-test"),
  );
  try {
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg!.update();
    });
    await expect(page.getByText("A new ARC version is ready.")).toBeVisible();
    await page.getByRole("button", { name: "Update", exact: true }).click();
    await expect(page.getByText("A new ARC version is ready.")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Send code", exact: true }),
    ).toBeVisible();
  } finally {
    writeFileSync("dist/sw.js", original);
  }
});
