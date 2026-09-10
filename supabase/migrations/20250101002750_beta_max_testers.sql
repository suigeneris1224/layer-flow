-- LayerFlow :: persisted beta-tester cap
--
-- Was a hardcoded MAX_BETA_TESTERS = 5 constant in app/admin/actions.ts and
-- app/admin/beta-settings/beta-panel.tsx. Admin/beta-settings now has a real
-- save button for this, so it needs somewhere real to save to.
alter table beta_settings add column max_testers integer not null default 5
  check (max_testers > 0 and max_testers <= 100);
