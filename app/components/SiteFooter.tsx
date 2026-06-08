import ContactCTA from "./ContactCTA";

export default function SiteFooter() {
  return (
    <>
      <ContactCTA />
      <footer className="bg-[#050b18] text-white px-6 md:px-10 py-10 mt-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          <div>
            <h2 className="text-2xl font-black">Seattle Desi TV</h2>
            <p className="text-slate-300 mt-3 text-sm">Community media, culture, events, radio, interviews, and stories across the Pacific Northwest.</p>
          </div>
          <div>
            <h3 className="font-black mb-3">Explore</h3>
            <div className="grid gap-2 text-sm text-slate-300">
              <a href="/events">Events</a>
              <a href="/businesses">Businesses</a>
              <a href="/team">Team</a>
              <a href="/contact">Contact</a>
              <a href="/portal">Portal</a>
            </div>
          </div>
          <div>
            <h3 className="font-black mb-3">Team</h3>
            <div className="grid gap-2 text-sm text-slate-300">
              <a href="/my-hub">My Hub</a>
              <a href="/my-assignments">My Assignments</a>
              <a href="/my-availability">My Availability</a>
              <a href="/studio">Studio</a>
              <a href="/login">Login</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-8 pt-6 text-xs text-slate-400">Seattle Desi TV community media platform.</div>
      </footer>
    </>
  );
}
