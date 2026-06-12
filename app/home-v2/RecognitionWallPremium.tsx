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
  return (name || "SDTV").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "SD";
}

export default function RecognitionWallPremium({ people }: { people: PersonRow[] }) {
  const fallback = [1, 2, 3, 4, 5].map((rank) => ({ id: `fallback-${rank}`, name: `SDTV Volunteer ${rank}`, count: 110 - rank * 10 }));
  const ranked = [...people, ...fallback].slice(0, 5);
  const ordered = [ranked[1], ranked[0], ranked[2], ranked[3], ranked[4]];

  return (
    <section className="relative bg-[#050b18] px-4 py-12 md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(236,72,153,.12),transparent_24rem),radial-gradient(circle_at_82%_20%,rgba(255,210,100,.08),transparent_18rem)]" />
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#080201] px-6 py-9 text-white shadow-2xl md:px-12" style={{ minHeight: 620 }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,210,100,.18),transparent_22rem),linear-gradient(100deg,#070201,#210715,#070201)]" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle,rgba(255,210,100,.55)_1px,transparent_2px)] [background-size:38px_38px]" />
        <div className="absolute left-[-8%] right-[-8%] bottom-20 h-20 rotate-[-3deg] rounded-full bg-gradient-to-r from-transparent via-[#f5af23]/42 to-transparent blur-sm" />

        <div className="relative z-10 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#ffe099]">🏆 SDTV Hall of Fame</p>
          <h2 className="mt-3 text-4xl font-black leading-none md:text-5xl">Recognizing Our Volunteers</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-white/75 md:text-base">Celebrating the volunteers who power SDTV events, stories, radio, and cultural programming.</p>
        </div>

        <div className="relative z-10 mt-10 grid grid-cols-2 gap-6 md:grid-cols-5 md:items-end">
          {ordered.map((person, index) => {
            const rank = index === 0 ? 2 : index === 1 ? 1 : index === 2 ? 3 : index + 1;
            return <Volunteer key={person.id} person={person} rank={rank} featured={rank === 1} />;
          })}
        </div>

        <div className="relative z-10 mx-auto mt-7 grid max-w-3xl grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-center backdrop-blur">
          <Stat value="250+" label="Volunteers" />
          <Stat value="75+" label="Events" />
          <Stat value="1200+" label="Hours" />
        </div>

        <div className="relative z-20 mt-5 pb-3 text-center">
          <a href="/recognition" className="inline-flex rounded-xl bg-gradient-to-r from-[#ffe099] via-[#f5af23] to-[#cf8b0e] px-7 py-3.5 text-xs font-black tracking-wide text-black shadow-[0_0_30px_rgba(245,175,35,0.55)]">🏆 View Recognition Leaderboard</a>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><p className="text-xl font-black text-[#ffe099]">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/55">{label}</p></div>;
}

function RingSwirls({ rank }: { rank: number }) {
  const color = rank === 1 ? "#ffe099" : rank === 2 ? "#dbeafe" : rank === 3 ? "#fb923c" : "#ec4899";
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: -28,
        top: -28,
        width: "calc(100% + 56px)",
        height: "calc(100% + 56px)",
        zIndex: 1,
        pointerEvents: "none",
        overflow: "visible",
        filter: `drop-shadow(0 0 10px ${color})`,
      }}
    >
      <path d="M43 124C18 100 18 58 43 36" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <path d="M32 103C22 91 19 75 25 59" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.62" />
      <path d="M117 124C142 100 142 58 117 36" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <path d="M128 103C138 91 141 75 135 59" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.62" />
      <path d="M60 138C72 148 88 148 100 138" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d="M48 27C56 19 68 15 80 15" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <path d="M112 27C104 19 92 15 80 15" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function Volunteer({ person, rank, featured = false }: { person: PersonRow; rank: number; featured?: boolean }) {
  const img = firstImage(person);
  const ring = rank === 1 ? "from-[#cf8b0e] via-[#fff5d6] to-[#f5af23]" : rank === 2 ? "from-slate-300 via-white to-slate-600" : rank === 3 ? "from-[#9a4f15] via-[#ffba82] to-[#e68a3e]" : "from-[#d64b8b] via-[#6d0a32] to-[#25020f]";
  const badge = rank === 1 ? "bg-[#ffe099] text-black" : rank === 2 ? "bg-white text-black" : rank === 3 ? "bg-[#e68a3e] text-black" : "bg-black text-white border border-white/30";
  return (
    <a href="/recognition" className={`flex flex-col items-center text-center ${featured ? "md:-translate-y-6" : ""}`}>
      <div className="relative" style={{ overflow: "visible" }}>
        <RingSwirls rank={rank} />
        <span className={`absolute -left-2 -top-2 z-30 grid h-8 w-8 place-items-center rounded-full text-sm font-black shadow-xl ${badge}`}>{rank}</span>
        <div className={`${featured ? "h-36 w-36 md:h-44 md:w-44" : "h-32 w-32 md:h-36 md:w-36"} relative z-10 grid place-items-center rounded-full bg-gradient-to-br ${ring} p-2 shadow-[0_18px_38px_rgba(0,0,0,.55)]`}>
          <div className="h-full w-full overflow-hidden rounded-full bg-white">
            {img ? <img src={img} alt={person.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xl font-black text-pink-600">{initials(person.name)}</div>}
          </div>
        </div>
      </div>
      <h3 className="mt-4 max-w-[10rem] text-base font-black leading-tight text-white">{displayName(person.name)}</h3>
      <p className="mt-1 text-sm font-black text-[#ffe099]">{person.count || 0} Points</p>
    </a>
  );
}
