-- Shared server-side capacity; onboarding remains serialized by the original lock.
create function private.beta_capacity() returns integer
language sql immutable set search_path='' as $$select 15$$;
revoke all on function private.beta_capacity() from public, anon, authenticated;

create or replace function private.save_onboarding(p_focus text,p_timezone text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); p public.profiles;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('arc-onboarding',0));
 select * into p from public.profiles where user_id=u;
 if found then return to_jsonb(p); end if;
 if p_focus is null or p_focus not in ('Perception','Vitality','Intelligence') then raise exception 'Choose a valid focus'; end if;
 if p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone and (name like '%/%' or name='UTC')) then raise exception 'Choose a valid IANA timezone'; end if;
 if (select count(*) from public.profiles)>=private.beta_capacity() then raise exception 'The 15-person beta is full'; end if;
 insert into public.profiles(user_id,focus,timezone) values(u,p_focus,p_timezone) returning * into p;
 insert into public.analytics_events(user_id,event) values(u,'onboarding_complete');
 return to_jsonb(p);
end $$;

-- Intentional anonymous exception: only aggregate seat counts, never identities.
create function private.get_beta_availability() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('capacity',private.beta_capacity(),
 'remaining',greatest(0,private.beta_capacity()-(select count(*) from public.profiles)),
 'checked_at',statement_timestamp())
$$;
create function public.get_beta_availability() returns jsonb
language sql stable security invoker set search_path='' as $$select private.get_beta_availability()$$;
grant usage on schema private to anon;
revoke all on function private.get_beta_availability(),public.get_beta_availability() from public,anon,authenticated;
grant execute on function private.get_beta_availability(),public.get_beta_availability() to anon,authenticated;
notify pgrst,'reload schema';
