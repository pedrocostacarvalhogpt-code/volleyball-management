"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Team={id:string;name:string;club_id:string;season_id:string};
type Athlete={id:string;full_name:string|null};
type Session={id:string;team_id:string;title:string;starts_at:string;ends_at:string;location:string|null;status:string};
export default function TrainingPage(){
 const [teams,setTeams]=useState<Team[]>([]),[teamId,setTeamId]=useState("");
 const [athletes,setAthletes]=useState<Athlete[]>([]),[selected,setSelected]=useState<string[]>([]);
 const [title,setTitle]=useState("Treino"),[start,setStart]=useState(""),[end,setEnd]=useState(""),[location,setLocation]=useState("");
 const [sessions,setSessions]=useState<Session[]>([]);
 const [participation,setParticipation]=useState<Record<string,{confirmation_status:string|null;attendance_status:string|null}>>({});
 const [attendanceSession,setAttendanceSession]=useState<string|null>(null);
 const [roster,setRoster]=useState<{user_id:string;attendance_status:string|null;confirmation_status:string|null;name:string}[]>([]);
 const [rosterError,setRosterError]=useState("");
 const [rosterLoading,setRosterLoading]=useState(false);
 const [attendanceBusy,setAttendanceBusy]=useState<string|null>(null);
 async function openRoster(sessionId:string){
  if(attendanceSession===sessionId){setAttendanceSession(null);return}
  setAttendanceSession(sessionId);setRoster([]);setRosterError("");setRosterLoading(true);
  const result=await supabase.from("training_session_participants").select("user_id,attendance_status,confirmation_status").eq("session_id",sessionId);
  if(result.error){setRosterError(result.error.message);setRosterLoading(false);return}
  const participants=result.data??[];
  const profiles=participants.length?await supabase.from("profiles").select("id,full_name").in("id",participants.map(p=>p.user_id)):null;
  const names=new Map((profiles?.data??[]).map(p=>[p.id,p.full_name]));
  setRoster(participants.map(p=>({user_id:p.user_id,attendance_status:p.attendance_status,confirmation_status:p.confirmation_status,name:names.get(p.user_id)||"Atleta "+p.user_id.slice(0,8)})));
  if(profiles?.error)setRosterError("Não foi possível obter alguns nomes: "+profiles.error.message);
  setRosterLoading(false);
 }
 async function markAttendance(sessionId:string,userId:string,status:string){
  setAttendanceBusy(userId);setRosterError("");
  const result=await supabase.rpc("record_training_attendance",{p_session_id:sessionId,p_user_id:userId,p_attendance_status:status});
  if(result.error)setRosterError(result.error.message);
  else {setRoster(rows=>rows.map(p=>p.user_id===userId?{...p,attendance_status:status}:p));setRevision(v=>v+1)}
  setAttendanceBusy(null);
 }
 const [editing,setEditing]=useState<{id:string;title:string;start:string;end:string;location:string}|null>(null);
 const [editBusy,setEditBusy]=useState(false);
 const [editError,setEditError]=useState("");
 function localDate(value:string){
  const d=new Date(value);
  const pad=(n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
 }
 function beginEdit(s:Session){
  setEditError("");setEditing({id:s.id,title:s.title,start:localDate(s.starts_at),end:localDate(s.ends_at),location:s.location??""});
 }
 async function saveEdit(){
  if(!editing||editBusy)return;
  const a=new Date(editing.start),b=new Date(editing.end);
  if(!editing.title.trim()||!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b<=a){setEditError("Verifica o título e os horários.");return}
  setEditBusy(true);setEditError("");
  try{
   const r=await supabase.rpc("edit_training_session",{p_session_id:editing.id,p_title:editing.title.trim(),p_starts_at:a.toISOString(),p_ends_at:b.toISOString(),p_location:editing.location.trim()||null});
   if(r.error)throw new Error(r.error.message);
   setEditing(null);setRevision(v=>v+1);
  }catch(e){setEditError(e instanceof Error?e.message:"Não foi possível editar o treino.")}
  finally{setEditBusy(false)}
 }
 const [cancelBusy,setCancelBusy]=useState<string|null>(null);
 const [cancelFeedback,setCancelFeedback]=useState<Record<string,string>>({});
 async function cancelTraining(s:Session){
  if(cancelBusy!==null||editBusy||attendanceBusy!==null||s.status!=="scheduled")return;
  if(!window.confirm("Cancelar este treino? Os participantes e o histórico serão preservados."))return;
  setCancelBusy(s.id);setCancelFeedback(prev=>({...prev,[s.id]:""}));
  try{
   const r=await supabase.rpc("cancel_training_session",{p_session_id:s.id});
   if(r.error)throw new Error(r.error.message);
   setSessions(prev=>prev.map(x=>x.id===s.id?{...x,status:"cancelled"}:x));
   setEditing(prev=>prev?.id===s.id?null:prev);
   setCancelFeedback(prev=>({...prev,[s.id]:"Treino cancelado."}));
   setRevision(v=>v+1);
  }catch(e){setCancelFeedback(prev=>({...prev,[s.id]:e instanceof Error?e.message:"Não foi possível cancelar o treino."}))}
  finally{setCancelBusy(null)}
 }
 const renderCoachedSession=(s:Session)=><li key={s.id}>
  <strong>{s.title}</strong> — {new Date(s.starts_at).toLocaleString("pt-PT")}
  {s.status==="cancelled"&&<strong> · Cancelado</strong>}
  {s.status==="scheduled"&&<><button type="button" disabled={editBusy||cancelBusy!==null} onClick={()=>beginEdit(s)}>Editar treino</button>
  <button type="button" disabled={cancelBusy!==null||editBusy||editing!==null||attendanceBusy!==null} onClick={()=>void cancelTraining(s)}>{cancelBusy===s.id?"A cancelar...":"Cancelar treino"}</button></>}
  {cancelFeedback[s.id]&&<p role="status">{cancelFeedback[s.id]}</p>}
  {editing?.id===s.id&&<form onSubmit={e=>{e.preventDefault();void saveEdit()}}>
   <fieldset disabled={editBusy}>
    <label>Título<input required value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label>
    <label>Início<input type="datetime-local" step="1" required value={editing.start} onChange={e=>setEditing({...editing,start:e.target.value})}/></label>
    <label>Fim<input type="datetime-local" step="1" required value={editing.end} onChange={e=>setEditing({...editing,end:e.target.value})}/></label>
    <label>Local<input value={editing.location} onChange={e=>setEditing({...editing,location:e.target.value})}/></label>
    <button type="submit">Guardar alterações</button><button type="button" onClick={()=>setEditing(null)}>Cancelar</button>
   </fieldset>{editError&&<p role="alert">{editError}</p>}
  </form>}
  <button type="button" onClick={()=>void openRoster(s.id)} aria-expanded={attendanceSession===s.id}> {attendanceSession===s.id?"Fechar participantes":"Gerir presenças"}</button>
  {attendanceSession===s.id&&<div>{rosterLoading?<p>A carregar participantes...</p>:<>
   {rosterError&&<p role="alert">{rosterError}</p>}
   {!roster.length?<p>Sem participantes inscritos ou sem acesso à lista.</p>:<><p role="status">Confirmados: {roster.filter(p=>p.confirmation_status==="confirmed").length} · Indisponíveis: {roster.filter(p=>p.confirmation_status==="declined").length} · Pendentes: {roster.filter(p=>p.confirmation_status!=="confirmed"&&p.confirmation_status!=="declined").length}</p><ul>{roster.map(p=><li key={p.user_id}>
    {p.name} — {p.confirmation_status==="confirmed"?"Confirmado":p.confirmation_status==="declined"?"Indisponível":"Resposta pendente"} — {p.attendance_status??"Por registar"}{" "}
    <select aria-label={"Presença de "+p.name} value={p.attendance_status??""} disabled={attendanceBusy!==null||cancelBusy!==null||s.status==="cancelled"} onChange={e=>{if(e.target.value)void markAttendance(s.id,p.user_id,e.target.value)}}>
     <option value="">Por registar</option><option value="present">Presente</option><option value="absent">Ausente</option><option value="excused">Falta justificada</option>
    </select>
   </li>)}</ul></>}
  </>}</div>}
 </li>;
 const [sessionLoading,setSessionLoading]=useState(true);
 const [sessionError,setSessionError]=useState("");
 const [revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;async function loadSessions(){
 setSessionLoading(true);
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(!active)return;
 if(authError||!user){setSessions([]);setParticipation({});setSessionError(authError?.message??"Inicia sessão para consultar os treinos.");setSessionLoading(false);return}
 const [r,p]=await Promise.all([
  supabase.from("training_sessions").select("id,team_id,title,starts_at,ends_at,location,status").order("starts_at",{ascending:false}).limit(100),
  supabase.from("training_session_participants").select("session_id,confirmation_status,attendance_status").eq("user_id",user.id)
 ]);
 if(!active)return;
 setSessions(r.data??[]);
 setParticipation(Object.fromEntries((p.data??[]).map(x=>[x.session_id,{confirmation_status:x.confirmation_status,attendance_status:x.attendance_status}])));
 setSessionError(r.error?.message??p.error?.message??"");
 setSessionLoading(false);
 }void loadSessions();return()=>{active=false}},[revision]);
 const [confirmationBusy,setConfirmationBusy]=useState<string|null>(null);
 const [confirmationFeedback,setConfirmationFeedback]=useState<Record<string,string>>({});
 async function confirmParticipation(sessionId:string,status:"confirmed"|"declined"){
  if(confirmationBusy!==null)return;
  setConfirmationBusy(sessionId);
  setConfirmationFeedback(prev=>({...prev,[sessionId]:""}));
  try{
   const result=await supabase.rpc("confirm_training_participation",{p_session_id:sessionId,p_confirmation_status:status});
   if(result.error)throw new Error(result.error.message);
   setParticipation(prev=>prev[sessionId]?{...prev,[sessionId]:{...prev[sessionId],confirmation_status:status}}:prev);
   setConfirmationFeedback(prev=>({...prev,[sessionId]:"Resposta registada."}));
   setRevision(v=>v+1);
  }catch(e){setConfirmationFeedback(prev=>({...prev,[sessionId]:e instanceof Error?e.message:"Não foi possível registar a resposta."}));}
  finally{setConfirmationBusy(null);}
 }
 const renderSession=(s:Session)=><li key={s.id}><strong>{s.title}</strong> — {new Date(s.starts_at).toLocaleString("pt-PT")} até {new Date(s.ends_at).toLocaleString("pt-PT")}{s.location?" · "+s.location:""} · {s.status==="cancelled"?"Cancelado":s.status}{participation[s.id]&&<span> · Confirmação: {participation[s.id].confirmation_status??"Pendente"} · Presença: {participation[s.id].attendance_status??"Por registar"}</span>}{participation[s.id]&&s.status==="scheduled"&&<div>
  <button type="button" disabled={cancelBusy!==null||confirmationBusy!==null||participation[s.id].confirmation_status==="confirmed"} onClick={()=>void confirmParticipation(s.id,"confirmed")}>Confirmar participação</button>{" "}
  <button type="button" disabled={cancelBusy!==null||confirmationBusy!==null||participation[s.id].confirmation_status==="declined"} onClick={()=>void confirmParticipation(s.id,"declined")}>Não vou participar</button>
  {confirmationFeedback[s.id]&&<p role="status">{confirmationFeedback[s.id]}</p>}
 </div>}</li>;
 const coachedSessions=sessions.filter(s=>teams.some(t=>t.id===s.team_id));
 const assignedSessions=sessions.filter(s=>Object.prototype.hasOwnProperty.call(participation,s.id));
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
 <button type="submit" disabled={!ready||busy}>Criar treino</button></fieldset></form><p role="status">{message}</p><section className="card"><h2>Os meus treinos atribuídos</h2><p>Sessões em que participas como atleta, mesmo que também sejas treinador.</p>{sessionError?<p role="alert">{sessionError}</p>:sessionLoading?<p>A carregar sessões...</p>:assignedSessions.length===0?<p>Sem sessões atribuídas.</p>:<ul>{assignedSessions.map(renderSession)}</ul>}</section><section className="card"><h2>Treinos das minhas equipas</h2><p>Sessões das equipas em que és treinador. Um treino pode aparecer nas duas listas quando também participas como atleta.</p>{sessionError?<p role="alert">{sessionError}</p>:sessionLoading?<p>A carregar sessões...</p>:coachedSessions.length===0?<p>Sem sessões das tuas equipas.</p>:<ul>{coachedSessions.map(renderCoachedSession)}</ul>}</section></main>
}
