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
    <section className="relative overflow-hidden bg-[#0b0308] text-white min-h-[240px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_42%,rgba(250,204,21,0.28),transparent_17rem),radial-gradient(circle_at_86%_30%,rgba(219,39,119,0.20),transparent_18rem),linear-gradient(105deg,#090306_0%,#170511_38%,#2b0718_62%,#10030b_100%)]" />
      <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle,rgba(250,204,21,0.5)_1px,transparent_1.7px)] [background-size:34px_34px]" />
      <div className="absolute -left-20 top-6 h-20 w-[70%] rotate-[-4deg] rounded-full bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent blur-sm" />
      <div className="absolute left-[30%] top-[47%] h-16 w-[80%] rotate-[-8deg] rounded-full bg-gradient-to-r from-transparent via-yellow-200/65 to-transparent blur-sm" />
      <div className="absolute -right-20 bottom-8 h-20 w-[80%] rotate-[5deg] rounded-full bg-gradient-to-r from-transparent via-yellow-400/45 to-transparent blur-md" />
      <div className="absolute -top-8 left-0 right-0 h-16 bg-white rounded-b-[50%]" />
      <div className="absolute -bottom-9 left-0 right-0 h-16 bg-white rounded-t-[50%]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-8 grid lg:grid-cols-[0.34fr_0.66fr] gap-5 items-center min-h-[240px]">
        <div>
          <p className="text-yellow-300 font-black uppercase tracking-[0.18em] text-xs">🏆 SDTV Recognition Wall</p>
          <h2 className="text-3xl md:text-4xl font-black leading-[0.95] tracking-[-0.06em] mt-3">Thank You Volunteers!</h2>
          <p className="text-white/85 text-sm leading-6 mt-3 max-w-sm">Your time, talent and energy power everything we do at SDTV. You are the heart of our community.</p>
          <a href="/recognition" className="inline-flex mt-5 bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 text-[#211300] px-5 py-3 rounded-xl font-black text-sm shadow-xl shadow-yellow-500/25 border border-yellow-100/70">View Leaderboard →</a>
        </div>

        <a href="/recognition" className="absolute right-8 md:right-12 top-8 text-pink-400 font-black text-xs">View All Volunteers →</a>

        <div className="relative h-[180px] md:h-[190px]">
          <div className="absolute left-[8%] top-[0%]"><Medal person={ranked[0]} rank={1} size="large" /></div>
          <div className="absolute left-[28%] top-[22%]"><Medal person={ranked[1]} rank={2} size="medium" /></div>
          <div className="absolute left-[48%] top-[10%]"><Medal person={ranked[2]} rank={3} size="medium" /></div>
          <div className="absolute left-[68%] top-[38%]"><Medal person={ranked[3]} rank={4} size="small" /></div>
          <div className="absolute left-[84%] top-[42%]"><Medal person={ranked[4]} rank={5} size="small" /></div>
        </div>
      </div>
    </section>
  );
}

function Medal({ person, rank, size }: { person: PersonRow; rank: number; size: "large" | "medium" | "small" }) {
  const img = firstImage(person);
  const sizes = size === "large" ? "w-28 h-28 md:w-32 md:h-32" : size === "medium" ? "w-24 h-24 md:w-28 md:h-28" : "w-20 h-20 md:w-24 md:h-24";
  const badge = rank === 1 ? "bg-yellow-400 text-slate-950" : rank === 2 ? "bg-slate-200 text-slate-950" : rank === 3 ? "bg-amber-600 text-white" : "bg-slate-900 text-white";
  const ring = rank === 1 ? "from-yellow-300 via-yellow-500 to-amber-700" : rank === 2 ? "from-slate-100 via-slate-300 to-slate-500" : rank === 3 ? "from-orange-300 via-amber-600 to-orange-900" : "from-pink-300 via-pink-700 to-slate-900";

  return (
    <div className="text-center min-w-[90px]">
      <div className={`${sizes} relative rounded-full p-[5px] bg-gradient-to-br ${ring} shadow-[0_0_0_8px_rgba(0,0,0,0.35),0_0_34px_rgba(250,204,21,0.30)]`}>
        <span className={`absolute -top-3 -left-2 w-8 h-8 rounded-full ${badge} grid place-items-center font-black border-2 border-white shadow-lg z-10`}>{rank}</span>
        <div className="w-full h-full rounded-full bg-white overflow-hidden grid place-items-center">
          {img ? <img src={img} alt={person.name} className="w-full h-full object-cover" /> : <span className="text-pink-600 font-black text-lg">SDTV</span>}
        </div>
      </div>
      <h3 className="font-black mt-2 text-sm max-w-[120px] truncate drop-shadow-lg">{displayName(person.name)}</h3>
      <p className="text-white/75 text-[11px] mt-0.5">{person.count || 0} Points</p>
    </div>
  );
}
