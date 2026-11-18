create or replace function public.create_training_session(p_team_id uuid,p_title text,p_starts_at timestamptz,p_ends_at timestamptz,p_location text,p_participants uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists (
 select 1 from public.team_memberships m join public.teams t on t.id=m.team_id
 join public.club_memberships c on c.club_id=t.club_id and c.user_id=m.user_id
 where m.team_id=p_team_id and m.user_id=auth.uid() and m.role='coach'
 ) then raise exception 'Sem autorização' using errcode='42501'; end if;
 if p_title is null or btrim(p_title)='' or p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at or p_participants is null then
 raise exception 'Dados de treino inválidos' using errcode='22023'; end if;
 if exists (select 1 from unnest(p_participants) u(id) where not exists (
 select 1 from public.teams target join public.teams source on source.club_id=target.club_id and source.season_id=target.season_id
 join public.team_memberships m on m.team_id=source.id
 join public.club_memberships c on c.club_id=source.club_id and c.user_id=m.user_id
 where target.id=p_team_id and m.user_id=u.id and m.role='athlete'
 )) then raise exception 'Participante inválido' using errcode='22023'; end if;
 insert into public.training_sessions(team_id,title,starts_at,ends_at,location) values(p_team_id,btrim(p_title),p_starts_at,p_ends_at,p_location) returning id into v_id;
 insert into public.training_session_participants(session_id,user_id) select distinct v_id,u.id from unnest(p_participants) u(id);
 return v_id;
end; $$;
revoke all on function public.create_training_session(uuid,text,timestamptz,timestamptz,text,uuid[]) from public,anon;
grant execute on function public.create_training_session(uuid,text,timestamptz,timestamptz,text,uuid[]) to authenticated;