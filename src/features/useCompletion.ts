import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  completeQuest,
  getToday,
  supabase,
  type Today,
  type DailyQuest,
} from "../lib/api";
import {
  clearPending,
  readPending,
  savePending,
  saveSnapshot,
} from "../lib/storage";
import { level, rank, radarScore } from "../domain/progression";
import { recoverCompletion } from "./completion";
export function useCompletion(user: string) {
  const client = useQueryClient();
  const key = ["today", user];
  const [pending, setPending] = useState(() => readPending(user));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== user) {
        active.current = false;
        request.current?.abort();
      }
    });
    return () => {
      active.current = false;
      request.current?.abort();
      subscription.unsubscribe();
    };
  }, [user]);
  const execute = useCallback(async () => {
    if (locked.current || !readPending(user)) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const previous = client.getQueryData<Today>(["today", user]);
    const p = readPending(user)!;
    const q = previous?.quests.find(
      (q) => q.id === p.questId && q.quest_version === p.questVersion,
    );
    await client.cancelQueries({ queryKey: ["today", user] });
    if (!active.current) {
      locked.current = false;
      return;
    }
    if (previous && q && !q.completed) {
      const xp = previous.total_xp + q.xp;
      const axp = previous.attributes[q.attribute].xp + q.xp;
      client.setQueryData(["today", user], {
        ...previous,
        total_xp: xp,
        level: level(xp),
        rank: rank(xp),
        streak: Math.max(1, previous.streak),
        completed_count: previous.completed_count + 1,
        attributes: {
          ...previous.attributes,
          [q.attribute]: { xp: axp, score: radarScore(axp) },
        },
        quests: previous.quests.map((item) =>
          item.id === q.id ? { ...item, completed: true } : item,
        ),
      });
    }
    try {
      if (!navigator.onLine)
        throw new Error("You are offline. Connect to complete this quest.");
      const controller = new AbortController();
      request.current = controller;
      const result = await recoverCompletion(
        user,
        (pending) => completeQuest(pending, controller.signal),
        () => active.current,
      );
      await client.cancelQueries({ queryKey: ["today", user] });
      if (result && active.current) {
        client.setQueryData(["today", user], result.today);
        saveSnapshot(user, result.today);
        setPending(null);
      }
    } catch (e) {
      await client.cancelQueries({ queryKey: ["today", user] });
      if (active.current) {
        const current = client.getQueryData<Today>(["today", user]);
        if (previous && current?.local_date === previous.local_date)
          client.setQueryData(["today", user], previous);
        setError(
          e instanceof ApiError && e.expired
            ? "Your session expired. Sign out and sign in again to retry."
            : (e as Error).message,
        );
        try {
          const refreshed = await getToday(request.current?.signal);
          if (active.current && !refreshed.needs_onboarding) {
            client.setQueryData(["today", user], refreshed);
            saveSnapshot(user, refreshed);
          }
        } catch {
          /* Keep the last confirmed snapshot and the original pending key. */
        }
      }
    } finally {
      request.current = null;
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }, [client, user]);
  useEffect(() => {
    if (readPending(user) && navigator.onLine) void execute();
    const online = () => {
      if (readPending(user)) void execute();
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [execute, user]);
  function complete(quest: DailyQuest) {
    if (locked.current || readPending(user) || quest.completed) return;
    const today = client.getQueryData<Today>(["today", user]);
    if (!today?.local_date) {
      setError("Refresh Today before completing a quest.");
      return;
    }
    try {
      const p = {
        expectedDate: today.local_date,
        questId: quest.id,
        questVersion: quest.quest_version,
        idempotencyKey: crypto.randomUUID(),
      };
      savePending(user, p);
      setPending(p);
      void execute();
    } catch {
      setError("Enable browser storage to safely complete quests.");
    }
  }
  function discard() {
    if (busy) return;
    clearPending(user);
    setPending(null);
    setError("");
    void client.invalidateQueries({ queryKey: key });
  }
  return { complete, pending, busy, error, retry: execute, discard };
}
