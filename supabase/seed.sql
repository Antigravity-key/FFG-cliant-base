-- Optional seed data. Run after the initial migration to start with
-- the four typical plan patterns. Adjust prices to match the actual gym.

insert into public.plans (name, session_count, total_price, is_pair) values
  ('16回券（通常）', 16, 80000, false),
  ('16回券（継続割引）', 16, 72000, false),
  ('8回券', 8, 44000, false),
  ('ペア16回券', 16, 120000, true)
on conflict do nothing;
