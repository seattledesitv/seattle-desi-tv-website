"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isPubliclyHidden, loadHiddenUsers } from "../lib/publicVisibility";

const supabase = getSupabaseBrowserClient();

type RadioTeamMember = { id: string; name: string; title: string; segment_name: string; image: string; email?: string | null; user_id?: string | null };

export default function PublicRadioTeamPage() {
  const [members, setMembers] = useState<RadioTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRadioTeam() {
      const [teamResult, hidden] = await Promise.all([
        supabase.from("radio_team_members").select("id,name,title,segment_name,image,email,user_id").order("created_at", { ascending: true }),
        loadHiddenUsers(supabase),
      ]);
      if (teamResult.error) setError(teamResult.error.message);
      else setMembers((teamResult.data || []).filter((member: any) => !isPubliclyHidden(member, hidden)));
      setLoading(false);
    }
    loadRadioTeam();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mt-8 mb-10 text-center">
            <p className="text-pink-300 font-black uppercase tracking-[0.3em]">Seattle Desi Radio</p>
            <h1 className="text-4xl md:text-6xl font-black mt-3">Meet Our Radio Team</h1>
            <p className="text-slate-300 max-w-2xl mx-auto mt-4">The voices, hosts, RJs, and creators behind Seattle Desi Radio segments.</p>
          </div>
          {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">Loading radio team...</div>}
          {error && <div className="bg-red-100 text-red-800 rounded-2xl p-6">{error}</div>}
          {!loading && !error && <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => <article key={member.id} className="bg-white text-slate-950 rounded-2xl overflow-hidden shadow-xl">
              {member.image ? <img src={member.image} alt={member.name} className="w-full h-72 object-cover" /> : <div className="w-full h-72 bg-pink-50 grid place-items-center text-pink-600 font-black">No image</div>}
              <div className="p-5"><h2 className="text-xl font-black">{member.name}</h2><p className="text-slate-600 font-bold mt-1">{member.title}</p><p className="text-pink-600 font-black mt-2">{member.segment_name}</p></div>
            </article>)}
            {members.length === 0 && <p className="text-slate-300">No radio team members found.</p>}
          </div>}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
