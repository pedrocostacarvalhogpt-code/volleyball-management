CREATE OR REPLACE FUNCTION public.confirm_training_participation(p_session_id uuid, p_confirmation_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;
  if p_confirmation_status is null or p_confirmation_status not in ('confirmed', 'declined') then
    raise exception 'Confirmação inválida' using errcode = '22023';
  end if;
  if not exists (select 1 from public.training_session_participants where session_id = p_session_id and user_id = auth.uid()) then
    raise exception 'Não estás inscrito nesta sessão' using errcode = '42501';
  end if;
  -- Serialize confirmation with cancellation and other session status changes.
  perform 1 from public.training_sessions where id = p_session_id and status = 'scheduled' for update;
  if not found then
    raise exception 'Sessão não disponível para confirmação' using errcode = '22023';
  end if;
  update public.training_session_participants set confirmation_status = p_confirmation_status
  where session_id = p_session_id and user_id = auth.uid();
  if not found then
    raise exception 'Não estás inscrito nesta sessão' using errcode = '42501';
  end if;
end;
$function$;
REVOKE EXECUTE ON FUNCTION public.confirm_training_participation(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_training_participation(uuid,text) TO authenticated;
