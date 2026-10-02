import { fireEvent, render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { Onboarding } from "./Onboarding";
const save = vi.hoisted(() => vi.fn());
vi.mock("../lib/api", () => ({ saveOnboarding: save }));
it("requires timezone confirmation and displays server validation errors", async () => {
  save.mockRejectedValue(new Error("The five-person beta is full"));
  render(<Onboarding onSaved={vi.fn()} onSignOut={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Begin my arc" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Confirm your timezone");
  fireEvent.change(screen.getByLabelText("Your timezone"), {
    target: { value: "Mars/Crater" },
  });
  fireEvent.click(
    screen.getByLabelText("I confirm this timezone for my daily quests."),
  );
  fireEvent.click(screen.getByRole("button", { name: "Begin my arc" }));
  expect(screen.getByRole("alert")).toHaveTextContent("IANA timezone");
  fireEvent.change(screen.getByLabelText("Your timezone"), {
    target: { value: "UTC" },
  });
  fireEvent.click(
    screen.getByLabelText("I confirm this timezone for my daily quests."),
  );
  fireEvent.click(screen.getByRole("button", { name: "Begin my arc" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("beta is full");
});
