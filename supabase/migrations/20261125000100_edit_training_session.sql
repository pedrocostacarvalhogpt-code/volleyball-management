create or replace function public.edit_training_session(p_session_id uuid, p_title text, p_starts_at timestamptz, p_ends_at timestamptz, p_location text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not public.can_coach_training_session(p_session_id) then
  raise exception 'Sem autorização' using errcode = '42501';
 end if;
 if p_title is null or btrim(p_title) = '' or p_starts_at is null or p_ends_at is null or not isfinite(p_starts_at) or not isfinite(p_ends_at) or p_ends_at <= p_starts_at then
  raise exception 'Dados de treino inválidos' using errcode = '22023';
 end if;
 update public.training_sessions s
 set title = btrim(p_title), starts_at = p_starts_at, ends_at = p_ends_at, location = nullif(btrim(p_location), '')
 where s.id = p_session_id and s.status = 'scheduled' and public.can_coach_training_session(s.id);
 if not found then
  raise exception 'Sessão não editável' using errcode = '22023';
 end if;
end;
$$;
revoke all on function public.edit_training_session(uuid,text,timestamptz,timestamptz,text) from public, anon;
grant execute on function public.edit_training_session(uuid,text,timestamptz,timestamptz,text) to authenticated;
