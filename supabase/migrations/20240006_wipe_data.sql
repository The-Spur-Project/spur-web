-- Data wipe for load test restart (2026-03-17)
-- Truncates all public user data. auth.users entries are preserved
-- so users can re-login with the same phone and re-register their name.
-- TRUNCATE on an empty table is a no-op, so this is safe on fresh DBs.
truncate table public.users restart identity cascade;
