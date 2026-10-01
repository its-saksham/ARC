import { clearPending, readPending, type Pending } from "../lib/storage";
export async function recoverCompletion<T>(
  user: string,
  send: (pending: Pending) => Promise<T>,
  isActive: () => boolean = () => true,
): Promise<T | null> {
  const pending = readPending(user);
  if (!pending) return null;
  const result = await send(pending);
  if (!isActive()) return null;
  clearPending(user);
  return result;
}
