create or replace function public.cancel_training_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not public.can_coach_training_session(p_session_id) then
  raise exception 'Sem autorização' using errcode = '42501';
 end if;
 update public.training_sessions s set status = 'cancelled'
 where s.id = p_session_id and s.status = 'scheduled' and public.can_coach_training_session(s.id);
 if not found then
  raise exception 'Sessão não cancelável' using errcode = '22023';
 end if;
end;
$$;
revoke all on function public.cancel_training_session(uuid) from public, anon;
grant execute on function public.cancel_training_session(uuid) to authenticated;
