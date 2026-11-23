-- Allow a coach to read the roster of sessions belonging to their own team.
-- SECURITY DEFINER avoids circular RLS evaluation between sessions and participants.
create or replace function public.can_coach_training_session(p_session_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
 select exists (
  select 1 from public.training_sessions s
  join public.team_memberships tm on tm.team_id = s.team_id
  join public.teams t on t.id = s.team_id
  join public.club_memberships cm on cm.club_id = t.club_id and cm.user_id = tm.user_id
  where s.id = p_session_id and tm.user_id = (select auth.uid()) and tm.role = 'coach'
 )
$$;
revoke all on function public.can_coach_training_session(uuid) from public, anon;
grant execute on function public.can_coach_training_session(uuid) to authenticated;
create policy coach_participants_read on public.training_session_participants
for select to authenticated using (public.can_coach_training_session(session_id));