"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Team={id:string;name:string;club_id:string;season_id:string};
type Athlete={id:string;full_name:string|null};
export default function TrainingPage(){
 const [teams,setTeams]=useState<Team[]>([]),[teamId,setTeamId]=useState("");
 const [athletes,setAthletes]=useState<Athlete[]>([]),[selected,setSelected]=useState<string[]>([]);
 const [title,setTitle]=useState("Treino"),[start,setStart]=useState(""),[end,setEnd]=useState(""),[location,setLocation]=useState("");
 const [sessions,setSessions]=useState<{id:string;title:string;starts_at:string;ends_at:string;location:string|null;status:string}[]>([]);
 const [sessionError,setSessionError]=useState("");
 const [revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;async function loadSessions(){ const r=await supabase.from("training_sessions").select("id,title,starts_at,ends_at,location,status").order("starts_at",{ascending:false}).limit(50);if(!active)return;setSessions(r.data??[]);setSessionError(r.error?.message??""); }void loadSessions();return()=>{active=false}},[revision]);
 const [message,setMessage]=useState("A carregar equipas..."),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;async function load(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!active)return;
 if(!user){setMessage("Inicia sessão para criar treinos.");return}
 const m=await supabase.from("team_memberships").select("team_id").eq("user_id",user.id).eq("role","coach");
 if(!active)return;
 if(m.error){setMessage(m.error.message);return}
 const ids=(m.data??[]).map(x=>x.team_id);
 if(!ids.length){setMessage("Não tens equipas como treinador.");return}
 const t=await supabase.from("teams").select("id,name,club_id,season_id").in("id",ids).order("name");
 if(!active)return;
 if(t.error){setMessage(t.error.message);return}
 setTeams(t.data??[]);setMessage(t.data?.length?"Seleciona uma equipa.":"Não tens equipas disponíveis.");
 }void load();return()=>{active=false}},[]);
 useEffect(()=>{let active=true;setReady(false);setSelected([]);setAthletes([]);
 const team=teams.find(t=>t.id===teamId);
 if(!team)return;
 async function load(t:Team){
 setMessage("A carregar atletas...");
 const siblings=await supabase.from("teams").select("id").eq("club_id",t.club_id).eq("season_id",t.season_id);
 if(!active)return;
 if(siblings.error){setMessage(siblings.error.message);return}
 const ids=(siblings.data??[]).map(x=>x.id);
 if(!ids.length){setMessage("Não existem equipas disponíveis.");return}
 const members=await supabase.from("team_memberships").select("user_id").in("team_id",ids).eq("role","athlete");
 if(!active)return;
 if(members.error){setMessage(members.error.message);return}
 const users=Array.from(new Set((members.data??[]).map(x=>x.user_id)));
 if(users.length){
 const profiles=await supabase.from("profiles").select("id,full_name").in("id",users).order("full_name");
 if(!active)return;
 if(profiles.error){setMessage(profiles.error.message);return}
 setAthletes(profiles.data??[]);
 }
 setReady(true);setMessage("");
 }void load(team);return()=>{active=false}},[teamId,teams]);
 async function save(){
 if(!ready||busy)return;
 const a=new Date(start),b=new Date(end);
 if(!title.trim()||!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b<=a){setMessage("Verifica o título e os horários.");return}
 setBusy(true);setMessage("");
 try{
 const r=await supabase.rpc("create_training_session",{p_team_id:teamId,p_title:title.trim(),p_starts_at:a.toISOString(),p_ends_at:b.toISOString(),p_location:location.trim()||null,p_participants:selected});
 if(r.error){setMessage(r.error.message);return}
 setRevision(v=>v+1);setMessage("Treino criado com "+selected.length+" participantes.");setStart("");setEnd("");setSelected([]);
 }catch(e){setMessage(e instanceof Error?e.message:"Erro inesperado.")}finally{setBusy(false)}
 }
 return <main><a href="/clubes">Clubes e equipas</a><h1>Criar treino</h1><form className="card" onSubmit={e=>{e.preventDefault();void save()}}>
 <fieldset disabled={busy}><label htmlFor="training-team">Equipa</label><select id="training-team" required value={teamId} onChange={e=>{setReady(false);setSelected([]);setTeamId(e.target.value)}}><option value="">Seleciona...</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
 <label htmlFor="training-title">Título</label><input id="training-title" required value={title} onChange={e=>setTitle(e.target.value)}/>
 <label htmlFor="training-start">Início</label><input id="training-start" type="datetime-local" required value={start} onChange={e=>setStart(e.target.value)}/>
 <label htmlFor="training-end">Fim</label><input id="training-end" type="datetime-local" required value={end} onChange={e=>setEnd(e.target.value)}/>
 <label htmlFor="training-location">Local</label><input id="training-location" value={location} onChange={e=>setLocation(e.target.value)}/>
 <h2>Participantes ({selected.length})</h2><p>Atletas do mesmo clube e época. Apenas os selecionados serão inscritos.</p>
 {ready&&!athletes.length&&<p>Não existem atletas disponíveis.</p>}
 {athletes.map(a=><p key={a.id}><label><input type="checkbox" checked={selected.includes(a.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,a.id]:s.filter(id=>id!==a.id))}/>{a.full_name||"Atleta "+a.id.slice(0,8)}</label></p>)}
 <button type="submit" disabled={!ready||busy}>Criar treino</button></fieldset></form><p role="status">{message}</p><section className="card"><h2>Os meus treinos atribuídos</h2><p>Últimas 50 sessões em que estás inscrito.</p>{sessionError?<p role="alert">{sessionError}</p>:sessions.length===0?<p>Sem sessões atribuídas.</p>:<ul>{sessions.map(s=><li key={s.id}><strong>{s.title}</strong> — {new Date(s.starts_at).toLocaleString("pt-PT")} até {new Date(s.ends_at).toLocaleString("pt-PT")}{s.location?" · "+s.location:""} · {s.status}</li>)}</ul>}</section></main>
}
