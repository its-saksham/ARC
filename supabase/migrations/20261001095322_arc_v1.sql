create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

create table private.catalog_versions(version integer primary key check(version>0),published_at timestamptz not null default now());
alter table private.catalog_versions enable row level security;

create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 focus text not null check (focus in ('Perception','Vitality','Intelligence')),
 timezone text not null,
 catalog_version integer not null default 1 references private.catalog_versions(version),
 onboarded_at timestamptz not null default now()
);
create table public.quests (
 id text not null, quest_version integer not null, catalog_version integer not null,
 title text not null, instructions text not null,
 attribute text not null check(attribute in ('Strength','Intelligence','Vitality','Charisma','Perception')),
 effort text not null check(effort in ('light','standard','deep')),
 xp integer not null, focus_tags text[] not null, repeatable boolean not null,
 primary key (id,quest_version,catalog_version),
 check (xp = case effort when 'light' then 10 when 'standard' then 15 else 25 end)
);
create table public.quest_completions (
 id uuid primary key default extensions.gen_random_uuid(),
 user_id uuid not null references public.profiles(user_id),
 quest_id text not null, quest_version integer not null, catalog_version integer not null,
 local_date date not null, attribute text not null, xp integer not null,
 completed_at timestamptz not null default now(), idempotency_key uuid not null,
 foreign key (quest_id,quest_version,catalog_version) references public.quests(id,quest_version,catalog_version),
 unique (user_id,quest_id,quest_version,local_date), unique(user_id,idempotency_key)
);
-- Alias keys preserve safe retries even when a duplicate quest request used a new key.
create table private.completion_requests (
 user_id uuid not null references public.profiles(user_id), idempotency_key uuid not null,
 quest_id text not null, quest_version integer not null,
 completion_id uuid not null references public.quest_completions(id),
 primary key(user_id,idempotency_key)
);
create table public.analytics_events (
 id bigint generated always as identity primary key,
 user_id uuid not null references public.profiles(user_id),
 event text not null check(event in ('onboarding_complete','today_viewed','quest_viewed','status_viewed')),
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.quests enable row level security;
alter table public.quest_completions enable row level security;
alter table public.analytics_events enable row level security;
alter table private.completion_requests enable row level security;
revoke all on public.profiles,public.quests,public.quest_completions,public.analytics_events from anon,authenticated;
grant select on public.profiles,public.quests,public.quest_completions,public.analytics_events to authenticated;
create policy own_profile on public.profiles for select to authenticated using ((select auth.uid())=user_id);
create policy active_catalog on public.quests for select to authenticated using(catalog_version=1 or catalog_version=(select catalog_version from public.profiles where user_id=(select auth.uid())));
create policy own_completions on public.quest_completions for select to authenticated using((select auth.uid())=user_id);
create policy own_events on public.analytics_events for select to authenticated using((select auth.uid())=user_id);
create index completion_history on public.quest_completions(user_id,local_date);

create function private.immutable_record() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Records are immutable'; end $$;
create trigger immutable_catalog before update or delete on public.quests for each row execute function private.immutable_record();
create trigger immutable_catalog_versions before update or delete on private.catalog_versions for each row execute function private.immutable_record();
create function private.guard_catalog_insert() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from private.catalog_versions where version=new.catalog_version) then raise exception 'Published catalog versions are sealed'; end if;
 return new;
end $$;
create trigger sealed_catalog before insert on public.quests for each row execute function private.guard_catalog_insert();
create trigger append_only_completions before update or delete on public.quest_completions for each row execute function private.immutable_record();
create trigger append_only_requests before update or delete on private.completion_requests for each row execute function private.immutable_record();

create function private.require_user() returns uuid language plpgsql stable set search_path='' as $$
declare u uuid := auth.uid();
begin if u is null or not exists(select 1 from auth.users where id=u) then raise exception 'Session expired. Sign in again.' using errcode='28000'; end if; return u; end $$;

