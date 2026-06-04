const publicLinks = [
  ["Events", "/events", "Submit and browse community events."],
  ["Business Directory", "/businesses", "Explore and submit local Desi businesses."],
  ["Team", "/team", "Meet the Seattle Desi TV team."],
  ["Portal", "/portal", "Open the full SDTV navigation hub."],
];

const teamLinks = [
  ["My Assignments", "/my-assignments", "View events you are assigned to cover."],
  ["My Availability", "/my-availability", "Tell SDTV when you are available."],
];

const adminLinks = [
  ["Studio", "/studio", "Admin dashboard."],
  ["Coverage Requests", "/studio/coverage", "Review organizer coverage requests."],
  ["Pending Crew", "/studio/crew/pending", "Approve team member coverage requests."],
  ["Assignments Calendar", "/studio/assignments-calendar", "See assigned crew and availability."],
  ["Role Requests", "/studio/roles", "Approve public and team member roles."],
];

function LinkCard({ label, href, description }: { label: string; href: string; description: string }) {
  return (
    <a href={href} className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition">
      <h3 className="text-xl font-black text-slate-950">{label}</h3>
      <p className="text-gray-600 mt-2 text-sm">{description}</p>
    </a>
  );
}

function Section({ title, subtitle, links }: { title: string; subtitle: string; links: string[][] }) {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-8">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-3xl font-black text-slate-950">{title}</h2>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {links.map(([label, href, description]) => <LinkCard key={href} label={label} href={href} description={description} />)}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 text-slate-950">
      <div className="bg-[#050b18] text-white text-sm px-6 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 flex-wrap">
          <a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a>
          <a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a>
          <a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a>
        </div>
        <span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-6 md:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 font-black text-xl">
            <img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-14 w-auto" />
            <span>Seattle Desi TV</span>
          </a>
          <nav className="hidden lg:flex items-center gap-3 font-bold text-sm">
            <a href="/events" className="hover:text-pink-600">Events</a>
            <a href="/businesses" className="hover:text-pink-600">Businesses</a>
            <a href="/portal" className="hover:text-pink-600">Portal</a>
            <a href="/my-assignments" className="hover:text-pink-600">My Assignments</a>
            <a href="/studio" className="hover:text-pink-600">Studio</a>
            <a href="/login" className="bg-pink-600 text-white px-4 py-2 rounded-xl">Login</a>
          </nav>
          <a href="/portal" className="lg:hidden bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">Menu</a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-30 bg-cover bg-center" style={{ backgroundImage: "url('/hero-sdtv.png')" }} />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <p className="text-pink-300 font-black uppercase tracking-wide">Voice of the Desi Community</p>
          <h1 className="text-5xl md:text-7xl font-black max-w-4xl leading-tight mt-3">Seattle Desi TV</h1>
          <p className="text-xl text-slate-200 max-w-3xl mt-5">Community stories, events, culture, interviews, radio, and media coverage across the Pacific Northwest.</p>
          <div className="flex flex-wrap gap-4 mt-8">
            <a href="/events" className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black">Browse Events</a>
            <a href="/portal" className="bg-white text-slate-950 px-6 py-4 rounded-xl font-black">Open Portal</a>
            <a href="/businesses" className="border border-white/70 px-6 py-4 rounded-xl font-black">Local Businesses</a>
          </div>
        </div>
      </section>

      <Section title="Public Website" subtitle="Clean direct routes for community visitors and organizers." links={publicLinks} />
      <Section title="SDTV Team" subtitle="Private operational pages for approved team members." links={teamLinks} />
      <Section title="Studio Admin" subtitle="Admin tools for event, coverage, crew, role, and schedule management." links={adminLinks} />

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10">
        <div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10">
          <h2 className="text-3xl font-black">What changed?</h2>
          <p className="text-slate-300 mt-3 max-w-4xl">The homepage is now a marketing and navigation page using real URLs. The old hash-tab workflow has been retired from the homepage so new features can live in maintainable route-based pages.</p>
          <div className="grid md:grid-cols-3 gap-4 mt-6 text-sm">
            <div className="bg-white/10 rounded-2xl p-4"><b>Public</b><br />/events, /businesses, /team</div>
            <div className="bg-white/10 rounded-2xl p-4"><b>Team</b><br />/my-assignments, /my-availability</div>
            <div className="bg-white/10 rounded-2xl p-4"><b>Admin</b><br />/studio, /studio/coverage, /studio/assignments-calendar</div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white px-6 md:px-10 py-8 text-center text-sm text-gray-500">
        © Seattle Desi TV. Built for community media operations.
      </footer>
    </main>
  );
}
