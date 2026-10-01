import { it, expect, beforeEach } from "vitest";
import {
  readPending,
  savePending,
  clearUser,
  saveSnapshot,
  readSnapshot,
} from "./storage";
beforeEach(() => localStorage.clear());
it("keeps one durable request per user and clears only that user", () => {
  savePending("a", {
    expectedDate: "2026-10-01",
    questId: "q",
    questVersion: 1,
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
  });
  expect(readPending("b")).toBeNull();
  expect(readPending("a")?.questId).toBe("q");
  saveSnapshot("b", { hello: true });
  clearUser("a");
  expect(readPending("a")).toBeNull();
  expect(readSnapshot("b")).toEqual({ hello: true });
});
it("handles corrupt stored data without crashing", () => {
  localStorage.setItem("arc:a:pending", "garbage");
  expect(readPending("a")).toBeNull();
});
