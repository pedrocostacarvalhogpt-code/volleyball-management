create or replace function public.confirm_training_participation(p_session_id uuid, p_confirmation_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;
  if p_confirmation_status is null or p_confirmation_status not in ('confirmed', 'declined') then
    raise exception 'Confirmação inválida' using errcode = '22023';
  end if;
  update public.training_session_participants
     set confirmation_status = p_confirmation_status
   where session_id = p_session_id and user_id = auth.uid();
  if not found then
    raise exception 'Não estás inscrito nesta sessão' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.confirm_training_participation(uuid,text) from public, anon;
grant execute on function public.confirm_training_participation(uuid,text) to authenticated;