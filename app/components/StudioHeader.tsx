export default function StudioHeader() {
  const links = [
    ["Dashboard", "/studio"],
    ["Events", "/studio/events"],
    ["Pending Events", "/studio/events/pending"],
    ["Businesses", "/studio/businesses"],
    ["Coverage", "/studio/coverage"],
    ["Crew", "/studio/crew/pending"],
    ["Calendar", "/studio/assignments-calendar"],
    ["Roles", "/studio/roles"],
    ["Team", "/studio/team"],
    ["Radio", "/studio/radio-team"],
  ];

  return (
    <div className="bg-slate-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <a href="/" className="text-pink-300 font-bold text-sm">← Public Site</a>
            <h1 className="text-2xl font-black">SDTV Studio</h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="bg-white/10 hover:bg-pink-600 px-3 py-2 rounded-lg transition">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
