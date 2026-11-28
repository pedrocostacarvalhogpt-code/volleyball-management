create or replace function public.record_training_attendance(p_session_id uuid, p_user_id uuid, p_attendance_status text)
returns void language plpgsql security definer set search_path to '' as $function$
declare v_status text;
begin
 if auth.uid() is null or not public.can_coach_training_session(p_session_id) then
  raise exception 'Sem autorização para registar presenças' using errcode='42501';
 end if;
 select s.status::text into v_status from public.training_sessions s
 where s.id=p_session_id for update;
 if not found or v_status = 'cancelled' then
  raise exception 'Sessão cancelada ou inexistente' using errcode='22023';
 end if;
 if not public.can_coach_training_session(p_session_id) then
  raise exception 'Sem autorização para registar presenças' using errcode='42501';
 end if;
 if p_attendance_status is null or p_attendance_status not in ('present','absent','excused') then
  raise exception 'Estado de presença inválido' using errcode='22023';
 end if;
 update public.training_session_participants set attendance_status=p_attendance_status
 where session_id=p_session_id and user_id=p_user_id;
 if not found then
  raise exception 'Atleta não inscrito nesta sessão' using errcode='22023';
 end if;
end;
$function$;
revoke execute on function public.record_training_attendance(uuid,uuid,text) from public, anon;
grant execute on function public.record_training_attendance(uuid,uuid,text) to authenticated;
