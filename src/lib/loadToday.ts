import { getToday, type TodayResult } from "./api";
import { saveSnapshot } from "./storage";
export async function loadToday(
  user: string,
  signal: AbortSignal,
  fetchToday: (signal: AbortSignal) => Promise<TodayResult> = getToday,
) {
  const result = await fetchToday(signal);
  if (signal.aborted) throw new DOMException("Query cancelled", "AbortError");
  if (!result.needs_onboarding) {
    if (result.profile.user_id !== user)
      throw new Error("Session changed. Sign in again.");
    saveSnapshot(user, result);
  }
  return result;
}
