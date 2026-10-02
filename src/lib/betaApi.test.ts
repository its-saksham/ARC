import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("./api", () => ({supabase: {rpc:mock.rpc}, configured:true, ApiError:class extends Error {}}));
import { getBetaAvailability, getWaitlist, joinWaitlist, leaveWaitlist } from "./betaApi";
beforeEach(() => vi.clearAllMocks());
it("validates availability and rejects malformed or impossible counts", async () => {
  mock.rpc.mockResolvedValueOnce({ data:{capacity:15,remaining:14,checked_at:"2026-10-02T10:00:00Z"},error:null });
  expect(await getBetaAvailability()).toEqual({capacity:15,remaining:14,checked_at:"2026-10-02T10:00:00Z"});
  mock.rpc.mockResolvedValueOnce({data:{capacity:15,remaining:16,checked_at:"bad"},error:null});
  await expect(getBetaAvailability()).rejects.toThrow();
});
it("uses authenticated narrow RPCs for join, read and leave", async () => {
  mock.rpc.mockResolvedValue({data:{joined:true,created_at:"2026-10-02T10:00:00Z"},error:null});
  expect(await joinWaitlist("reddit")).toHaveProperty("joined",true);
  expect(mock.rpc).toHaveBeenCalledWith("join_waitlist",{p_source:"reddit"});
  expect(await getWaitlist()).toHaveProperty("joined",true);
  mock.rpc.mockResolvedValue({data:{joined:false,created_at:null},error:null});
  expect(await leaveWaitlist()).toEqual({joined:false,created_at:null});
});
