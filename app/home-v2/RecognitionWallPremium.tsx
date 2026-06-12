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
    <section className="relative overflow-hidden bg-[#080105] text-white min-h-[330px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(0,0,0,.92),transparent_25rem),radial-gradient(circle_at_6%_30%,rgba(120,28,61,.55),transparent_19rem),radial-gradient(circle_at_95%_28%,rgba(88,16,45,.55),transparent_18rem),linear-gradient(105deg,#070105_0%,#2a0617_24%,#080105_50%,#2a0617_76%,#070105_100%)]" />
      <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle,rgba(198,143,28,.52)_1px,transparent_1.8px)] [background-size:34px_34px]" />
      <div className="absolute -left-32 bottom-8 h-24 w-[58%] rotate-[-9deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(146,91,12,.12),rgba(255,219,114,.74),rgba(146,91,12,.12),transparent)] blur-[2px]" />
      <div className="absolute -right-32 bottom-8 h-24 w-[58%] rotate-[9deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(146,91,12,.12),rgba(255,219,114,.70),rgba(146,91,12,.12),transparent)] blur-[2px]" />
      <div className="absolute left-[18%] top-[32%] h-12 w-[66%] rotate-[-3deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(196,138,20,.12),rgba(255,221,118,.34),rgba(196,138,20,.12),transparent)] blur-[3px]" />
      <div className="absolute -top-10 left-0 right-0 h-20 bg-white rounded-b-[50%]" />
      <div className="absolute -bottom-24 left-[-8%] right-[-8%] h-40 bg-white rounded-t-[50%]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-12 pb-20 grid lg:grid-cols-[0.35fr_0.65fr] gap-7 items-center min-h-[330px]">
        <div className="relative z-20">
          <p className="text-[#d4a017] font-black uppercase tracking-[0.20em] text-xs">🏆 SDTV Recognition Wall</p>
          <h2 className="text-4xl md:text-5xl font-black leading-[0.88] tracking-[-0.07em] mt-3">Thank You<br />Volunteers!</h2>
          <p className="text-white/86 text-sm md:text-base leading-6 mt-4 max-w-sm">Your time, talent and energy power everything we do at SDTV. You are the heart of our community.</p>
          <a href="/recognition" className="inline-flex mt-5 bg-[#d4a017] hover:bg-[#e0b334] text-[#180603] px-5 py-3 rounded-full font-black text-sm shadow-xl shadow-black/30 border border-yellow-100/40">View Leaderboard →</a>
        </div>

        <a href="/recognition" className="absolute right-8 md:right-12 top-9 text-pink-400 font-black text-xs z-30">View All Volunteers →</a>

        <div className="relative h-[235px] md:h-[250px] z-20">
          <div className="absolute left-[6%] top-[0%]"><Medal person={ranked[0]} rank={1} size="large" /></div>
          <div className="absolute left-[26%] top-[23%]"><Medal person={ranked[1]} rank={2} size="medium" /></div>
          <div className="absolute left-[47%] top-[12%]"><Medal person={ranked[2]} rank={3} size="medium" /></div>
          <div className="absolute left-[68%] top-[38%]"><Medal person={ranked[3]} rank={4} size="small" /></div>
          <div className="absolute left-[84%] top-[42%]"><Medal person={ranked[4]} rank={5} size="small" /></div>
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
      <div className={`${sizes} relative mx-auto rounded-full p-[5px] bg-gradient-to-br ${ring} shadow-[0_0_0_7px_rgba(0,0,0,0.38),0_16px_32px_rgba(0,0,0,0.52),0_0_28px_rgba(196,138,20,0.26)]`}>
        <span className={`absolute -top-3 -left-2 w-8 h-8 rounded-full ${badge} grid place-items-center font-black border-2 border-white shadow-lg z-10 text-sm`}>{rank}</span>
        <div className="w-full h-full rounded-full bg-white overflow-hidden grid place-items-center">
          {img ? <img src={img} alt={person.name} className="w-full h-full object-cover" /> : <span className="text-pink-600 font-black text-base">SDTV</span>}
        </div>
      </div>
      <h3 className="font-black mt-3 text-sm md:text-base max-w-[130px] truncate text-white drop-shadow-[0_2px_7px_rgba(0,0,0,.95)]">{displayName(person.name)}</h3>
      <p className="text-[#f4c24f] text-[11px] md:text-xs mt-0.5 font-extrabold drop-shadow-[0_2px_5px_rgba(0,0,0,.95)]">{person.count || 0} Points</p>
    </div>
  );
}
