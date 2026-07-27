"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function SubmitEventPage() {
  const router = useRouter();
  const [user,setUser]=useState<any>(null),[organization,setOrganization]=useState<any>(null);
  const [message,setMessage]=useState("Loading event form..."),[saving,setSaving]=useState(false);
  const [form,setForm]=useState({title:"",date:"",location:"",description:"",ticket_url:"",poc_email:"",poc_phone:"",image:""});

  useEffect(()=>{void(async()=>{
    const auth=await supabase.auth.getUser();
    const current=auth.data.user||null;
    setUser(current);
    if(!current){setMessage("Please log in to submit an event.");return;}
    setForm(currentForm=>({...currentForm,poc_email:current.email||""}));
    const organizationId=new URLSearchParams(window.location.search).get("organization")||"";
    if(organizationId){
      const result=await supabase.from("community_organizations").select("id,name,location").eq("id",organizationId).maybeSingle();
      if(result.data)setOrganization(result.data);
    }
    setMessage("");
  })()},[]);

  async function submit(){
    if(!user?.id){setMessage("Please log in to submit an event.");return;}
    if(!form.title.trim()||!form.date||!form.location.trim()){setMessage("Event title, date, and location are required.");return;}
    setSaving(true);setMessage("Submitting event...");
    const payload={
      title:form.title.trim(),date:form.date,location:form.location.trim(),description:form.description.trim()||null,
      ticket_url:form.ticket_url.trim()||null,poc_email:form.poc_email.trim()||null,poc_phone:form.poc_phone.trim()||null,
      image:form.image.trim()||null,image_urls:form.image.trim()?[form.image.trim()]:null,status:"pending",approved:false,
      created_by:user.id,created_at:new Date().toISOString(),updated_at:new Date().toISOString()
    };
    const result=await supabase.from("events").insert(payload).select("id").single();
    if(result.error){setSaving(false);setMessage(`Could not submit event: ${result.error.message}`);return;}
    if(organization?.id){
      const link=await supabase.from("event_organizations").insert({event_id:result.data.id,organization_id:organization.id,relationship:"organizer",is_primary:true,display_order:0,created_by:user.id});
      if(link.error)setMessage(`Event submitted, but the organization link could not be saved: ${link.error.message}`);
    }
    setSaving(false);
    router.push(`/my-events?submitted=${result.data.id}`);
  }

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader/><section className="mx-auto max-w-4xl px-6 py-12">
    <a href={organization?.id?`/my-organizations":"/events"} className="font-black text-pink-600">← Back</a>
    <p className="mt-8 text-sm font-black uppercase tracking-widest text-pink-600">Community Events</p>
    <h1 className="mt-2 text-4xl font-black">Submit an Event</h1>
    <p className="mt-3 text-slate-600">Share an upcoming community event with Seattle Desi TV. Submissions are reviewed before publication.</p>
    {organization&&<div className="mt-6 rounded-2xl border border-pink-200 bg-pink-50 p-5"><p className="text-xs font-black uppercase text-pink-600">Submitting for organization</p><h2 className="mt-1 text-2xl font-black">{organization.name}</h2><p className="text-slate-500">{organization.location||"Seattle Area"}</p></div>}
    {message&&<div className="mt-6 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">{message}</div>}
    {user&&<div className="mt-6 grid gap-5 rounded-3xl border bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2"><label className="font-bold">Event title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="font-bold">Event date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label></div>
      <label className="font-bold">Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label>
      <label className="font-bold">Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1 min-h-36 w-full rounded-xl border p-3 font-normal"/></label>
      <div className="grid gap-4 md:grid-cols-2"><label className="font-bold">Ticket / registration URL<input value={form.ticket_url} onChange={e=>setForm({...form,ticket_url:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="font-bold">Flyer image URL<input value={form.image} onChange={e=>setForm({...form,image:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label></div>
      <div className="grid gap-4 md:grid-cols-2"><label className="font-bold">Organizer email<input type="email" value={form.poc_email} onChange={e=>setForm({...form,poc_email:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="font-bold">Organizer phone<input value={form.poc_phone} onChange={e=>setForm({...form,poc_phone:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label></div>
      <button onClick={submit} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-50">{saving?"Submitting...":"Submit Event for Review"}</button>
    </div>}
  </section><SiteFooter/></main>;
}
