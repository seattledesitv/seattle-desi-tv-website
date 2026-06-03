"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

type TeamMember = {
  id: string;
  name: string;
  title: string;
  image: string;
};

export default function PublicTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeam() {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,name,title,image")
        .order("created_at", { ascending: true });

      if (error) setError(error.message);
      else setMembers(data || []);
      setLoading(false);
    }
    loadTeam();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <a href="/" className="text-pink-300 font-bold">← Back to Seattle Desi TV</a>
        <div className="mt-8 mb-10 text-center">
          <p className="text-pink-300 font-black uppercase tracking-[0.3em]">Seattle Desi TV</p>
          <h1 className="text-4xl md:text-6xl font-black mt-3">Meet Our Team</h1>
          <p className="text-slate-300 max-w-2xl mx-auto mt-4">The community builders, creators, hosts, volunteers, and media team powering Seattle Desi TV.</p>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">Loading team...</div>}
        {error && <div className="bg-red-100 text-red-800 rounded-2xl p-6">{error}</div>}

        {!loading && !error && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => (
              <article key={member.id} className="bg-white text-slate-950 rounded-2xl overflow-hidden shadow-xl">
                {member.image ? <img src={member.image} alt={member.name} className="w-full h-72 object-cover" /> : <div className="w-full h-72 bg-pink-50 grid place-items-center text-pink-600 font-black">No image</div>}
                <div className="p-5">
                  <h2 className="text-xl font-black">{member.name}</h2>
                  <p className="text-pink-600 font-bold mt-1">{member.title}</p>
                </div>
              </article>
            ))}
            {members.length === 0 && <p className="text-slate-300">No team members found.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
