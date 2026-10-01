import { Client } from "pg";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { assignQuests, type CompletionHistory } from "../src/domain/assignment";
import { localDate } from "../src/domain/progression";
import { catalog } from "../src/domain/catalog";
import { level, rank, radarScore, streak } from "../src/domain/progression";
// Run only against an isolated disposable database; refuses ambiguous production URLs.
const url = process.env.ARC_TEST_DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error(
    "Set ARC_TEST_DATABASE_URL to a disposable localhost database.",
  );
const admin = new Client({ connectionString: url });
await admin.connect();
async function asUser(u: string | null, sql: string, args: unknown[] = []) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await c.query("begin");
    await c.query("set local role authenticated");
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [
      u ?? "",
    ]);
    const result = await c.query(sql, args);
    await c.query("commit");
    return result;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    await c.end();
  }
}
const u = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
try {
  const existing = await admin.query(
    "select to_regclass('public.profiles') p, to_regclass('auth.users') u",
  );
  if (existing.rows[0].p || existing.rows[0].u)
    throw new Error(
      "Database is not empty. Use a NEW disposable database; this suite never resets existing data.",
    );
  await admin.query(
    `create schema if not exists auth; do $$begin create role anon nologin;exception when duplicate_object then null;end$$;do $$begin create role authenticated nologin;exception when duplicate_object then null;end$$;create table if not exists auth.users(id uuid primary key);create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  for (const file of readdirSync("supabase/migrations").sort())
    await admin.query(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await admin.query(readFileSync("supabase/seed.sql", "utf8"));
  await admin.query("insert into auth.users values($1),($2)", [u, other]);
  await assert.rejects(
    asUser(null, "select public.get_today()"),
    /Session expired/,
  );
  await assert.rejects(
    asUser(u, "select public.save_onboarding('Strength','UTC')"),
    /valid focus/,
  );
  await assert.rejects(
    asUser(u, "select public.save_onboarding('Perception','Mars/Crater')"),
    /IANA timezone/,
  );
  await asUser(u, "select public.save_onboarding('Perception','Asia/Kolkata')");
  await asUser(u, "select public.save_onboarding('Vitality','UTC')");
  assert.equal(
    (await asUser(u, "select * from public.profiles")).rows[0].focus,
    "Perception",
  );
  await asUser(other, "select public.save_onboarding('Vitality','UTC')");
  assert.equal(
    (await asUser(other, "select * from public.profiles")).rows.length,
    1,
  );
  await assert.rejects(
    asUser(
      u,
      "insert into public.quest_completions(user_id,xp) values($1,99999)",
      [u],
    ),
    /permission denied/,
  );
  await assert.rejects(
    asUser(u, "update public.quest_completions set xp=99999"),
    /permission denied/,
  );
  await assert.rejects(
    asUser(u, "delete from public.quest_completions"),
    /permission denied/,
  );
  await assert.rejects(
    asUser(u, "select private.assign_quests($1,current_date)", [other]),
    /permission denied/,
  );
  console.log(
    "PASS auth, onboarding validation/retry, RLS, direct-write and private-helper isolation",
  );
  const d = localDate(new Date(), "Asia/Kolkata");
  const history: CompletionHistory[] = [];
  for (const date of ["2025-12-31", "2026-03-08", "2026-10-01", d]) {
    const sql = (
      await admin.query("select private.assign_quests($1,$2) q", [u, date])
    ).rows[0].q;
    const ts = await assignQuests({
      userId: u,
      date,
      focus: "Perception",
      history,
    });
    assert.deepEqual(
      sql.map((q: { id: string }) => q.id),
      ts.map((q) => q.id),
    );
  }
  const before = (await asUser(u, "select public.get_today() t")).rows[0].t;
  const q = before.quests[0],
    q2 = before.quests[1];
  const key = crypto.randomUUID();
  await assert.rejects(
    asUser(u, "select public.complete_quest($1,$2,$3,$4)", [
      "fake",
      1,
      crypto.randomUUID(),
      d,
    ]),
    /not assigned/,
  );
  await assert.rejects(
    asUser(u, "select public.complete_quest($1,$2,$3,$4,$5)", [
      q.id,
      1,
      key,
      d,
      99999,
    ]),
    /does not exist/,
  );
  const complete = (id: string, version: number, k: string, expectedDate = d) =>
    asUser(u, "select public.complete_quest($1,$2,$3,$4) result", [
      id,
      version,
      k,
      expectedDate,
    ]);
  await assert.rejects(
    complete(q.id, 1, crypto.randomUUID(), "2000-01-01"),
    /different local day/,
  );
  assert.equal(
    (await asUser(u, "select * from public.quest_completions")).rows.length,
    0,
  );
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () => complete(q.id, 1, key)),
  );
  assert.equal(
    (await complete(q.id, 1, key, "2000-01-01")).rows[0].result.completion.id,
    concurrent[0].rows[0].result.completion.id,
  );
  assert.equal(
    new Set(concurrent.map((r) => r.rows[0].result.completion.id)).size,
    1,
  );
  const retry = await complete(q.id, 1, crypto.randomUUID());
  assert.equal(
    retry.rows[0].result.completion.id,
    concurrent[0].rows[0].result.completion.id,
  );
  await assert.rejects(complete(q2.id, 1, key), /different quest/);
  const aliasKey = crypto.randomUUID();
  await complete(q.id, 1, aliasKey);
  await assert.rejects(complete(q2.id, 1, aliasKey), /different quest/);
  assert.equal(
    (await asUser(other, "select * from public.quest_completions")).rows.length,
    0,
  );
  const after = (await asUser(u, "select public.get_today() t")).rows[0].t;
  assert.equal(after.total_xp, q.xp);
  assert.equal(after.completed_count, 1);
  assert.equal(after.streak, 1);
  assert.equal(after.level, level(q.xp));
  assert.equal(after.rank, rank(q.xp));
  assert.equal(after.attributes[q.attribute].score, radarScore(q.xp));
  assert.deepEqual(
    after.quests.map((q: { id: string }) => q.id),
    before.quests.map((q: { id: string }) => q.id),
  );
  await Promise.all([
    complete(q2.id, 1, crypto.randomUUID()),
    complete(before.quests[2].id, 1, crypto.randomUUID()),
  ]);
  assert.equal(
    (await asUser(u, "select public.get_today() t")).rows[0].t.completed_count,
    3,
  );
  await assert.rejects(
    admin.query("update public.quest_completions set xp=0"),
    /immutable/,
  );
  await assert.rejects(admin.query("delete from public.quests"), /immutable/);
  await assert.rejects(
    admin.query(
      "insert into public.quests select 'new-quest',quest_version,catalog_version,title,instructions,attribute,effort,xp,focus_tags,repeatable from public.quests limit 1",
    ),
    /sealed/,
  );
  console.log(
    "PASS SQL/TS parity, forged reward rejection, distinct assignment, concurrent duplicate/different quests, idempotency, perfect day, immutable data",
  );
  // Exercise historical sums, recent nonrepeatable exclusion, timezone and hash ordering.
  const historical = await admin.query(
    "select * from public.quests where repeatable=false order by id",
  );
  for (const [i, h] of historical.rows.entries()) {
    const date = `2026-09-${String(24 + i).padStart(2, "0")}`;
    await admin.query(
      "insert into public.quest_completions(user_id,quest_id,quest_version,catalog_version,local_date,attribute,xp,idempotency_key) values($1,$2,1,1,$3,$4,$5,$6)",
      [other, h.id, date, h.attribute, h.xp, crypto.randomUUID()],
    );
  }
  const rows = (
    await admin.query(
      "select *,local_date::text as history_date from public.quest_completions where user_id=$1",
      [other],
    )
  ).rows;
  const past = rows.map((c) => ({
    questId: c.quest_id,
    questVersion: c.quest_version,
    date: c.history_date,
    attribute: c.attribute,
    xp: c.xp,
  }));
  for (const date of ["2026-09-25", "2026-10-01", "2026-10-08"]) {
    const sql = (
      await admin.query("select private.assign_quests($1,$2) q", [other, date])
    ).rows[0].q;
    const ts = await assignQuests({
      userId: other,
      date,
      focus: "Vitality",
      history: past,
    });
    assert.deepEqual(
      sql.map((q: { id: string }) => q.id),
      ts.map((q) => q.id),
    );
  }
  const otherToday = (await asUser(other, "select public.get_today() t"))
    .rows[0].t;
  assert.equal(otherToday.local_date, localDate(new Date(), "UTC"));
  assert.equal(
    otherToday.streak,
    streak(
      past.map((c) => c.date),
      otherToday.local_date,
    ),
  );
  // Exhaustion can arise in a later catalog. Modify only this disposable DB in a rolled-back fixture.
  await admin.query("begin");
  try {
    await admin.query(
      "alter table public.quests disable trigger immutable_catalog",
    );
    await admin.query("update public.quests set repeatable=false");
    for (const q of catalog)
      await admin.query(
        "insert into public.quest_completions(user_id,quest_id,quest_version,catalog_version,local_date,attribute,xp,idempotency_key) values($1,$2,1,1,$3,$4,$5,$6)",
        [other, q.id, "2026-09-30", q.attribute, q.xp, crypto.randomUUID()],
      );
    const allHistory = [
      ...past,
      ...catalog.map((q) => ({
        questId: q.id,
        questVersion: 1,
        date: "2026-09-30",
        attribute: q.attribute,
        xp: q.xp,
      })),
    ];
    const sql = (
      await admin.query("select private.assign_quests($1,$2) q", [
        other,
        "2026-10-01",
      ])
    ).rows[0].q;
    const ts = await assignQuests(
      {
        userId: other,
        date: "2026-10-01",
        focus: "Vitality",
        history: allHistory,
      },
      catalog.map((q) => ({ ...q, repeatable: false })),
    );
    assert.deepEqual(
      sql.map((q: { id: string }) => q.id),
      ts.map((q) => q.id),
    );
  } finally {
    await admin.query("rollback");
  }
  await assert.rejects(
    asUser(u, "select * from private.completion_requests"),
    /permission denied/,
  );
  const exposed = await admin.query(
    "select count(*)::integer n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.proname in ('save_onboarding','get_daily_quests','get_today','complete_quest','track_event')",
  );
  assert.equal(exposed.rows[0].n, 0);
  console.log(
    "PASS exhausted-pool SQL/TS parity, timezone/streak/progression parity, alias-key conflict and public invoker wrappers",
  );
  await assert.rejects(
    asUser(u, "select public.track_event('arbitrary')"),
    /Invalid event/,
  );
  await asUser(u, "select public.track_event('status_viewed')");
  const oldKey = crypto.randomUUID();
  const old = (
    await admin.query(
      "insert into public.quest_completions(user_id,quest_id,quest_version,catalog_version,local_date,attribute,xp,idempotency_key) values($1,$2,1,1,$3,$4,$5,$6) returning id",
      [u, q.id, "2000-01-01", q.attribute, q.xp, oldKey],
    )
  ).rows[0];
  await admin.query(
    "insert into private.completion_requests values($1,$2,$3,1,$4)",
    [u, oldKey, q.id, old.id],
  );
  const recovered = (await complete(q.id, 1, oldKey, "2000-01-01")).rows[0]
    .result;
  assert.equal(recovered.completion.local_date, "2000-01-01");
  assert.equal(recovered.today.local_date, d);
  console.log(
    "PASS midnight guard for uncommitted requests and authoritative prior-day idempotent recovery",
  );
  for (let i = 3; i <= 6; i++) {
    const id = `${i}${i}${i}${i}${i}${i}${i}${i}-3333-4333-8333-333333333333`;
    await admin.query("insert into auth.users values($1)", [id]);
    if (i < 6)
      await asUser(id, "select public.save_onboarding('Perception','UTC')");
    else
      await assert.rejects(
        asUser(id, "select public.save_onboarding('Perception','UTC')"),
        /beta is full/,
      );
  }
  console.log(
    "PASS historical SQL/TS parity, analytics validation, five-user beta gate",
  );
} finally {
  await admin.end();
}
