-- Multi-farm team invites: an owner may grant one invited person access to
-- several of their own farms in a single invite/link, instead of sending one
-- link per farm. farm_invitations stays one row per farm -- the existing
-- per-farm pending-dedup index, RLS, and cascade-delete-on-farm-removal all
-- keep working unchanged -- multiple rows now simply share one token, which
-- turns the token into a "batch" identifier when more than one farm was
-- selected. A single-farm invite (still the common case) is just a batch of
-- one and behaves exactly as before.

alter table farm_invitations drop constraint farm_invitations_token_key;
alter table farm_invitations add constraint farm_invitations_token_farm_key unique (token, farm_id);

-- invitation_preview already returns a set (`returns table`), so its
-- signature is unchanged -- a shared token now simply returns one row per
-- farm in the batch instead of always exactly one.
create or replace function public.invitation_preview(p_token text)
returns table (farm_name text, role farm_role, expires_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.name, i.role, i.expires_at
  from public.farm_invitations i
  join public.farms f on f.id = i.farm_id
  where i.token = p_token
    and i.accepted_at is null
    and i.expires_at > now()
  order by f.name;
$$;

-- accept_farm_invitation now redeems every row sharing the token, atomically:
-- a `raise exception` partway through the loop rolls back everything this
-- call has done so far (a PL/pgSQL function body is one transaction), so a
-- batch either fully succeeds or fully fails -- it is never half-granted.
-- Returns every farm_id granted (one, for today's common single-farm case).
--
-- Postgres refuses `create or replace` when the return type changes
-- (uuid -> uuid[]), so the old function is dropped first; the grant below
-- reapplies execute permission, which a drop also removes.
drop function if exists public.accept_farm_invitation(text);

create function public.accept_farm_invitation(p_token text)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_row record;
  v_found boolean := false;
  v_farm_ids uuid[] := '{}';
begin
  if v_user is null then
    raise exception 'Sign in to accept an invitation' using errcode = 'insufficient_privilege';
  end if;

  for v_row in
    select * from public.farm_invitations where token = p_token for update
  loop
    v_found := true;

    -- Already redeemed. If this user is the one who redeemed it, treat this
    -- row as a no-op and include its farm in the result; if it was somebody
    -- else, the whole invite is spent.
    if v_row.accepted_at is not null then
      if v_row.accepted_by <> v_user then
        raise exception 'Invitation already used' using errcode = 'unique_violation';
      end if;
      v_farm_ids := array_append(v_farm_ids, v_row.farm_id);
      continue;
    end if;

    if v_row.expires_at <= now() then
      raise exception 'Invitation expired' using errcode = 'check_violation';
    end if;

    -- Already a member through some other route: close the invitation rather
    -- than leaving it pending forever, and do not disturb their existing role.
    insert into public.farm_members (farm_id, user_id, role)
    values (v_row.farm_id, v_user, v_row.role)
    on conflict (farm_id, user_id) do nothing;

    update public.farm_invitations
    set accepted_at = now(), accepted_by = v_user
    where id = v_row.id;

    v_farm_ids := array_append(v_farm_ids, v_row.farm_id);
  end loop;

  if not v_found then
    raise exception 'Invitation not found' using errcode = 'no_data_found';
  end if;

  return v_farm_ids;
end;
$$;

grant execute on function public.accept_farm_invitation(text) to authenticated;
