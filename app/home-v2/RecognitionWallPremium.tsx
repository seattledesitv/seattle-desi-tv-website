type PersonRow = { id: string; name: string; photo?: string | null; image?: string | null; picture?: string | null; count?: number };

function firstImage(row: PersonRow) {
  return row.photo || row.image || row.picture || "";
}

function displayName(name?: string) {
  if (!name) return "SDTV Volunteer";
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 2 ? `${parts[0]} ${parts[1]}` : name;
}

function initials(name?: string) {
  return (name || "SDTV")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SD";
}

export default function RecognitionWallPremium({ people }: { people: PersonRow[] }) {
  const fallback = [1, 2, 3, 4, 5].map((rank) => ({ id: `fallback-${rank}`, name: `SDTV Volunteer ${rank}`, count: 110 - rank * 10 }));
  const ranked = [...people, ...fallback].slice(0, 5);

  return (
    <section className="relative overflow-hidden bg-[#fcf9f4] px-4 py-10 md:px-8">
      <div className="relative mx-auto min-h-[470px] w-full max-w-7xl overflow-hidden rounded-[2.3rem] bg-gradient-to-r from-[#070201] via-[#160705] to-[#070201] px-6 py-9 text-white shadow-[0_30px_80px_-24px_rgba(0,0,0,0.95)] md:px-12 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_36%,rgba(255,211,115,.13),transparent_23rem),radial-gradient(circle_at_12%_18%,rgba(212,160,23,.14),transparent_17rem),radial-gradient(circle_at_94%_18%,rgba(236,72,153,.10),transparent_18rem),linear-gradient(100deg,#070201_0%,#160705_45%,#070201_100%)]" />
        <div className="absolute inset-0 opacity-42 bg-[radial-gradient(circle,rgba(255,211,115,.50)_1px,transparent_1.8px)] [background-size:38px_38px]" />

        <svg className="absolute bottom-0 left-0 h-40 w-full opacity-95 drop-shadow-[0_-12px_25px_rgba(245,175,35,0.55)]" viewBox="0 0 1200 170" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-80,118 Q250,42 610,122 T1280,86 L1280,210 L-80,210 Z" fill="url(#hofGoldRibbonCompact)" />
          <path d="M-80,132 Q320,62 600,134 T1280,104" stroke="url(#hofSpecularStreamCompact)" strokeWidth="5" strokeLinecap="round" />
          <path d="M-80,148 Q350,82 590,150 T1280,120" stroke="#ffffff" strokeWidth="1.1" opacity="0.24" strokeLinecap="round" />
          <defs>
            <linearGradient id="hofGoldRibbonCompact" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4e300a" stopOpacity="0.38" />
              <stop offset="34%" stopColor="#ca942f" stopOpacity="0.76" />
              <stop offset="50%" stopColor="#ffd980" stopOpacity="0.88" />
              <stop offset="70%" stopColor="#f5af23" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#241402" stopOpacity="0.22" />
            </linearGradient>
            <linearGradient id="hofSpecularStreamCompact" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ca942f" stopOpacity="0" />
              <stop offset="20%" stopColor="#f5af23" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity=".95" />
              <stop offset="80%" stopColor="#ffd373" stopOpacity="0.76" />
              <stop offset="100%" stopColor="#ca942f" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute left-[16%] top-[25%] h-2.5 w-2.5 animate-pulse rounded-full bg-white shadow-[0_0_15px_6px_rgba(255,211,115,0.9)]" />
        <div className="absolute right-[9%] top-[34%] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_12px_5px_rgba(255,255,255,0.75)]" />
        <div className="absolute bottom-[24%] left-[42%] h-2 w-2 rounded-full bg-[#ffd373] shadow-[0_0_10px_4px_rgba(245,175,35,0.6)]" />

        <div className="relative z-10 grid min-h-[390px] gap-7 lg:grid-cols-[0.32fr_0.68fr] lg:items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#ffe099] drop-shadow-[0_0_12px_rgba(245,175,35,0.65)]">
              <span>🏆</span> SDTV Hall of Fame
            </div>
            <h2 className="mt-3 text-3xl font-black leading-[0.95] tracking-[-0.05em] text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)] md:text-4xl">
              Recognizing the Volunteers Who Make It Happen
            </h2>
            <p className="mt-4 text-sm font-light leading-6 text-gray-300">
              Celebrating the volunteers who power Seattle Desi TV's events, community stories, radio, and cultural programming.
            </p>
            <a href="/recognition" className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-[#ffe099] via-[#f5af23] to-[#cf8b0e] px-6 py-3 text-xs font-black tracking-wide text-black shadow-[0_0_30px_rgba(245,175,35,0.55)] transition hover:brightness-110 active:scale-95">
              🏆 View Leaderboard
            </a>
          </div>

          <div className="relative z-20">
            <div className="grid grid-cols-3 items-end justify-items-center gap-2 md:gap-8">
              <PodiumVolunteer person={ranked[1]} rank={2} medal="silver" />
              <PodiumVolunteer person={ranked[0]} rank={1} medal="gold" featured />
              <PodiumVolunteer person={ranked[2]} rank={3} medal="bronze" />
            </div>

            <div className="mx-auto mt-7 flex w-full max-w-lg justify-center gap-12 border-t border-white/10 pt-5">
              <SmallVolunteer person={ranked[3]} rank={4} />
              <SmallVolunteer person={ranked[4]} rank={5} />
            </div>

            <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-black/22 px-3 py-3 text-center backdrop-blur-sm">
              <Stat value="250+" label="Volunteers" />
              <Stat value="75+" label="Events" />
              <Stat value="1200+" label="Hours" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-black text-[#ffe099] md:text-xl">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/55 md:text-[10px]">{label}</p>
    </div>
  );
}

function Laurel({ className = "" }: { className?: string }) {
  return (
    <svg className={`absolute inset-0 h-full w-full scale-125 pointer-events-none ${className}`} viewBox="0 0 100 100">
      <path d="M 30,80 C 13,65 13,35 30,20 M 18,65 Q 10,55 20,45 M 22,50 Q 12,40 22,30" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 70,80 C 87,65 87,35 70,20 M 82,65 Q 90,55 80,45 M 78,50 Q 88,40 78,30" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 42,84 Q 50,78 58,84" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function PodiumVolunteer({ person, rank, medal, featured = false }: { person: PersonRow; rank: number; medal: "gold" | "silver" | "bronze"; featured?: boolean }) {
  const img = firstImage(person);
  const ring = medal === "gold" ? "from-[#cf8b0e] via-[#fff5d6] to-[#f5af23]" : medal === "silver" ? "from-slate-400 via-white to-slate-500" : "from-[#9a4f15] via-[#ffba82] to-[#e68a3e]";
  const badge = medal === "gold" ? "bg-[#ffe099] text-black shadow-[0_0_15px_#f5af23]" : medal === "silver" ? "bg-white text-black shadow-[0_0_15px_#fff]" : "bg-[#e68a3e] text-black shadow-[0_0_12px_#e68a3e]";
  const laurel = medal === "gold" ? "text-[#ffe099] drop-shadow-[0_0_12px_rgba(255,224,153,0.95)]" : medal === "silver" ? "text-slate-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-[#e68a3e] drop-shadow-[0_0_8px_rgba(230,138,62,0.5)]";
  const nameColor = medal === "gold" ? "group-hover:text-[#ffe099]" : medal === "bronze" ? "group-hover:text-[#e68a3e]" : "group-hover:text-white";

  return (
    <a href="/recognition" className={`group flex flex-col items-center ${featured ? "-translate-y-3" : ""}`}>
      <div className="relative mb-3 flex items-center justify-center">
        <span className={`absolute -top-2 left-1 z-30 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${badge}`}>{rank}</span>
        <div className={`${featured ? "h-32 w-32 md:h-36 md:w-36" : "h-28 w-28 md:h-30 md:w-30"} relative flex items-center justify-center`}>
          <Laurel className={laurel} />
          <div className={`${featured ? "h-[92px] w-[92px] md:h-[102px] md:w-[102px]" : "h-[80px] w-[80px] md:h-[88px] md:w-[88px]"} z-10 rounded-full bg-gradient-to-tr ${ring} p-[3px] shadow-[0_0_24px_6px_rgba(245,175,35,0.35)] transition-all duration-300 group-hover:scale-105`}>
            <div className="relative h-full w-full overflow-hidden rounded-full border border-white/30 bg-black/50 backdrop-blur-md">
              <div className="absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/35 to-transparent" />
              {img ? <img src={img} alt={person.name} className="relative z-10 h-full w-full object-cover brightness-110 contrast-110" /> : <div className="relative z-10 grid h-full w-full place-items-center text-base font-black text-pink-500">{initials(person.name)}</div>}
            </div>
          </div>
        </div>
      </div>
      <h4 className={`max-w-[9rem] truncate text-sm font-extrabold tracking-tight text-white transition-colors ${nameColor}`}>{displayName(person.name)}</h4>
      <p className={`${medal === "gold" ? "bg-gradient-to-r from-[#ffe099] to-[#f5af23] bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(245,175,35,0.5)]" : "text-gray-400"} mt-1 text-xs font-black`}>{person.count || 0} Points</p>
    </a>
  );
}

function SmallVolunteer({ person, rank }: { person: PersonRow; rank: number }) {
  const img = firstImage(person);
  return (
    <a href="/recognition" className="group flex flex-col items-center">
      <div className="relative mb-2">
        <span className="absolute -top-1 left-1/2 z-20 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-gray-600 bg-black/90 text-[10px] font-black text-white shadow-md">{rank}</span>
        <div className="h-[72px] w-[72px] rounded-full border border-white/10 bg-gradient-to-b from-white/20 to-transparent p-[2px] transition-all duration-300 group-hover:scale-105">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-black/50 backdrop-blur-sm">
            <div className="absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/15 to-transparent" />
            {img ? <img src={img} alt={person.name} className="relative z-10 h-full w-full object-cover" /> : <div className="relative z-10 grid h-full w-full place-items-center text-sm font-black text-pink-500">{initials(person.name)}</div>}
          </div>
        </div>
      </div>
      <h4 className="max-w-[8rem] truncate text-xs font-bold tracking-tight text-gray-300 transition-colors group-hover:text-white">{displayName(person.name)}</h4>
      <p className="text-[11px] font-medium text-gray-500">{person.count || 0} Points</p>
    </a>
  );
}
