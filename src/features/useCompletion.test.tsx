import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { it, expect, vi } from "vitest";
import { useCompletion } from "./useCompletion";
import { loadToday } from "../lib/loadToday";
import type { Today } from "../lib/api";
import { catalog } from "../domain/catalog";
import { attributes } from "../domain/assignment";
const mocks = vi.hoisted(() => ({ complete: vi.fn(), read: vi.fn() }));
vi.mock("../lib/api", async () => ({
  ...(await vi.importActual<typeof import("../lib/api")>("../lib/api")),
  completeQuest: mocks.complete,
  getToday: mocks.read,
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));
it("cancels late background snapshots before authoritative completion reconciliation", async () => {
  localStorage.clear();
  const user = "u";
  const today: Today = {
    needs_onboarding: false,
    profile: {
      user_id: user,
      focus: "Perception",
      timezone: "UTC",
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
    quests: [catalog[20], catalog[0], catalog[5]].map((q) => ({
      ...q,
      quest_version: 1,
      catalog_version: 1,
      slot: "focus",
      completed: false,
    })),
  };
  const saved = {
    ...today,
    total_xp: 10,
    completed_count: 1,
    quests: today.quests.map((q, i) => ({ ...q, completed: i === 0 })),
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["today", user], today);
  let finish!: () => void;
  const completion = new Promise((resolve) => {
    finish = () => resolve({ today: saved, completion: { id: "c" } });
  });
  mocks.complete.mockReturnValue(completion);
  const { result } = renderHook(() => useCompletion(user), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  act(() => result.current.complete(today.quests[0]));
  await waitFor(() => expect(result.current.busy).toBe(true));
  let stale!: () => void;
  const delayed = new Promise<Today>((resolve) => {
    stale = () => resolve(today);
  });
  const read = client
    .fetchQuery({
      queryKey: ["today", user],
      queryFn: ({ signal }) => loadToday(user, signal, () => delayed),
    })
    .catch(() => null);
  await act(async () => {
    finish();
    await completion;
  });
  await waitFor(() => expect(result.current.busy).toBe(false));
  await act(async () => {
    stale();
    await read;
  });
  expect(client.getQueryData<Today>(["today", user])?.total_xp).toBe(10);
  expect(JSON.parse(localStorage.getItem("arc:u:snapshot")!).total_xp).toBe(10);
});
