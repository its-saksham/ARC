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
async function asUser(u: string | null, sql: string, args: unknown[] = [], role: "authenticated" | "anon" = "authenticated") {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${role}`);
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
    `create schema if not exists auth; do $$begin create role anon nologin;exception when duplicate_object then null;end$$;do $$begin create role authenticated nologin;exception when duplicate_object then null;end$$;create table if not exists auth.users(id uuid primary key, email text default 'test@example.invalid', email_confirmed_at timestamptz default now(), is_anonymous boolean default false);create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const file of readdirSync("supabase/migrations").sort())
    await admin.query(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await admin.query(readFileSync("supabase/seed.sql", "utf8"));
  const availability = async () => (await asUser(null,"select public.get_beta_availability() a",[],"anon")).rows[0].a;
  assert.deepEqual(Object.keys(await availability()).sort(), ["capacity","checked_at","remaining"]);
  assert.equal((await availability()).capacity, 15);
  assert.equal((await availability()).remaining, 15);
  await assert.rejects(asUser(null,"select * from public.profiles",[],"anon"), /permission denied/);
  await admin.query("insert into auth.users(id) values($1),($2)", [u, other]);
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
  assert.equal((await availability()).remaining, 14);
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
  for (let i = 3; i <= 14; i++) {
    const id = crypto.randomUUID();
    await admin.query("insert into auth.users(id) values($1)", [id]);
    await asUser(id, "select public.save_onboarding('Perception','UTC')");
  }
  assert.equal((await availability()).remaining, 1);
  const racers = [crypto.randomUUID(),crypto.randomUUID()];
  await admin.query("insert into auth.users(id) values($1),($2)",racers);
  const admission = await Promise.allSettled(racers.map(id => asUser(id,"select public.save_onboarding('Perception','UTC')")));
  assert.equal(admission.filter(r => r.status === "fulfilled").length,1);
  assert.equal(admission.filter(r => r.status === "rejected" && /beta is full/.test(r.reason.message)).length,1);
  assert.equal((await availability()).remaining, 0);
  assert.equal((await admin.query("select count(*)::int n from public.profiles")).rows[0].n,15);
  await asUser(u,"select public.save_onboarding('Vitality','UTC')");
  assert.equal((await asUser(u,"select focus from public.profiles")).rows[0].focus,"Perception");
  console.log(
    "PASS aggregate-only availability, 15-user gate, concurrent last-seat admission and existing-user retry",
  );
  await assert.rejects(asUser(null,"select public.get_waitlist()",[],"anon"),/permission denied/);
  await assert.rejects(asUser(null,"select public.join_waitlist()",[],"anon"),/permission denied/);
  await assert.rejects(asUser(null,"select public.leave_waitlist()",[],"anon"),/permission denied/);
  await assert.rejects(asUser(null,"select public.join_waitlist('direct')"),/Session expired/);
  await assert.rejects(asUser(u,"select * from private.waitlist_entries"),/permission denied/);
  await assert.rejects(asUser(u,"insert into private.waitlist_entries(user_id) values($1)",[other]),/permission denied/);
  await assert.rejects(asUser(u,"update private.waitlist_entries set source='x'"),/permission denied/);
  await assert.rejects(asUser(u,"delete from private.waitlist_entries"),/permission denied/);
  await assert.rejects(asUser(u,"select public.join_waitlist('arbitrary')"),/Invalid source/);
  await assert.rejects(asUser(u,"select public.join_waitlist(null)"),/Invalid source/);
  const unconfirmed = crypto.randomUUID();
  await admin.query("insert into auth.users(id,email_confirmed_at) values($1,null)",[unconfirmed]);
  await assert.rejects(asUser(unconfirmed,"select public.join_waitlist('direct')"),/verified email/);
  await assert.rejects(asUser(crypto.randomUUID(),"select public.join_waitlist('direct')"),/Session expired/);
  const anonymous = crypto.randomUUID();
  await admin.query("insert into auth.users(id,is_anonymous) values($1,true)",[anonymous]);
  await assert.rejects(asUser(anonymous,"select public.join_waitlist('direct')"),/verified email/);
  const readWaitlist = async (id:string) => (await asUser(id,"select public.get_waitlist() w")).rows[0].w;
  assert.deepEqual(await readWaitlist(u),{joined:false,created_at:null});
  const join = async (id:string) => (await asUser(id,"select public.join_waitlist('reddit') w")).rows[0].w;
  const joined = await join(u);
  assert.equal(joined.joined,true);
  assert.ok(Number.isFinite(Date.parse(joined.created_at)));
  assert.deepEqual(await join(u),joined);
  assert.deepEqual((await asUser(u,"select public.join_waitlist('x') w")).rows[0].w,joined);
  assert.equal((await admin.query("select source from private.waitlist_entries where user_id=$1",[u])).rows[0].source,"reddit");
  await assert.rejects(asUser(unconfirmed,"select public.get_waitlist()"),/verified email/);
  const defaultUser = crypto.randomUUID();
  await admin.query("insert into auth.users(id) values($1)",[defaultUser]);
  await asUser(defaultUser,"select public.join_waitlist()");
  assert.equal((await admin.query("select source from private.waitlist_entries where user_id=$1",[defaultUser])).rows[0].source,"direct");
  await asUser(defaultUser,"select public.leave_waitlist()");
  await asUser(defaultUser,"select public.join_waitlist('x')");
  assert.equal((await admin.query("select source from private.waitlist_entries where user_id=$1",[defaultUser])).rows[0].source,"x");
  const duplicate = await Promise.all([join(other),join(other)]);
  assert.deepEqual(duplicate[0],duplicate[1]);
  await asUser(u,"select public.leave_waitlist()");
  await asUser(u,"select public.leave_waitlist()");
  assert.deepEqual(await readWaitlist(u),{joined:false,created_at:null});
  assert.deepEqual(await readWaitlist(other),duplicate[0]);
  // A rejected-onboarding user can join without consuming a profile slot.
  const rejected = racers[admission[0].status === "rejected" ? 0 : 1];
  await join(rejected);
  assert.equal((await admin.query("select count(*)::int n from public.profiles")).rows[0].n,15);
  assert.equal((await availability()).remaining,0);
  const deleted = crypto.randomUUID();
  await admin.query("insert into auth.users(id) values($1)",[deleted]);
  await join(deleted);
  await admin.query("delete from auth.users where id=$1",[deleted]);
  assert.equal((await admin.query("select count(*)::int n from private.waitlist_entries where user_id=$1",[deleted])).rows[0].n,0);
  await assert.rejects(asUser(deleted,"select public.get_waitlist()"),/Session expired/);
  assert.equal((await admin.query("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.proname in ('get_beta_availability','get_waitlist','join_waitlist','leave_waitlist')")).rows[0].n,0);
  console.log("PASS confirmed-email private waitlist, deny-by-default grants, account isolation, duplicate/concurrent join, leave and cascade deletion");
} finally {
  await admin.end();
}
