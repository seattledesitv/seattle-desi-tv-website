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
    <section className="relative bg-[#fcf9f4] px-4 py-8 md:px-8 md:py-10">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#080201] px-5 py-7 text-white shadow-2xl md:px-10 md:py-8" style={{ minHeight: 520 }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,210,100,.16),transparent_20rem),linear-gradient(100deg,#070201,#210715,#070201)]" />
        <div className="absolute inset-0 opacity-34 bg-[radial-gradient(circle,rgba(255,210,100,.55)_1px,transparent_2px)] [background-size:38px_38px]" />
        <div className="absolute left-[-8%] right-[-8%] bottom-16 h-16 rotate-[-3deg] rounded-full bg-gradient-to-r from-transparent via-[#f5af23]/36 to-transparent blur-sm" />

        <div className="relative z-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ffe099]">🏆 SDTV Hall of Fame</p>
          <h2 className="mt-2 text-3xl font-black leading-none md:text-4xl">Recognizing Our Volunteers</h2>
          <p className="mx-auto mt-2 max-w-3xl text-xs text-white/75 md:text-sm">Celebrating the volunteers who power SDTV events, stories, radio, and cultural programming.</p>
        </div>

        <div className="relative z-10 mt-8 grid grid-cols-2 gap-5 md:mt-8 md:grid-cols-5 md:items-end md:gap-4">
          {ordered.map((person, index) => {
            const rank = index === 0 ? 2 : index === 1 ? 1 : index === 2 ? 3 : index + 1;
            return <Volunteer key={person.id} person={person} rank={rank} featured={rank === 1} />;
          })}
        </div>

        <div className="relative z-10 mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-center backdrop-blur">
          <Stat value="250+" label="Volunteers" />
          <Stat value="75+" label="Events" />
          <Stat value="1200+" label="Hours" />
        </div>

        <div className="relative z-20 mt-4 text-center">
          <a href="/recognition" className="inline-flex rounded-xl bg-gradient-to-r from-[#ffe099] via-[#f5af23] to-[#cf8b0e] px-6 py-3 text-xs font-black tracking-wide text-black shadow-[0_0_24px_rgba(245,175,35,0.48)]">🏆 View Recognition Leaderboard</a>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><p className="text-lg font-black text-[#ffe099]">{value}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">{label}</p></div>;
}

function RingSwirls({ rank }: { rank: number }) {
  const color = rank === 1 ? "#ffe099" : rank === 2 ? "#dbeafe" : rank === 3 ? "#fb923c" : "#ec4899";
  return (
    <svg className="absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)]" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M23 86C8 58 22 24 52 15" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.82" />
      <path d="M80 17C107 31 113 68 92 93" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.82" />
      <path d="M37 103C47 111 70 112 82 103" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.82" />
      <path d="M15 61C13 49 16 39 22 30" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M105 50C108 63 106 75 99 86" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

function Volunteer({ person, rank, featured = false }: { person: PersonRow; rank: number; featured?: boolean }) {
  const img = firstImage(person);
  const ring = rank === 1 ? "from-[#cf8b0e] via-[#fff5d6] to-[#f5af23]" : rank === 2 ? "from-slate-300 via-white to-slate-600" : rank === 3 ? "from-[#9a4f15] via-[#ffba82] to-[#e68a3e]" : "from-[#d64b8b] via-[#6d0a32] to-[#25020f]";
  const badge = rank === 1 ? "bg-[#ffe099] text-black" : rank === 2 ? "bg-white text-black" : rank === 3 ? "bg-[#e68a3e] text-black" : "bg-black text-white border border-white/30";
  return (
    <a href="/recognition" className={`flex flex-col items-center text-center ${featured ? "md:-translate-y-5" : ""}`}>
      <div className="relative">
        <RingSwirls rank={rank} />
        <span className={`absolute -left-2 -top-2 z-20 grid h-7 w-7 place-items-center rounded-full text-xs font-black shadow-xl ${badge}`}>{rank}</span>
        <div className={`${featured ? "h-32 w-32 md:h-40 md:w-40" : "h-28 w-28 md:h-32 md:w-32"} relative z-10 grid place-items-center rounded-full bg-gradient-to-br ${ring} p-2 shadow-[0_16px_32px_rgba(0,0,0,.50)]`}>
          <div className="h-full w-full overflow-hidden rounded-full bg-white">
            {img ? <img src={img} alt={person.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xl font-black text-pink-600">{initials(person.name)}</div>}
          </div>
        </div>
      </div>
      <h3 className="mt-3 max-w-[9rem] text-sm font-black leading-tight text-white md:text-base">{displayName(person.name)}</h3>
      <p className="mt-0.5 text-xs font-black text-[#ffe099] md:text-sm">{person.count || 0} Points</p>
    </a>
  );
}
