"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import type {User} from "@supabase/supabase-js";
export default function Home(){
 const [user,setUser]=useState<User|null>(null);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [message,setMessage]=useState("");
 const [loading,setLoading]=useState(true);
 const [submitting,setSubmitting]=useState(false);
 useEffect(()=>{
  supabase.auth.getUser().then(({data})=>{setUser(data.user);setLoading(false)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));
  return ()=>subscription.unsubscribe();
 },[]);
 async function login(signup:boolean){
  setMessage("");
  const normalizedEmail=email.trim();
  if(!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)){
   setMessage("Introduz um endereço de email válido.");return;
  }
  if(!password){setMessage("Introduz a palavra-passe.");return;}
  if(signup && password.length<6){setMessage("A palavra-passe deve ter pelo menos 6 caracteres.");return;}
  setSubmitting(true);
  try{
   const result=signup
    ? await supabase.auth.signUp({email:normalizedEmail,password})
    : await supabase.auth.signInWithPassword({email:normalizedEmail,password});
   setMessage(result.error?.message??(signup?"Registo submetido. Confirma o email, caso seja solicitado.":"Sessão iniciada."));
  }catch{setMessage("Não foi possível contactar o serviço de autenticação.");}
  finally{setSubmitting(false);}
 }
 return <><header><h1>Volleyball Club</h1>{user&&<nav><a href="/">Início</a><a href="/agenda">Minha agenda</a><a href="/wellness">Wellness</a></nav>}</header>
 <main>{loading?<p>A carregar...</p>:user?<><div className="card"><h2>Bem-vindo</h2><p>{user.email}</p><button onClick={()=>supabase.auth.signOut()}>Terminar sessão</button></div><div className="grid"><div className="card"><h3>Agenda pessoal</h3><p>Consulta apenas sessões para as quais foste selecionado.</p><a href="/agenda">Abrir agenda</a></div><div className="card"><h3>Wellness</h3><p>Regista o teu estado de manhã e à noite.</p><a href="/wellness">Responder</a></div></div></>:<div className="card"><h2>Entrar ou criar conta</h2><form onSubmit={e=>{e.preventDefault();void login(false)}}><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="password">Palavra-passe</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><p><button disabled={submitting} type="submit">Entrar</button> <button disabled={submitting} type="button" onClick={()=>void login(true)}>Registar</button></p></form>{message&&<p role="status">{message}</p>}</div>}</main></>;
}