create function private.save_onboarding(p_focus text,p_timezone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); p public.profiles;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('arc-onboarding',0));
 select * into p from public.profiles where user_id=u;
 if found then return to_jsonb(p); end if;
 if p_focus is null or p_focus not in ('Perception','Vitality','Intelligence') then raise exception 'Choose a valid focus'; end if;
 if p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone and (name like '%/%' or name='UTC')) then raise exception 'Choose a valid IANA timezone'; end if;
 if (select count(*) from public.profiles)>=5 then raise exception 'The five-person beta is full'; end if;
 insert into public.profiles(user_id,focus,timezone) values(u,p_focus,p_timezone) returning * into p;
 insert into public.analytics_events(user_id,event) values(u,'onboarding_complete');
 return to_jsonb(p);
end $$;

-- A pure implementation helper accepts identity/date only from trusted callers.
create function private.assign_quests(u uuid,d date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; weakest text; balance text; attribute_name text; slot text;
 chosen public.quests; selected text[]:='{}'; result jsonb:='[]'; prefix text;
begin
 select * into strict p from public.profiles where user_id=u;
 prefix:=u::text||'|'||d::text||'|'||p.catalog_version::text;
 select a into weakest from unnest(array['Strength','Intelligence','Vitality','Charisma','Perception']) with ordinality as attrs(a,ord)
 order by (select coalesce(sum(c.xp),0) from public.quest_completions c where c.user_id=u and c.local_date<d and c.attribute=a),
 encode(extensions.digest(prefix||'|weakest|'||a,'sha256'),'hex'),ord limit 1;
 select a into balance from unnest(array['Strength','Intelligence','Vitality','Charisma','Perception']) with ordinality as attrs(a,ord)
 where a<>p.focus and a<>weakest order by encode(extensions.digest(prefix||'|balance|'||a,'sha256'),'hex'),ord limit 1;
 for slot,attribute_name in select * from (values('focus',p.focus),('weakest',weakest),('balance',balance)) s loop
  select q.* into chosen from public.quests q
  where q.catalog_version=p.catalog_version and q.attribute=attribute_name and not(q.id=any(selected))
  order by
   case when q.repeatable or not exists(select 1 from public.quest_completions c where c.user_id=u and c.quest_id=q.id and c.local_date>=d-7 and c.local_date<d) then 0 else 1 end,
   encode(extensions.digest(prefix||'|'||slot||'|'||q.id||'|'||q.quest_version::text,'sha256'),'hex'),q.id collate "C",q.quest_version limit 1;
  if not found then raise exception 'Catalog cannot supply three distinct quests'; end if;
  selected:=array_append(selected,chosen.id);
  result:=result||jsonb_build_array(to_jsonb(chosen)||jsonb_build_object('slot',slot,'completed',exists(select 1 from public.quest_completions c where c.user_id=u and c.quest_id=chosen.id and c.quest_version=chosen.quest_version and c.local_date=d)));
 end loop;
 return result;
end $$;

create function private.get_daily_quests() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); tz text;
begin select timezone into strict tz from public.profiles where user_id=u; return private.assign_quests(u,(statement_timestamp() at time zone tz)::date); end $$;

create function private.get_today() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); p public.profiles; d date; total bigint; scores jsonb; daily jsonb; active_dates date[]; cursor_date date; current_streak integer:=0;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 select * into p from public.profiles where user_id=u;
 if not found then return jsonb_build_object('needs_onboarding',true); end if;
 d:=(clock_timestamp() at time zone p.timezone)::date;
 select coalesce(sum(xp),0) into total from public.quest_completions where user_id=u;
 select jsonb_object_agg(a,jsonb_build_object('xp',xp,'score',least(100,20+floor(2.5*sqrt(xp))))) into scores
 from (select a,coalesce((select sum(c.xp) from public.quest_completions c where c.user_id=u and c.attribute=a),0) as xp from unnest(array['Strength','Intelligence','Vitality','Charisma','Perception']) a) s;
 daily:=private.assign_quests(u,d);
 select array_agg(distinct local_date) into active_dates from public.quest_completions where user_id=u and local_date<=d;
 cursor_date:=case when d=any(active_dates) then d else d-1 end;
 while cursor_date=any(active_dates) loop current_streak:=current_streak+1;cursor_date:=cursor_date-1;end loop;
 return jsonb_build_object('needs_onboarding',false,'profile',to_jsonb(p),'local_date',d,'total_xp',total,'level',floor(total/200.0)+1,
 'rank',case when total>=36000 then 'S' when total>=18000 then 'A' when total>=9000 then 'B' when total>=4500 then 'C' when total>=1500 then 'D' else 'E' end,
 'attributes',scores,'quests',daily,'completed_count',(select count(*) from jsonb_array_elements(daily) q where (q->>'completed')::boolean),'streak',current_streak);
