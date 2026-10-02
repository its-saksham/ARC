create table private.waitlist_entries (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 source text not null default 'direct' check(source in ('direct','reddit','x'))
);
alter table private.waitlist_entries enable row level security;
revoke all on private.waitlist_entries from public,anon,authenticated;

create function private.require_verified_user() returns uuid
language plpgsql stable set search_path='' as $$
declare u uuid:=private.require_user();
begin
 if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null
  and email is not null and btrim(email)<>'' and not coalesce(is_anonymous,false)) then
  raise exception 'Sign in with a verified email to join the waitlist' using errcode='28000';
 end if;
 return u;
end $$;
revoke all on function private.require_verified_user() from public,anon,authenticated;

create function private.get_waitlist() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.require_verified_user(); joined_at timestamptz;
begin
 select created_at into joined_at from private.waitlist_entries where user_id=u;
 return jsonb_build_object('joined',joined_at is not null,'created_at',joined_at);
end $$;

create function private.join_waitlist(p_source text default 'direct') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_verified_user(); joined_at timestamptz;
begin
 if p_source is null or p_source not in ('direct','reddit','x') then raise exception 'Invalid source'; end if;
 insert into private.waitlist_entries(user_id,source) values(u,p_source) on conflict(user_id) do nothing;
 select created_at into strict joined_at from private.waitlist_entries where user_id=u;
 return jsonb_build_object('joined',true,'created_at',joined_at);
end $$;

create function private.leave_waitlist() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_verified_user();
begin
 delete from private.waitlist_entries where user_id=u;
 return jsonb_build_object('joined',false,'created_at',null);
end $$;

create function public.get_waitlist() returns jsonb
language sql stable security invoker set search_path='' as $$select private.get_waitlist()$$;
create function public.join_waitlist(p_source text default 'direct') returns jsonb
language sql security invoker set search_path='' as $$select private.join_waitlist(p_source)$$;
create function public.leave_waitlist() returns jsonb
language sql security invoker set search_path='' as $$select private.leave_waitlist()$$;
revoke all on function private.get_waitlist(),private.join_waitlist(text),private.leave_waitlist(),
 public.get_waitlist(),public.join_waitlist(text),public.leave_waitlist() from public,anon,authenticated;
grant execute on function private.get_waitlist(),private.join_waitlist(text),private.leave_waitlist(),
 public.get_waitlist(),public.join_waitlist(text),public.leave_waitlist() to authenticated;
notify pgrst,'reload schema';
