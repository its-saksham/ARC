import { expect, it, vi, beforeEach } from "vitest";
import { recoverCompletion } from "./completion";
import { readPending, savePending } from "../lib/storage";
beforeEach(() => localStorage.clear());
it("keeps the key after a lost response and recovers after reload", async () => {
  const p = {
    expectedDate: "2026-10-01",
    questId: "q",
    questVersion: 1,
    idempotencyKey: crypto.randomUUID(),
  };
  savePending("a", p);
  await expect(
    recoverCompletion("a", async () => {
      throw new Error("Network");
    }),
  ).rejects.toThrow("Network");
  expect(readPending("a")).toEqual(p);
  const server = vi.fn(async () => ({ today: "authoritative" }));
  expect(await recoverCompletion("a", server)).toEqual({
    today: "authoritative",
  });
  expect(server).toHaveBeenCalledWith(p);
  expect(readPending("a")).toBeNull();
});
it("does not recreate scoped data if logout happens during a request", async () => {
  const p = {
    expectedDate: "2026-10-01",
    questId: "q",
    questVersion: 1,
    idempotencyKey: crypto.randomUUID(),
  };
  savePending("a", p);
  const alive = { value: true };
  const result = await recoverCompletion(
    "a",
    async () => {
      alive.value = false;
      return "success";
    },
    () => alive.value,
  );
  expect(result).toBeNull();
});
