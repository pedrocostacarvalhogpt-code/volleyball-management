# Supabase database

Applied to project `ncwfgrjqrqdqmxrvcpwv`:

- `initial_mvp_core_schema`: profiles, clubs, seasons, teams, club/team memberships, training sessions, explicit session participants and wellness entries. RLS enabled on all nine tables. Current policies allow own wellness and own assigned sessions; management writes are intentionally not enabled until permission model is implemented.
- `profile_creation_trigger`: creates profile after Supabase Auth signup.

These migrations were applied via Supabase integration. To retrieve the authoritative SQL and migration history, use the Supabase dashboard or CLI. Avoid manually recreating production tables.

**Incomplete**: no coach/admin policies yet; no automated tests or deployment; other modules pending.
