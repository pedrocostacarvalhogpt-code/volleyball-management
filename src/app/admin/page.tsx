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
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(cancelled)return;
   if(authError||!user){setStatus("Inicia sessão para aceder à administração.");return;}
   const {data:role,error:roleError}=await supabase.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
   if(cancelled)return;
   if(roleError||!role){setStatus("Acesso reservado a Super Admins.");return;}
   const [people,organizations]=await Promise.all([supabase.rpc("admin_list_users"),supabase.rpc("admin_list_clubs")]);
   if(cancelled)return;
   if(people.error||organizations.error){setStatus(people.error?.message??organizations.error?.message??"Erro ao carregar.");return;}
   setUsers((people.data??[]) as Person[]);
   setClubs((organizations.data??[]) as Club[]);
   setAllowed(true);setStatus("");
  }
  void load();
  return ()=>{cancelled=true;};
 },[]);
 const visible=users.filter(u=>(u.email+" "+u.full_name).toLowerCase().includes(filter.toLowerCase()));
 return <main><a href="/">Voltar ao início</a><h1>Administração global</h1>
 {status&&<p role="status">{status}</p>}
 {allowed&&<><p className="muted">Consulta global de utilizadores e clubes. Alterações de permissões ainda não estão disponíveis neste painel.</p>
 <div className="card"><h2>Utilizadores ({users.length})</h2>
 <label htmlFor="search-users">Pesquisar por nome ou email</label>
 <input id="search-users" type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Pesquisar utilizadores"/>
 {visible.length===0?<p>Sem resultados.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Nome</th><th>Email</th><th>Confirmado</th><th>Registo</th></tr></thead><tbody>
 {visible.map(u=><tr key={u.user_id}><td>{u.full_name||"—"}</td><td>{u.email}</td><td>{u.email_confirmed?"Sim":"Não"}</td><td>{new Date(u.created_at).toLocaleDateString("pt-PT")}</td></tr>)}
 </tbody></table></div>}</div>
 <div className="card"><h2>Clubes ({clubs.length})</h2>
 {clubs.length===0?<p>Ainda não existem clubes.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Clube</th><th>Membros</th></tr></thead><tbody>
 {clubs.map(c=><tr key={c.club_id}><td>{c.club_name}</td><td>{c.members_count}</td></tr>)}
 </tbody></table></div>}</div></>}
 </main>;
}