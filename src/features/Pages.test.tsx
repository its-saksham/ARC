import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { TodayPage, QuestPage } from "./Pages";
import type { Today } from "../lib/api";
import { catalog } from "../domain/catalog";
export const fixture: Today = {
  needs_onboarding: false,
  profile: { user_id: "test", focus: "Perception", timezone: "UTC", catalog_version: 1 },
  local_date: "2026-10-02", total_xp: 240, level: 2, rank: "E", streak: 3,
  completed_count: 1,
  attributes: Object.fromEntries(["Strength", "Intelligence", "Vitality", "Charisma", "Perception"].map(a => [a, { xp: 0, score: 20 }])) as Today["attributes"],
  quests: catalog.slice(0, 3).map((q, i) => ({ ...q, quest_version: 1, catalog_version: 1, completed: i === 0, slot: "focus" })),
};
it("makes quests the primary task and labels completed progress", () => {
  render(<MemoryRouter><TodayPage today={fixture} /></MemoryRouter>);
  expect(screen.getByRole("heading", {name: "Make today count."})).toBeVisible();
  expect(screen.getByText("1 of 3 complete")).toBeVisible();
  expect(screen.getByLabelText("Daily quest progress")).toHaveAttribute("value", "1");
  expect(screen.getAllByRole("link")).toHaveLength(3);
  expect(screen.getByText("Completed")).toBeVisible();
  const links = screen.getAllByRole("link");
  const progression = screen.getByRole("region", {name: "Your progression"});
  expect(links[2].compareDocumentPosition(progression) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it("does not allow an unavailable quest to be completed", () => {
  render(<MemoryRouter><QuestPage today={fixture} onComplete={() => {throw new Error("must not complete");}} disabled busy={false} /></MemoryRouter>);
  expect(screen.getByRole("heading", {name:"Quest unavailable"})).toBeVisible();
  expect(screen.queryByRole("button", {name:"Complete quest"})).not.toBeInTheDocument();
});
