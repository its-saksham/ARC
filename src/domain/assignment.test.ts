import { expect, it } from "vitest";
import { assignQuests, attributes } from "./assignment";
import { catalog } from "./catalog";
import { hash } from "./assignment";
import { createHash } from "node:crypto";
it("catalog has five safe authored quests per canonical attribute and exact effort rewards", () => {
  expect(catalog).toHaveLength(25);
  for (const a of attributes)
    expect(catalog.filter((q) => q.attribute === a)).toHaveLength(5);
  for (const q of catalog)
    expect(q.xp).toBe({ light: 10, standard: 15, deep: 25 }[q.effort]);
});
it("assigns three distinct quests, focus then weakest and remaining balance", async () => {
  const input = {
    userId: "11111111-1111-4111-8111-111111111111",
    date: "2026-10-01",
    focus: "Perception" as const,
    history: [],
  };
  const a = await assignQuests(input);
  expect(a).toHaveLength(3);
  expect(new Set(a.map((q) => q.id)).size).toBe(3);
  expect(a[0].attribute).toBe("Perception");
  expect(await assignQuests(input)).toEqual(a);
  expect(a[2].attribute).not.toBe("Perception");
});
it("today completions do not reshuffle assignments", async () => {
  const base = {
    userId: "u",
    date: "2026-10-01",
    focus: "Vitality" as const,
    history: [],
  };
  const assigned = await assignQuests(base);
  expect(
    await assignQuests({
      ...base,
      history: [
        {
          questId: assigned[0].id,
          questVersion: 1,
          date: base.date,
          attribute: "Vitality",
          xp: 1000,
        },
      ],
    }),
  ).toEqual(assigned);
});
it("excludes recent nonrepeatable quests but allows day eight", async () => {
  const q = catalog.find((q) => !q.repeatable)!;
  let userId = "";
  for (let i = 0; i < 100; i++) {
    const candidate = "test-" + i;
    const assigned = await assignQuests({
      userId: candidate,
      date: "2026-10-01",
      focus: q.attribute,
      history: [],
    });
    if (assigned[0].id === q.id) {
      userId = candidate;
      break;
    }
  }
  expect(userId).not.toBe("");
  const base = {
    userId,
    date: "2026-10-01",
    focus: q.attribute,
    history: [
      {
        questId: q.id,
        questVersion: 1,
        date: "2026-09-24",
        attribute: q.attribute,
        xp: 0,
      },
    ],
  };
  expect((await assignQuests(base)).map((q) => q.id)).not.toContain(q.id);
  expect(
    (
      await assignQuests({
        ...base,
        history: base.history.map((c) => ({ ...c, date: "2026-09-23" })),
      })
    )[0].id,
  ).toBe(q.id);
});
it("uses canonical SHA-256 seeds for tied attributes and candidates", async () => {
  expect(await hash("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  const input = {
    userId: "11111111-1111-4111-8111-111111111111",
    date: "2026-10-01",
    focus: "Perception" as const,
    history: [],
  };
  const prefix = `${input.userId}|${input.date}|1`;
  const sha = (s: string) => createHash("sha256").update(s).digest("hex");
  const weakest = [...attributes].sort((a, b) =>
    sha(`${prefix}|weakest|${a}`).localeCompare(sha(`${prefix}|weakest|${b}`)),
  )[0];
  const balance = attributes
    .filter((a) => a !== weakest && a !== input.focus)
    .sort((a, b) =>
      sha(`${prefix}|balance|${a}`).localeCompare(
        sha(`${prefix}|balance|${b}`),
      ),
    )[0];
  const assigned = await assignQuests(input);
  expect(assigned.map((q) => q.attribute)).toEqual([
    input.focus,
    weakest,
    balance,
  ]);
  const expected = catalog
    .filter((q) => q.attribute === input.focus)
    .sort((a, b) =>
      sha(`${prefix}|focus|${a.id}|1`).localeCompare(
        sha(`${prefix}|focus|${b.id}|1`),
      ),
    )[0];
  expect(assigned[0].id).toBe(expected.id);
});
it("selects the weakest from prior XP and balances among remaining attributes", async () => {
  const history = attributes
    .filter((a) => a !== "Charisma")
    .map((a) => ({
      questId: "past",
      questVersion: 1,
      date: "2026-09-30",
      attribute: a,
      xp: 25,
    }));
  const quests = await assignQuests({
    userId: "u",
    date: "2026-10-01",
    focus: "Intelligence",
    history,
  });
  expect(quests[1].attribute).toBe("Charisma");
  expect(["Strength", "Vitality", "Perception"]).toContain(quests[2].attribute);
});
it("relaxes recent exclusion only when a pool is exhausted and still prevents duplicates", async () => {
  const quests = catalog.map((q) => ({ ...q, repeatable: false }));
  const history = quests.map((q) => ({
    questId: q.id,
    questVersion: 1,
    date: "2026-09-30",
    attribute: q.attribute,
    xp: q.xp,
  }));
  const assigned = await assignQuests(
    { userId: "u", date: "2026-10-01", focus: "Perception", history },
    quests,
  );
  expect(assigned).toHaveLength(3);
  expect(new Set(assigned.map((q) => q.id)).size).toBe(3);
});
