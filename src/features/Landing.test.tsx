import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({get:vi.fn()}));
vi.mock("../lib/betaApi", () => ({getBetaAvailability:api.get}));
import { Landing } from "./Landing";
beforeEach(() => {vi.clearAllMocks(); Object.defineProperty(navigator,"onLine",{value:true,configurable:true});});
it("uses real aggregate availability and routes a full beta to the waitlist", async () => {
  api.get.mockResolvedValue({capacity:15,remaining:0,checked_at:"2026-10-02T10:00:00Z"});
  render(<MemoryRouter><Landing signedIn={false} /></MemoryRouter>);
  expect(await screen.findByText(/Beta is full/)).toBeVisible();
  expect(screen.getAllByRole("link",{name:"Join waitlist"})[0]).toHaveAttribute("href","/waitlist");
  expect(screen.queryByRole("link",{name:"Start free beta"})).not.toBeInTheDocument();
});
it("clears numeric availability on offline and supports retry after a failure", async () => {
  api.get.mockResolvedValueOnce({capacity:15,remaining:14,checked_at:"2026-10-02T10:00:00Z"}).mockRejectedValueOnce(new Error("network")).mockResolvedValue({capacity:15,remaining:13,checked_at:"2026-10-02T10:01:00Z"});
  render(<MemoryRouter><Landing signedIn={false} /></MemoryRouter>);
  expect(await screen.findByText("14 of 15 beta spots left")).toBeVisible();
  Object.defineProperty(navigator,"onLine",{value:false,configurable:true});
  fireEvent(window,new Event("offline"));
  expect(screen.queryByText("14 of 15 beta spots left")).not.toBeInTheDocument();
  Object.defineProperty(navigator,"onLine",{value:true,configurable:true});
  fireEvent(window,new Event("online"));
  await waitFor(() => expect(screen.getByRole("button",{name:"Retry availability"})).toBeEnabled());
  fireEvent.click(screen.getByRole("button",{name:"Retry availability"}));
  expect(await screen.findByText("13 of 15 beta spots left")).toBeVisible();
});
