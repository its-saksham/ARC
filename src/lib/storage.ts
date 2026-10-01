import { z } from "zod";
const pendingSchema = z.object({
  expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  questId: z.string(),
  questVersion: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});
export type Pending = z.infer<typeof pendingSchema>;
const key = (user: string, kind: string) => `arc:${user}:${kind}`;
function read(user: string, kind: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key(user, kind)) ?? "null");
  } catch {
    return null;
  }
}
export function readPending(user: string) {
  const result = pendingSchema.safeParse(read(user, "pending"));
  return result.success ? result.data : null;
}
export function savePending(user: string, pending: Pending) {
  localStorage.setItem(
    key(user, "pending"),
    JSON.stringify(pendingSchema.parse(pending)),
  );
}
export function clearPending(user: string) {
  localStorage.removeItem(key(user, "pending"));
}
export function saveSnapshot(user: string, snapshot: unknown) {
  try {
    localStorage.setItem(key(user, "snapshot"), JSON.stringify(snapshot));
  } catch {
    /* Offline reading is best effort; rewards remain server authoritative. */
  }
}
export function readSnapshot(user: string): unknown {
  return read(user, "snapshot");
}
export function clearUser(user: string) {
  for (const kind of ["snapshot", "pending"])
    localStorage.removeItem(key(user, kind));
}
