-- LayerFlow :: team management
--
-- farm_members has carried complete RLS since the first migration, but nothing
-- could ever add a row to it: user_id is NOT NULL and references auth.users, so
-- an owner cannot name somebody who has not signed up yet. There is also no way
-- to look a person up by email -- profiles has no email column and auth.users is
-- not readable from the client.
--
-- So an invitation is its own record. The owner creates one, sends the link by
-- whatever they already use (Messenger, SMS, in person), and the membership row
-- is created only when the invitee accepts, by which point they have an account.

-- ---------------------------------------------------------------------------
-- farm_invitations
-- ---------------------------------------------------------------------------
create table farm_invitations (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms (id) on delete cascade,
  -- Stored lower-cased so "Ana@..." and "ana@..." cannot both be pending.
  email        text not null check (length(btrim(email)) > 0),
  role         farm_role not null default 'WORKER',
  -- The secret in the link. Unique so a token identifies exactly one invite.
  token        text not null unique check (length(token) >= 20),
  invited_by   uuid references auth.users (id) on delete set null,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- An invitation is never for the owner role. A farm has exactly one owner,
  -- established by app.claim_farm_ownership() when the farm is created.
  constraint farm_invitations_role_not_owner check (role <> 'OWNER')
);

-- One live invite per person per farm. Accepted rows drop out of the index, so
-- somebody who leaves and is invited back does not collide with their history.
create unique index farm_invitations_pending_key
  on farm_invitations (farm_id, lower(email))
  where accepted_at is null;

create index farm_invitations_farm_idx on farm_invitations (farm_id, created_at desc);

create trigger farm_invitations_touch
  before update on farm_invitations
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table farm_invitations enable row level security;

/*
 * Owner-only, all four verbs -- mirroring farm_members exactly.
 *
 * Note what is deliberately absent: there is no policy that lets an invitee
 * read this table. They are not a member of the farm yet, so any policy wide
 * enough to show them their own invite would also let a stranger enumerate
 * pending invitations by email. Reading and accepting both go through the
 * SECURITY DEFINER functions below, which take the token as the secret.
 */
create policy farm_invitations_select_owner on farm_invitations
  for select to authenticated
  using (app.is_farm_owner(farm_id));

create policy farm_invitations_insert_owner on farm_invitations
  for insert to authenticated
  with check (app.is_farm_owner(farm_id));

create policy farm_invitations_update_owner on farm_invitations
  for update to authenticated
  using (app.is_farm_owner(farm_id))
  with check (app.is_farm_owner(farm_id));

create policy farm_invitations_delete_owner on farm_invitations
  for delete to authenticated
  using (app.is_farm_owner(farm_id));

-- ---------------------------------------------------------------------------
-- invitation_preview
-- ---------------------------------------------------------------------------
/**
 * What the landing page shows somebody holding a link.
 *
 * SECURITY DEFINER because the caller is not a member and cannot read the
 * table. Deliberately narrow: farm name, role and expiry, nothing else. Anyone
 * with the token reaches this, so it must not leak the invitee's email, who
 * invited them, or anything about the farm beyond its name.
 *
 * Returns no row for a missing, expired or already-accepted token -- the page
 * says "this invitation is no longer valid" without distinguishing which,
 * so the function cannot be used to probe for live tokens.
 */
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
    and i.expires_at > now();
$$;

grant execute on function public.invitation_preview(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- accept_farm_invitation
-- ---------------------------------------------------------------------------
/**
 * Redeem a token: create the membership and close the invitation.
 *
 * SECURITY DEFINER, unlike record_daily_production. The reason is the opposite
 * of a convenience wrapper: the caller genuinely has no rights here yet. They
 * cannot read farm_invitations, and farm_members_insert_owner would reject
 * their insert because they are not the owner. The token is the authorisation,
 * and this function is the only thing that honours it.
 *
 * Idempotent. Accepting twice -- a double tap, a retried request -- returns the
 * farm rather than raising, because the second call is the same intent as the
 * first and an error there would look like a broken invite.
 */
create or replace function public.accept_farm_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.farm_invitations;
begin
  if v_user is null then
    raise exception 'Sign in to accept an invitation' using errcode = 'insufficient_privilege';
  end if;

  select * into v_invite
  from public.farm_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'Invitation not found' using errcode = 'no_data_found';
  end if;

  -- Already redeemed. If this user is the one who redeemed it, treat the call
  -- as a no-op and hand back the farm; if it was somebody else, it is spent.
  if v_invite.accepted_at is not null then
    if v_invite.accepted_by = v_user then
      return v_invite.farm_id;
    end if;
    raise exception 'Invitation already used' using errcode = 'unique_violation';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'Invitation expired' using errcode = 'check_violation';
  end if;

  -- Already a member through some other route: close the invitation rather
  -- than leaving it pending forever, and do not disturb their existing role.
  insert into public.farm_members (farm_id, user_id, role)
  values (v_invite.farm_id, v_user, v_invite.role)
  on conflict (farm_id, user_id) do nothing;

  update public.farm_invitations
  set accepted_at = now(), accepted_by = v_user
  where id = v_invite.id;

  return v_invite.farm_id;
end;
$$;

grant execute on function public.accept_farm_invitation(text) to authenticated;