end $$;

create function private.complete_quest(p_quest_id text,p_quest_version integer,p_idempotency_key uuid,p_expected_date date) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); p public.profiles; d date; c public.quest_completions; req private.completion_requests; q public.quests; assigned jsonb;
begin
 if p_idempotency_key is null then raise exception 'Idempotency key is required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 select * into req from private.completion_requests where user_id=u and idempotency_key=p_idempotency_key;
 if found then
  if req.quest_id is distinct from p_quest_id or req.quest_version is distinct from p_quest_version then raise exception 'Idempotency key belongs to a different quest';end if;
  select * into strict c from public.quest_completions where id=req.completion_id;
  return jsonb_build_object('completion',to_jsonb(c),'today',private.get_today());
 end if;
 select * into strict p from public.profiles where user_id=u;
 d:=(clock_timestamp() at time zone p.timezone)::date;
 assigned:=private.assign_quests(u,d);
 if p_expected_date is distinct from d then raise exception 'This request belongs to a different local day. Refresh Today before completing a new quest.'; end if;
 if not exists(select 1 from jsonb_array_elements(assigned) x where x->>'id'=p_quest_id and (x->>'quest_version')::integer=p_quest_version) then raise exception 'Quest is not assigned for today';end if;
 select * into strict q from public.quests where id=p_quest_id and quest_version=p_quest_version and catalog_version=p.catalog_version;
 select * into c from public.quest_completions where user_id=u and quest_id=q.id and quest_version=q.quest_version and local_date=d;
 if not found then
  insert into public.quest_completions(user_id,quest_id,quest_version,catalog_version,local_date,attribute,xp,idempotency_key)
  values(u,q.id,q.quest_version,q.catalog_version,d,q.attribute,q.xp,p_idempotency_key) returning * into c;
 end if;
 insert into private.completion_requests values(u,p_idempotency_key,q.id,q.quest_version,c.id);
 return jsonb_build_object('completion',to_jsonb(c),'today',private.get_today());
end $$;

create function private.track_event(p_event text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user();
begin
 if p_event is null or p_event not in ('today_viewed','quest_viewed','status_viewed') then raise exception 'Invalid event';end if;
 if not exists(select 1 from public.profiles where user_id=u) then raise exception 'Finish onboarding';end if;
 if (select count(*) from public.analytics_events where user_id=u and created_at>now()-interval '1 hour')>=100 then return;end if;
 insert into public.analytics_events(user_id,event) values(u,p_event);
end $$;

create function public.save_onboarding(p_focus text,p_timezone text) returns jsonb language sql security invoker set search_path='' as $$select private.save_onboarding(p_focus,p_timezone)$$;
create function public.get_daily_quests() returns jsonb language sql security invoker set search_path='' as $$select private.get_daily_quests()$$;
create function public.get_today() returns jsonb language sql security invoker set search_path='' as $$select private.get_today()$$;
create function public.complete_quest(p_quest_id text,p_quest_version integer,p_idempotency_key uuid,p_expected_date date) returns jsonb language sql security invoker set search_path='' as $$select private.complete_quest(p_quest_id,p_quest_version,p_idempotency_key,p_expected_date)$$;
create function public.track_event(p_event text) returns void language sql security invoker set search_path='' as $$select private.track_event(p_event)$$;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.save_onboarding(text,text),private.get_daily_quests(),private.get_today(),private.complete_quest(text,integer,uuid,date),private.track_event(text) to authenticated;
revoke execute on function public.save_onboarding(text,text),public.get_daily_quests(),public.get_today(),public.complete_quest(text,integer,uuid,date),public.track_event(text) from public,anon;
grant execute on function public.save_onboarding(text,text),public.get_daily_quests(),public.get_today(),public.complete_quest(text,integer,uuid,date),public.track_event(text) to authenticated;
