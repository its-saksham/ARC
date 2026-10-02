import { test, expect, type Page } from "@playwright/test";
import { catalog } from "../../src/domain/catalog";
import { attributes } from "../../src/domain/assignment";
import type { Today } from "../../src/lib/api";
const uid = "11111111-1111-4111-8111-111111111111";
async function backend(page: Page) {
  let onboarded = false;
  let loseResponse = false;
  const keys: string[] = [];
  const awarded = new Map<string, string>();
  const today: Today = {
    needs_onboarding: false,
    profile: {
      user_id: uid,
      focus: "Perception",
      timezone: "Asia/Kolkata",
      catalog_version: 1,
    },
    local_date: "2026-10-01",
    total_xp: 0,
    level: 1,
    rank: "E",
    streak: 0,
    completed_count: 0,
    attributes: Object.fromEntries(
      attributes.map((a) => [a, { xp: 0, score: 20 }]),
    ) as Today["attributes"],
    quests: [catalog[20], catalog[0], catalog[5]].map((q, i) => ({
      ...q,
      quest_version: 1,
      catalog_version: 1,
      slot: ["focus", "weakest", "balance"][i],
      completed: false,
    })),
  };
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "beta@example.com",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: uid,
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: "authenticated",
        role: "authenticated",
      }),
    ).toString("base64url"),
    "test-only-signature",
  ].join(".");
  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postDataJSON() ?? {};
    const fulfill = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (request.method() === "OPTIONS") return fulfill({});
    if (path.endsWith("/otp")) return fulfill({});
    if (path.endsWith("/verify") || path.endsWith("/token"))
      return fulfill({
        access_token: token,
        refresh_token: "test-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user,
      });
    if (path.endsWith("/user")) return fulfill(user);
    if (path.endsWith("/logout")) return fulfill({});
    if (path.endsWith("/get_today"))
      return fulfill(onboarded ? today : { needs_onboarding: true });
    if (path.endsWith("/save_onboarding")) {
      onboarded = true;
      today.profile.focus = body.p_focus;
      today.profile.timezone = body.p_timezone;
      return fulfill(today.profile);
    }
    if (path.endsWith("/track_event")) return fulfill(null);
    if (path.endsWith("/complete_quest")) {
      keys.push(body.p_idempotency_key);
      const quest = today.quests.find((q) => q.id === body.p_quest_id)!;
      if (
        awarded.has(body.p_idempotency_key) &&
        awarded.get(body.p_idempotency_key) !== quest.id
      )
        return fulfill(
          {
            message: "Idempotency key belongs to a different quest",
            code: "P0001",
          },
          400,
        );
      if (!quest.completed) {
        quest.completed = true;
        today.total_xp += quest.xp;
        today.completed_count++;
        today.streak = 1;
        today.attributes[quest.attribute].xp += quest.xp;
        today.attributes[quest.attribute].score =
          20 +
          Math.floor(2.5 * Math.sqrt(today.attributes[quest.attribute].xp));
      }
      awarded.set(body.p_idempotency_key, quest.id);
      if (loseResponse) {
        loseResponse = false;
        return fulfill(
          { message: "Response lost. Retry safely.", code: "NETWORK" },
          503,
        );
      }
      return fulfill({ completion: { id: "server-completion" }, today });
    }
    return fulfill({ message: "Unexpected endpoint" }, 400);
  });
  return {
    today,
    keys,
    loseNextResponse: () => {
      loseResponse = true;
    },
  };
}
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email address").fill("beta@example.com");
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify code" }).click();
  await page.getByLabel("I confirm this timezone for my daily quests.").check();
  await page.getByRole("button", { name: "Begin my arc" }).click();
  await expect(
    page.getByRole("heading", { name: "Today’s quests" }),
  ).toBeVisible();
}
test("rejected onboarding offers account switching", async ({ page }) => {
  await backend(page);
  await page.route("**/rest/v1/rpc/save_onboarding", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: "P0001",
        message: "The five-person beta is full",
      }),
    }),
  );
  await page.goto("/");
  await page.getByLabel("Email address").fill("beta@example.com");
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify code" }).click();
  await page.getByLabel("I confirm this timezone for my daily quests.").check();
  await page.getByRole("button", { name: "Begin my arc" }).click();
  await expect(page.getByRole("alert")).toContainText("beta is full");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
});
test("background reads cannot replace in-flight completion progress", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/rest/v1/rpc/complete_quest", async (route) => {
    await gate;
    await route.fallback();
  });
  await page.getByRole("link", { name: /Choose one priority/ }).click();
  await page
    .getByRole("button", { name: "Complete quest", exact: true })
    .click();
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByLabel("Daily quest progress")).toHaveAttribute(
    "value",
    "1",
  );
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await expect
    .poll(() => page.getByLabel("Daily quest progress").getAttribute("value"))
    .toBe("1");
  release();
  await expect(page.getByText("Saving your progress…")).toHaveCount(0);
  await expect(page.getByLabel("Daily quest progress")).toHaveAttribute(
    "value",
    "1",
  );
});
test("expired sessions show recovery and support sign out", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await page.route("**/rest/v1/rpc/get_today", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "PGRST301", message: "JWT expired" }),
    }),
  );
  await page.reload();
  await expect(
    page.getByText("Your session expired. Sign out and sign in again."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
});
test("optimistic completion prevents duplicate submissions and logout cancels recovery", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/rest/v1/rpc/complete_quest", async (route) => {
    await gate;
    await route.fallback().catch(() => {});
  });
  await page.getByRole("link", { name: /Choose one priority/ }).click();
  await page
    .getByRole("button", { name: "Complete quest", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Saving progress…" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByLabel("Daily quest progress")).toHaveAttribute(
    "value",
    "1",
  );
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  release();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage).filter((k) => k.startsWith("arc:")),
      ),
    )
    .toEqual([]);
});
test("mobile OTP → onboarding → quest → status → profile → logout", async ({
  page,
}) => {
  const b = await backend(page);
  await login(page);
  await page.getByRole("link", { name: /Choose one priority/ }).click();
  await page
    .getByRole("button", { name: "Complete quest", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Quest complete" }),
  ).toBeVisible();
  expect(b.today.total_xp).toBe(10);
  await page.getByRole("link", { name: "Status", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Attribute radar chart" }),
  ).toBeVisible();
  await expect(
    page.getByText("Perception: 27 out of 100", { exact: false }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.getByText("beta@example.com")).toBeVisible();
  await page.screenshot({
    path: "test-results/arc-mobile-profile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("arc:")),
    ),
  ).toEqual([]);
});
test("lost response survives reload with the same key and offline is read-only", async ({
  page,
  context,
}) => {
  const b = await backend(page);
  await login(page);
  b.loseNextResponse();
  await page.getByRole("link", { name: /Choose one priority/ }).click();
  await page
    .getByRole("button", { name: "Complete quest", exact: true })
    .click();
  await expect(page.getByText("Response lost. Retry safely.")).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem(
          "arc:11111111-1111-4111-8111-111111111111:pending",
        )!,
      ),
    ),
  ).toHaveProperty("idempotencyKey");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Quest complete" }),
  ).toBeVisible();
  expect(b.keys.length).toBe(2);
  expect(b.keys[0]).toBe(b.keys[1]);
  expect(b.today.total_xp).toBe(10);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Offline · Read-only snapshot/)).toBeVisible();
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("link", { name: /Gentle mobility/ }).click();
  await expect(
    page.getByRole("button", { name: "Complete quest", exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
});
