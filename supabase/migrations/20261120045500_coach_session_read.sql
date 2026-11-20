create policy coach_session_read on public.training_sessions
for select to authenticated using (
 exists (
 select 1 from public.team_memberships m
 join public.teams t on t.id=m.team_id
 join public.club_memberships c on c.club_id=t.club_id and c.user_id=m.user_id
 where m.team_id=training_sessions.team_id and m.user_id=(select auth.uid()) and m.role='coach'
 )
);
