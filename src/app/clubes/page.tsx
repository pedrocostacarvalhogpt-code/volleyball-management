"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Club={id:string;name:string};
type Season={id:string;club_id:string;name:string;starts_on:string;ends_on:string};
type Team={id:string;club_id:string;season_id:string;name:string};
type Member={club_id:string;user_id:string;role:string};
export default function ClubsPage(){
 const [clubs,setClubs]=useState<Club[]>([]);
 const [seasons,setSeasons]=useState<Season[]>([]);
 const [teams,setTeams]=useState<Team[]>([]);
 const [members,setMembers]=useState<Member[]>([]);
 const [clubId,setClubId]=useState("");
 const [clubName,setClubName]=useState("");
 const [seasonName,setSeasonName]=useState("2026/2027");
 const [start,setStart]=useState("2026-09-01");
 const [end,setEnd]=useState("2027-08-31");
 const [seasonId,setSeasonId]=useState("");
 const [teamName,setTeamName]=useState("");
 const [message,setMessage]=useState("");
 const [userId,setUserId]=useState("");
 const [busy,setBusy]=useState(false);
 async function load(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setMessage("Inicia sessão para gerir os clubes.");return}
  setUserId(user.id);
  const [c,s,t,m]=await Promise.all([
   supabase.from("clubs").select("id,name").order("name"),
   supabase.from("seasons").select("id,club_id,name,starts_on,ends_on").order("starts_on",{ascending:false}),
   supabase.from("teams").select("id,club_id,season_id,name").order("name"),
   supabase.from("club_memberships").select("club_id,user_id,role").eq("user_id",user.id)
  ]);
  const error=c.error??s.error??t.error??m.error;
  if(error){setMessage(error.message);return}
  setClubs(c.data??[]);setSeasons(s.data??[]);setTeams(t.data??[]);setMembers(m.data??[]);
  setClubId(old=>old||(c.data?.[0]?.id??""));
 }
 useEffect(()=>{void load()},[]);
 const currentSeasons=seasons.filter(s=>s.club_id===clubId);
 const admin=members.some(m=>m.club_id===clubId&&m.user_id===userId&&m.role==="admin");
 async function act(fn:()=>Promise<{error?:{message:string}|null}>){
  setBusy(true);setMessage("");
  try{const r=await fn();if(r.error) setMessage(r.error.message);else{setMessage("Alterações guardadas.");await load()}}
  catch(e){setMessage(e instanceof Error?e.message:"Erro inesperado.")}
  finally{setBusy(false)}
 }
 return <main><a href="/">Voltar</a><h1>Clubes e equipas</h1>
  <div className="card"><h2>Os meus clubes</h2><label htmlFor="club">Selecionar clube</label>
  <select id="club" value={clubId} onChange={e=>{setClubId(e.target.value);setSeasonId("")}}><option value="">Seleciona...</option>{clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
  <h3>Criar clube</h3><form onSubmit={e=>{e.preventDefault();void act(async()=>{const r=await supabase.rpc("create_club",{p_name:clubName.trim()});if(!r.error){setClubName("");if(r.data)setClubId(r.data)}return r})}}>
   <label htmlFor="club-name">Nome do clube</label><input id="club-name" required minLength={2} maxLength={100} value={clubName} onChange={e=>setClubName(e.target.value)}/>
   <p><button disabled={busy||!userId} type="submit">Criar clube</button></p></form></div>
  {clubId&&<><div className="card"><h2>Épocas desportivas</h2>
   {currentSeasons.map(s=><p key={s.id}>{s.name} ({s.starts_on} — {s.ends_on})</p>)}
   {admin&&<form onSubmit={e=>{e.preventDefault();void act(()=>supabase.from("seasons").insert({club_id:clubId,name:seasonName,starts_on:start,ends_on:end}))}}>
    <label htmlFor="season-name">Nome</label><input id="season-name" required value={seasonName} onChange={e=>setSeasonName(e.target.value)}/>
    <label htmlFor="season-start">Início</label><input id="season-start" type="date" required value={start} onChange={e=>setStart(e.target.value)}/>
    <label htmlFor="season-end">Fim</label><input id="season-end" type="date" required min={start} value={end} onChange={e=>setEnd(e.target.value)}/>
    <p><button disabled={busy} type="submit">Criar época</button></p></form>}</div>
   <div className="card"><h2>Equipas</h2>
   {teams.filter(t=>t.club_id===clubId).map(t=><p key={t.id}>{t.name} · {seasons.find(s=>s.id===t.season_id)?.name??"Época desconhecida"}</p>)}
   {admin&&<form onSubmit={e=>{e.preventDefault();void act(async()=>{const r=await supabase.from("teams").insert({club_id:clubId,season_id:seasonId,name:teamName.trim()});if(!r.error)setTeamName("");return r})}}>
    <label htmlFor="team-season">Época</label><select id="team-season" required value={seasonId} onChange={e=>setSeasonId(e.target.value)}><option value="">Seleciona uma época</option>{currentSeasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <label htmlFor="team-name">Nome da equipa</label><input id="team-name" required value={teamName} onChange={e=>setTeamName(e.target.value)}/>
    <p><button disabled={busy||!seasonId} type="submit">Criar equipa</button></p></form>}</div></>}
  <p role="status">{message}</p>
 </main>
}
