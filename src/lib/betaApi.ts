import { z } from "zod";
import { ApiError, configured, supabase } from "./api";
const timestamp = z.iso.datetime({ offset: true });
const availabilitySchema = z.object({
  capacity: z.number().int().positive(),
  remaining: z.number().int().nonnegative(),
  checked_at: timestamp,
}).refine(value => value.remaining <= value.capacity);
const waitlistSchema = z.discriminatedUnion("joined", [
  z.object({joined:z.literal(true),created_at:timestamp}),
  z.object({joined:z.literal(false),created_at:z.null()}),
]);
export type BetaAvailability = z.infer<typeof availabilitySchema>;
export type WaitlistEntry = z.infer<typeof waitlistSchema>;
export type WaitlistSource = "direct" | "reddit" | "x";
async function request(name:string,args?:Record<string,unknown>,signal?:AbortSignal) {
  if (!configured) throw new Error("ARC is waiting for its connection. Please try again later.");
  const pending = supabase.rpc(name,args);
  const {data,error} = await (signal ? pending.abortSignal(signal) : pending);
  if (error) throw new ApiError(error.message,["28000","PGRST301","PGRST303"].includes(error.code));
  return data;
}
export async function getBetaAvailability(signal?:AbortSignal):Promise<BetaAvailability> {
  return availabilitySchema.parse(await request("get_beta_availability",undefined,signal));
}
export async function getWaitlist(signal?:AbortSignal):Promise<WaitlistEntry> {
  return waitlistSchema.parse(await request("get_waitlist",undefined,signal));
}
export async function joinWaitlist(source:WaitlistSource,signal?:AbortSignal):Promise<WaitlistEntry> {
  return waitlistSchema.parse(await request("join_waitlist",{p_source:source},signal));
}
export async function leaveWaitlist(signal?:AbortSignal):Promise<WaitlistEntry> {
  return waitlistSchema.parse(await request("leave_waitlist",undefined,signal));
}
