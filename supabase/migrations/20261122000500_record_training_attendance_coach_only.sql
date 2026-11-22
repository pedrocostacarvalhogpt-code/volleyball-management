-- Only coaches of the session's team who remain members of its club may record attendance.
create or replace function public.record_training_attendance(
 p_session_id uuid, p_user_id uuid, p_attendance_status text
) returns void language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.training_sessions s
  join public.teams t on t.id=s.team_id
  join public.team_memberships m on m.team_id=t.id and m.user_id=auth.uid() and m.role='coach'
  join public.club_memberships cm on cm.club_id=t.club_id and cm.user_id=auth.uid()
  where s.id=p_session_id
 ) then
  raise exception 'Sem autorização para registar presenças' using errcode='42501';
 end if;
 if p_attendance_status is null or p_attendance_status not in ('present','absent','excused') then
  raise exception 'Estado de presença inválido' using errcode='22023';
 end if;
 update public.training_session_participants
 set attendance_status=p_attendance_status
 where session_id=p_session_id and user_id=p_user_id;
 if not found then
  raise exception 'Atleta não inscrito nesta sessão' using errcode='22023';
 end if;
end;
$$;
revoke all on function public.record_training_attendance(uuid,uuid,text) from public;
grant execute on function public.record_training_attendance(uuid,uuid,text) to authenticated;
