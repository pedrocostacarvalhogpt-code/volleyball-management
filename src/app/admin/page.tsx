"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Person={user_id:string;email:string;full_name:string;created_at:string;email_confirmed:boolean};
type Club={club_id:string;club_name:string;members_count:number};
type ClubMember={club_id:string;user_id:string;role:string};
const clubRoles=[["admin","Administrador"],["coach","Treinador"],["athlete","Atleta"],["staff","Staff"]] as const;
export default function AdminPage(){
 const [users,setUsers]=useState<Person[]>([]);
 const [clubs,setClubs]=useState<Club[]>([]);
 const [status,setStatus]=useState("A verificar permissões...");
 const [allowed,setAllowed]=useState(false);
 const [filter,setFilter]=useState("");
 const [admins,setAdmins]=useState<string[]>([]);
 const [clubMembers,setClubMembers]=useState<ClubMember[]>([]);
 const [selectedClub,setSelectedClub]=useState("");
 const [selectedUser,setSelectedUser]=useState("");
 const [selectedRole,setSelectedRole]=useState("athlete");
 const [saving,setSaving]=useState<string|null>(null);
 const [feedback,setFeedback]=useState("");
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(cancelled)return;
   if(authError||!user){setStatus("Inicia sessão para aceder à administração.");return;}
   const {data:role,error:roleError}=await supabase.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
   if(cancelled)return;
   if(roleError||!role){setStatus("Acesso reservado a Super Admins.");return;}
   const [people,organizations,roles,memberships]=await Promise.all([supabase.rpc("admin_list_users"),supabase.rpc("admin_list_clubs"),supabase.rpc("admin_list_platform_admins"),supabase.rpc("admin_list_club_memberships")]);
   if(cancelled)return;
   if(people.error||organizations.error||roles.error||memberships.error){setStatus(people.error?.message??organizations.error?.message??roles.error?.message??memberships.error?.message??"Erro ao carregar.");return;}
   setClubMembers((memberships.data??[]) as ClubMember[]);
   setSelectedClub((organizations.data??[])[0]?.club_id??"");
   setAdmins((roles.data??[] as {user_id:string}[]).map((r:{user_id:string})=>r.user_id));
   setUsers((people.data??[]) as Person[]);
   setClubs((organizations.data??[]) as Club[]);
   setAllowed(true);setStatus("");
  }
  void load();
  return ()=>{cancelled=true;};
 },[]);
 async function toggleAdmin(userId:string,enabled:boolean){
  const target=users.find(u=>u.user_id===userId);
  if(!target)return;
  if(!window.confirm(`${enabled?"Conceder":"Remover"} Super Admin a ${target.email}?`))return;
  setSaving(userId);setFeedback("");
  try{
   const {error}=await supabase.rpc("admin_set_platform_admin",{p_user_id:userId,p_enabled:enabled});
   if(error){setFeedback(error.message);return;}
   const roles=await supabase.rpc("admin_list_platform_admins");
   if(roles.error){setFeedback(roles.error.message);return;}
   setAdmins(((roles.data??[]) as {user_id:string}[]).map(r=>r.user_id));
   setFeedback("Permissões atualizadas.");
  }catch(e){setFeedback(e instanceof Error?e.message:"Erro inesperado.");}
  finally{setSaving(null);}
 }
 async function changeClubMembership(member:ClubMember,enabled:boolean){
  const target=users.find(u=>u.user_id===member.user_id);
  if(!target||!window.confirm(`${enabled?"Adicionar":"Remover"} ${member.role} para ${target.email}?`))return;
  setSaving(member.user_id);setFeedback("");
  try{
   const {error}=await supabase.rpc("admin_set_club_membership",{p_club_id:member.club_id,p_user_id:member.user_id,p_role:member.role,p_enabled:enabled});
   if(error){setFeedback(error.message);return;}
   const updated=await supabase.rpc("admin_list_club_memberships");
   if(updated.error){setFeedback(updated.error.message);return;}
   setClubMembers((updated.data??[]) as ClubMember[]);
   setFeedback("Associações ao clube atualizadas.");
  }catch(e){setFeedback(e instanceof Error?e.message:"Erro inesperado.");}
  finally{setSaving(null);}
 }
 const visible=users.filter(u=>(u.email+" "+u.full_name).toLowerCase().includes(filter.toLowerCase()));
 return <main><a href="/">Voltar ao início</a><h1>Administração global</h1>
 {status&&<p role="status">{status}</p>}
 {allowed&&<><p className="muted">Consulta global de utilizadores e clubes. A atribuição de Super Admin concede acesso a toda a plataforma; utiliza-a apenas em contas de confiança.</p>
 <div className="card"><h2>Utilizadores ({users.length})</h2><p role="status">{feedback}</p>
 <label htmlFor="search-users">Pesquisar por nome ou email</label>
 <input id="search-users" type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Pesquisar utilizadores"/>
 {visible.length===0?<p>Sem resultados.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Nome</th><th>Email</th><th>Confirmado</th><th>Registo</th><th>Super Admin</th></tr></thead><tbody>
 {visible.map(u=><tr key={u.user_id}><td>{u.full_name||"—"}</td><td>{u.email}</td><td>{u.email_confirmed?"Sim":"Não"}</td><td>{new Date(u.created_at).toLocaleDateString("pt-PT")}</td><td><button type="button" disabled={saving!==null||(admins.includes(u.user_id)&&admins.length===1)} onClick={()=>void toggleAdmin(u.user_id,!admins.includes(u.user_id))}>{saving===u.user_id?"A guardar...":admins.includes(u.user_id)?"Remover":"Atribuir"}</button></td></tr>)}
 </tbody></table></div>}</div>
 <div className="card"><h2>Clubes ({clubs.length})</h2>
 {clubs.length===0?<p>Ainda não existem clubes.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Clube</th><th>Membros</th></tr></thead><tbody>
 {clubs.map(c=><tr key={c.club_id}><td>{c.club_name}</td><td>{c.members_count}</td></tr>)}
 </tbody></table></div>}</div>
 <div className="card"><h2>Funções nos clubes</h2><p className="muted">Uma pessoa pode acumular funções e pertencer a vários clubes. A remoção do último administrador de cada clube é bloqueada.</p>
 <label htmlFor="admin-club">Clube</label><select id="admin-club" value={selectedClub} onChange={e=>setSelectedClub(e.target.value)}><option value="">Selecionar clube</option>{clubs.map(c=><option key={c.club_id} value={c.club_id}>{c.club_name}</option>)}</select>
 {selectedClub&&<><form onSubmit={e=>{e.preventDefault();if(selectedUser)void changeClubMembership({club_id:selectedClub,user_id:selectedUser,role:selectedRole},true)}}>
 <label htmlFor="admin-member">Utilizador</label><select id="admin-member" required value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}><option value="">Selecionar utilizador</option>{users.map(u=><option key={u.user_id} value={u.user_id}>{u.full_name||u.email} ({u.email})</option>)}</select>
 <label htmlFor="admin-role">Função</label><select id="admin-role" value={selectedRole} onChange={e=>setSelectedRole(e.target.value)}>{clubRoles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
 <p><button type="submit" disabled={!selectedUser||saving!==null}>Atribuir função</button></p></form>
 <h3>Associações atuais</h3>{clubMembers.filter(m=>m.club_id===selectedClub).length===0?<p>Sem membros.</p>:clubMembers.filter(m=>m.club_id===selectedClub).map(m=><p key={m.user_id+":"+m.role}>{users.find(u=>u.user_id===m.user_id)?.email??m.user_id} — {clubRoles.find(r=>r[0]===m.role)?.[1]??m.role} <button type="button" disabled={saving!==null} onClick={()=>void changeClubMembership(m,false)}>Remover</button></p>)}</>}
 </div></>}
 </main>;
}