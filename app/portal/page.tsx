export default function PortalPage() {
  const publicLinks = [
    ["Home", "/"],
    ["Events", "/events"],
    ["Business Directory", "/businesses"],
    ["Team", "/team"],
    ["Radio Team", "/radio-team"],
    ["Login / Account", "/login"],
  ];

  const teamLinks = [
    ["My Assignments", "/my-assignments"],
    ["My Availability", "/my-availability"],
    ["Request Team Role", "/login"],
  ];

  const studioLinks = [
    ["Studio Dashboard", "/studio"],
    ["Pending Events", "/studio/events/pending"],
    ["All Events", "/studio/events"],
    ["Coverage Requests", "/studio/coverage"],
    ["Pending Crew", "/studio/crew/pending"],
    ["Crew Requests", "/studio/crew"],
    ["Assignments Calendar", "/studio/assignments-calendar"],
    ["Businesses", "/studio/businesses"],
    ["Team Management", "/studio/team"],
    ["Radio Team Management", "/studio/radio-team"],
    ["Role Requests", "/studio/roles"],
  ];

  const renderCard = (title: string, description: string, links: string[][], accent: string) => (
    <section className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="text-gray-600 mt-2 mb-5">{description}</p>
      <div className="grid gap-3">
        {links.map(([label, href]) => (
          <a key={href} href={href} className={`block rounded-xl px-4 py-3 font-bold border hover:scale-[1.01] transition ${accent}`}>
            {label}
          </a>
        ))}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <a href="/" className="text-pink-300 font-bold">← Back to Seattle Desi TV</a>
        <div className="mt-5 mb-10">
          <h1 className="text-4xl md:text-6xl font-black">Seattle Desi TV Portal</h1>
          <p className="text-slate-300 mt-3 max-w-3xl">One clean place for public visitors, SDTV team members, and admins. This page replaces the confusing hash-menu workflow with direct routes.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {renderCard("Public", "For community visitors, organizers, and businesses.", publicLinks, "hover:bg-pink-50 hover:border-pink-300")}
          {renderCard("SDTV Team", "For approved team members handling coverage and availability.", teamLinks, "hover:bg-yellow-50 hover:border-yellow-300")}
          {renderCard("Studio Admin", "For PM admins and super admins managing operations.", studioLinks, "hover:bg-blue-50 hover:border-blue-300")}
        </div>

        <section className="mt-8 bg-white/10 border border-white/10 rounded-3xl p-6">
          <h2 className="text-2xl font-black">Recommended Menu Structure</h2>
          <p className="text-slate-300 mt-2">The homepage should use simple direct links for these routes and slowly retire the old #tab menu.</p>
          <div className="grid md:grid-cols-3 gap-4 mt-5 text-sm">
            <div className="bg-slate-900 rounded-2xl p-4"><b>Public Menu</b><br />Home, Events, Businesses, Team, Radio, Contact</div>
            <div className="bg-slate-900 rounded-2xl p-4"><b>Team Menu</b><br />My Assignments, My Availability, Login</div>
            <div className="bg-slate-900 rounded-2xl p-4"><b>Admin Menu</b><br />Studio, Coverage, Crew, Roles, Calendar</div>
          </div>
        </section>
      </div>
    </main>
  );
}
