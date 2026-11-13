"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Person={user_id:string;email:string;full_name:string;created_at:string;email_confirmed:boolean};
type Club={club_id:string;club_name:string;members_count:number};
export default function AdminPage(){
 const [users,setUsers]=useState<Person[]>([]);
 const [clubs,setClubs]=useState<Club[]>([]);
 const [status,setStatus]=useState("A verificar permissões...");
 const [allowed,setAllowed]=useState(false);
 const [filter,setFilter]=useState("");
 const [admins,setAdmins]=useState<string[]>([]);
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
   const [people,organizations,roles]=await Promise.all([supabase.rpc("admin_list_users"),supabase.rpc("admin_list_clubs"),supabase.rpc("admin_list_platform_admins")]);
   if(cancelled)return;
   if(people.error||organizations.error||roles.error){setStatus(people.error?.message??organizations.error?.message??roles.error?.message??"Erro ao carregar.");return;}
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
 </tbody></table></div>}</div></>}
 </main>;
}