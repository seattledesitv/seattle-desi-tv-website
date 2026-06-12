type PersonRow = { id: string; name: string; photo?: string | null; image?: string | null; picture?: string | null; count?: number };

function firstImage(row: PersonRow) {
  return row.photo || row.image || row.picture || "";
}

function displayName(name?: string) {
  if (!name) return "SDTV Volunteer";
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 2 ? `${parts[0]} ${parts[1]}` : name;
}

export default function RecognitionWallPremium({ people }: { people: PersonRow[] }) {
  const fallback = [1, 2, 3, 4, 5].map((rank) => ({ id: `fallback-${rank}`, name: `SDTV Volunteer ${rank}`, count: 110 - rank * 10 }));
  const ranked = [...people, ...fallback].slice(0, 5);

  return (
    <section className="relative overflow-hidden bg-[#070105] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,0,0,.94),transparent_32rem),radial-gradient(circle_at_8%_16%,rgba(100,20,52,.34),transparent_20rem),radial-gradient(circle_at_92%_18%,rgba(100,20,52,.26),transparent_20rem),linear-gradient(105deg,#070105_0%,#1a0410_18%,#060104_45%,#050003_55%,#180410_82%,#070105_100%)]" />
      <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle,rgba(212,160,23,.48)_1px,transparent_1.8px)] [background-size:36px_36px]" />
      <div className="absolute left-[-15%] top-[58%] h-24 w-[130%] -rotate-3 rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(164,99,12,.12)_18%,rgba(255,221,112,.72)_43%,rgba(255,221,112,.30)_55%,rgba(164,99,12,.10)_74%,transparent_100%)] blur-[2px]" />
      <div className="absolute left-[-10%] top-[64%] h-16 w-[120%] rotate-2 rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,221,112,.18)_24%,rgba(255,221,112,.42)_50%,rgba(255,221,112,.16)_76%,transparent_100%)] blur-[5px]" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-16">
        <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[#d4a017] font-black uppercase tracking-[0.22em] text-xs">🏆 SDTV Recognition Wall</p>
            <h2 className="mt-3 text-4xl md:text-5xl font-black leading-[0.9] tracking-[-0.06em]">Thank You<br />Volunteers!</h2>
            <p className="mt-4 max-w-2xl text-sm md:text-base leading-7 text-white/84">Your time, talent and energy power everything we do at SDTV. You are the heart of our community.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/recognition" className="rounded-full bg-[#d4a017] px-5 py-3 text-sm font-black text-[#180603] shadow-xl shadow-black/30">View Leaderboard →</a>
            <a href="/team" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur">Meet Team</a>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5 md:items-end">
          {ranked.map((person, index) => <VolunteerCard key={person.id} person={person} rank={index + 1} />)}
        </div>
      </div>
    </section>
  );
}

function VolunteerCard({ person, rank }: { person: PersonRow; rank: number }) {
  const img = firstImage(person);
  const isTop = rank === 1;
  const ring = rank === 1 ? "from-[#f6d365] via-[#d4a017] to-[#5b3304]" : rank === 2 ? "from-slate-100 via-slate-300 to-slate-700" : rank === 3 ? "from-[#f0a54b] via-[#a15c13] to-[#5b2c06]" : "from-[#d64b8b] via-[#6d0a32] to-[#25020f]";
  const badge = rank === 1 ? "bg-[#d4a017] text-slate-950" : rank === 2 ? "bg-slate-200 text-slate-950" : rank === 3 ? "bg-[#b96d18] text-white" : "bg-slate-950 text-white";

  return (
    <a href="/recognition" className={`${isTop ? "md:-translate-y-5" : ""} group rounded-[1.6rem] border border-white/12 bg-black/42 p-4 text-center shadow-2xl shadow-black/30 backdrop-blur-md transition hover:-translate-y-2 hover:bg-black/56`}>
      <div className={`relative mx-auto ${isTop ? "h-28 w-28" : "h-24 w-24"} rounded-full bg-gradient-to-br ${ring} p-[6px] shadow-[0_0_0_6px_rgba(255,255,255,.06),0_18px_34px_rgba(0,0,0,.55)]`}>
        <span className={`absolute -left-2 -top-2 grid h-8 w-8 place-items-center rounded-full border-2 border-white ${badge} text-sm font-black shadow-xl`}>{rank}</span>
        <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white">
          {img ? <img src={img} alt={person.name} className="h-full w-full object-cover" /> : <span className="text-lg font-black text-pink-600">SDTV</span>}
        </div>
      </div>
      <h3 className="mt-4 truncate text-base font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,.9)]">{displayName(person.name)}</h3>
      <p className="mt-1 text-xs font-extrabold text-[#f4c24f]">{person.count || 0} Points</p>
      <p className="mt-3 rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white/70">Community Star</p>
    </a>
  );
}
