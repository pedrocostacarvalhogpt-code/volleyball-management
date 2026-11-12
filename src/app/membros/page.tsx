"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Team={id:string;name:string;club_id:string};
type Membership={team_id:string;user_id:string;role:string};
type Profile={id:string;full_name:string};
const roles=[["athlete","Atleta"],["coach","Treinador"],["assistant","Treinador adjunto"],["staff","Staff"]] as const;
export default function TeamMembers(){
 const [teams,setTeams]=useState<Team[]>([]);
 const [teamId,setTeamId]=useState("");
 const [members,setMembers]=useState<Membership[]>([]);
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [email,setEmail]=useState("");
 const [role,setRole]=useState("athlete");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 async function loadTeams(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setMessage("Inicia sessão para gerir os membros.");setLoading(false);return}
  const {data:admin,error:adminError}=await supabase.from("club_memberships").select("club_id").eq("user_id",user.id).eq("role","admin");
  if(adminError){setMessage(adminError.message);setLoading(false);return}
  const ids=(admin??[]).map(a=>a.club_id);
  if(!ids.length){setMessage("Não administras nenhum clube.");setLoading(false);return}
  const {data,error}=await supabase.from("teams").select("id,name,club_id").in("club_id",ids).order("name");
  if(error)setMessage(error.message);
  else {setTeams(data??[]);setTeamId(old=>old||(data?.[0]?.id??""));}
  setLoading(false);
 }
 async function loadMembers(id:string){
  setMessage("");
  const {data,error}=await supabase.from("team_memberships").select("team_id,user_id,role").eq("team_id",id);
  if(error){setMessage(error.message);return}
  setMembers(data??[]);
  const ids=[...new Set((data??[]).map(m=>m.user_id))];
  if(!ids.length){setProfiles([]);return}
  const {data:people,error:peopleError}=await supabase.from("profiles").select("id,full_name").in("id",ids);
  if(peopleError)setMessage(peopleError.message);else setProfiles(people??[]);
 }
 useEffect(()=>{void loadTeams()},[]);
 useEffect(()=>{if(teamId)void loadMembers(teamId);else{setMembers([]);setProfiles([])}},[teamId]);
 async function add(e:React.FormEvent){
  e.preventDefault();if(!teamId)return;
  setBusy(true);setMessage("");
  const {error}=await supabase.rpc("add_team_member",{p_team_id:teamId,p_email:email.trim(),p_role:role});
  if(error)setMessage(error.message);
  else{setEmail("");await loadMembers(teamId);setMessage("Função atribuída.");}
  setBusy(false);
 }
 async function remove(member:Membership){
  if(!window.confirm("Remover esta função da equipa?"))return;
  setBusy(true);setMessage("");
  const {error}=await supabase.rpc("remove_team_member",{p_team_id:member.team_id,p_user_id:member.user_id,p_role:member.role});
  if(error)setMessage(error.message);else{await loadMembers(teamId);setMessage("Função removida.");}
  setBusy(false);
 }
 return <main><a href="/clubes">Voltar aos clubes</a><h1>Membros das equipas</h1>
 <p className="muted">Uma pessoa pode ter várias funções e pertencer a várias equipas. Apenas administradores podem alterar associações.</p>
 {loading?<p>A carregar...</p>:<div className="card"><label htmlFor="team">Equipa</label><select id="team" value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">Seleciona uma equipa</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
 {teamId&&<><div className="card"><h2>Adicionar pessoa registada</h2><p className="muted">O utilizador tem de criar conta e confirmar o email antes de ser associado.</p>
 <form onSubmit={add}><label htmlFor="member-email">Email</label><input id="member-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/>
 <label htmlFor="role">Função</label><select id="role" value={role} onChange={e=>setRole(e.target.value)}>{roles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
 <p><button disabled={busy} type="submit">Adicionar função</button></p></form></div>
 <div className="card"><h2>Membros ({members.length} associações)</h2>{members.length===0?<p>Sem membros atribuídos.</p>:members.map(m=><div key={m.user_id+":"+m.role} style={{padding:"10px 0",borderBottom:"1px solid #dde5ef"}}>
 <strong>{profiles.find(p=>p.id===m.user_id)?.full_name||"Utilizador "+m.user_id.slice(0,8)}</strong> — {roles.find(r=>r[0]===m.role)?.[1]??m.role} <button disabled={busy} onClick={()=>void remove(m)}>Remover função</button></div>)}</div></>}
 <p role="status">{message}</p></main>
}
