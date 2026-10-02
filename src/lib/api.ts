import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Pending } from "./storage";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "unconfigured",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
const attribute = z.enum([
  "Strength",
  "Intelligence",
  "Vitality",
  "Charisma",
  "Perception",
]);
export const questSchema = z.object({
  id: z.string(),
  quest_version: z.number(),
  catalog_version: z.number(),
  title: z.string(),
  instructions: z.string(),
  attribute,
  effort: z.enum(["light", "standard", "deep"]),
  xp: z.number(),
  repeatable: z.boolean(),
  completed: z.boolean(),
  slot: z.string(),
});
export type DailyQuest = z.infer<typeof questSchema>;
export const todaySchema = z.object({
  needs_onboarding: z.literal(false),
  profile: z.object({
    user_id: z.string(),
    focus: attribute,
    timezone: z.string(),
    catalog_version: z.number(),
  }),
  local_date: z.string(),
  total_xp: z.number(),
  level: z.number(),
  rank: z.string(),
  streak: z.number(),
  completed_count: z.number(),
  attributes: z.record(
    attribute,
    z.object({ xp: z.number(), score: z.number() }),
  ),
  quests: z.array(questSchema),
});
export type Today = z.infer<typeof todaySchema>;
export type TodayResult = Today | { needs_onboarding: true };
export class ApiError extends Error {
  constructor(
    message: string,
    public expired = false,
  ) {
    super(message);
  }
}
async function rpc(
  name: string,
  args?: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const request = supabase.rpc(name, args);
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error)
    throw new ApiError(
      error.message,
      ["28000", "PGRST301", "PGRST303"].includes(error.code),
    );
  return data;
}
export async function getToday(signal?: AbortSignal): Promise<TodayResult> {
  const data = await rpc("get_today", undefined, signal);
  if (data?.needs_onboarding === true) return { needs_onboarding: true };
  return todaySchema.parse(data);
}
export async function saveOnboarding(focus: string, timezone: string) {
  return rpc("save_onboarding", { p_focus: focus, p_timezone: timezone });
}
export async function completeQuest(p: Pending, signal?: AbortSignal) {
  const data = await rpc(
    "complete_quest",
    {
      p_quest_id: p.questId,
      p_quest_version: p.questVersion,
      p_idempotency_key: p.idempotencyKey,
      p_expected_date: p.expectedDate,
    },
    signal,
  );
  return { completion: data.completion, today: todaySchema.parse(data.today) };
}
export async function trackEvent(event: string) {
  try {
    await rpc("track_event", { p_event: event });
  } catch {
    /* Optional analytics must never block the product. */
  }
}
