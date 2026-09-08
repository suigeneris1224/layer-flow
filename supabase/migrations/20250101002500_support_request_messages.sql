-- ---------------------------------------------------------------------------
-- Support ticket replies
-- ---------------------------------------------------------------------------
-- support_requests stored one message per ticket with no way to reply. This
-- adds the thread: every message after the original request (admin or
-- farmer) lives here, keyed to the ticket it belongs to.
create table support_request_messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references support_requests (id) on delete cascade,
  sender_id   uuid not null references auth.users (id) on delete cascade,
  sender_role text not null check (sender_role in ('admin', 'farmer')),
  body        text not null check (length(btrim(body)) > 0),
  created_at  timestamptz not null default now()
);

create index support_request_messages_request_id_idx on support_request_messages (request_id);

alter table support_request_messages enable row level security;

-- Any member of the ticket's farm can read the thread -- same "any member"
-- shape as support_requests_select.
create policy support_request_messages_select on support_request_messages
  for select to authenticated
  using (exists (
    select 1 from support_requests r
    where r.id = request_id and app.is_farm_member(r.farm_id)
  ));

-- Farmers insert their own replies directly (RLS-checked); admin replies
-- always go through the service-role client in app/admin/actions.ts, same as
-- support_requests' admin-only status/admin_note writes, so there is no admin
-- insert policy here.
create policy support_request_messages_insert on support_request_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and sender_role = 'farmer'
    and exists (
      select 1 from support_requests r
      where r.id = request_id and app.is_farm_member(r.farm_id)
    )
  );
