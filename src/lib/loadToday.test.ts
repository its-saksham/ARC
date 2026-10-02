import { expect, it } from "vitest";
import { loadToday } from "./loadToday";
import { readSnapshot } from "./storage";
it("does not recreate snapshots when logout cancels an in-flight query", async () => {
  localStorage.clear();
  const controller = new AbortController();
  await expect(
    loadToday("a", controller.signal, async () => {
      controller.abort();
      return { needs_onboarding: true };
    }),
  ).rejects.toThrow();
  expect(readSnapshot("a")).toBeNull();
});
