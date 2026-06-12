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
    <section className="relative overflow-hidden bg-[#070105] text-white min-h-[430px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(0,0,0,.98),transparent_36rem),radial-gradient(circle_at_8%_26%,rgba(98,20,50,.45),transparent_18rem),radial-gradient(circle_at_92%_26%,rgba(78,14,40,.45),transparent_18rem),linear-gradient(105deg,#060104_0%,#1a0410_16%,#070105_34%,#040003_50%,#070105_66%,#1a0410_84%,#060104_100%)]" />
      <div className="absolute inset-0 opacity-55 bg-[radial-gradient(circle,rgba(198,143,28,.44)_1px,transparent_1.8px)] [background-size:36px_36px]" />
      <div className="absolute -left-44 bottom-20 h-28 w-[62%] rotate-[-14deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(120,76,10,.08),rgba(255,219,114,.66),rgba(120,76,10,.08),transparent)] blur-[3px]" />
      <div className="absolute -right-44 bottom-20 h-28 w-[62%] rotate-[14deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(120,76,10,.08),rgba(255,219,114,.62),rgba(120,76,10,.08),transparent)] blur-[3px]" />
      <div className="absolute left-[10%] top-[35%] h-14 w-[82%] rotate-[-4deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(196,138,20,.08),rgba(255,221,118,.22),rgba(196,138,20,.08),transparent)] blur-[4px]" />
      <div className="absolute left-[6%] right-[6%] top-[10%] h-[70%] rounded-[3rem] bg-black/20 blur-3xl" />
      <div className="absolute -top-16 left-0 right-0 h-24 bg-white rounded-b-[50%]" />
      <div className="absolute -bottom-36 left-[-10%] right-[-10%] h-48 bg-white rounded-t-[50%]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-28 grid lg:grid-cols-[0.34fr_0.66fr] gap-8 items-center min-h-[430px]">
        <div className="relative z-20">
          <p className="text-[#d4a017] font-black uppercase tracking-[0.20em] text-xs">🏆 SDTV Recognition Wall</p>
          <h2 className="text-4xl md:text-5xl font-black leading-[0.88] tracking-[-0.07em] mt-3">Thank You<br />Volunteers!</h2>
          <p className="text-white/88 text-sm md:text-base leading-7 mt-4 max-w-sm">Your time, talent and energy power everything we do at SDTV. You are the heart of our community.</p>
          <a href="/recognition" className="inline-flex mt-6 bg-[#d4a017] hover:bg-[#e0b334] text-[#180603] px-5 py-3 rounded-full font-black text-sm shadow-xl shadow-black/30 border border-yellow-100/40">View Leaderboard →</a>
        </div>

        <a href="/recognition" className="absolute right-8 md:right-12 top-10 text-pink-400 font-black text-xs z-30">View All Volunteers →</a>

        <div className="relative h-[310px] md:h-[330px] z-20">
          <div className="absolute left-[5%] top-[4%]"><Medal person={ranked[0]} rank={1} size="large" /></div>
          <div className="absolute left-[25%] top-[30%]"><Medal person={ranked[1]} rank={2} size="medium" /></div>
          <div className="absolute left-[47%] top-[15%]"><Medal person={ranked[2]} rank={3} size="medium" /></div>
          <div className="absolute left-[68%] top-[43%]"><Medal person={ranked[3]} rank={4} size="small" /></div>
          <div className="absolute left-[84%] top-[47%]"><Medal person={ranked[4]} rank={5} size="small" /></div>
        </div>
      </div>
    </section>
  );
}

function Medal({ person, rank, size }: { person: PersonRow; rank: number; size: "large" | "medium" | "small" }) {
  const img = firstImage(person);
  const sizes = size === "large" ? "w-24 h-24 md:w-28 md:h-28" : size === "medium" ? "w-20 h-20 md:w-24 md:h-24" : "w-16 h-16 md:w-20 md:h-20";
  const badge = rank === 1 ? "bg-[#d4a017] text-slate-950" : rank === 2 ? "bg-slate-200 text-slate-950" : rank === 3 ? "bg-[#b96d18] text-white" : "bg-slate-950 text-white";
  const ring = rank === 1 ? "from-[#f2c94c] via-[#c48a14] to-[#583104]" : rank === 2 ? "from-slate-100 via-slate-300 to-slate-600" : rank === 3 ? "from-[#f0a54b] via-[#a15c13] to-[#5b2c06]" : "from-[#d64b8b] via-[#6d0a32] to-[#25020f]";

  return (
    <div className="text-center min-w-[92px] md:min-w-[112px]">
      <div className={`${sizes} relative mx-auto rounded-full p-[5px] bg-gradient-to-br ${ring} shadow-[0_0_0_7px_rgba(0,0,0,0.42),0_16px_32px_rgba(0,0,0,0.58),0_0_28px_rgba(196,138,20,0.24)]`}>
        <span className={`absolute -top-3 -left-2 w-8 h-8 rounded-full ${badge} grid place-items-center font-black border-2 border-white shadow-lg z-10 text-sm`}>{rank}</span>
        <div className="w-full h-full rounded-full bg-white overflow-hidden grid place-items-center">
          {img ? <img src={img} alt={person.name} className="w-full h-full object-cover" /> : <span className="text-pink-600 font-black text-base">SDTV</span>}
        </div>
      </div>
      <h3 className="font-black mt-4 text-sm md:text-base max-w-[130px] truncate text-white drop-shadow-[0_3px_8px_rgba(0,0,0,1)]">{displayName(person.name)}</h3>
      <p className="text-[#f4c24f] text-[11px] md:text-xs mt-1 font-extrabold drop-shadow-[0_3px_7px_rgba(0,0,0,1)]">{person.count || 0} Points</p>
    </div>
  );
}
