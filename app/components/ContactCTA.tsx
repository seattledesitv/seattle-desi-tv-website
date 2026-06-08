const ctas = [
  ["Volunteer", "Help with SDTV events, production, community outreach, and operations.", "/contact?interest=Volunteer"],
  ["Become an RJ", "Host or support Seattle Desi Radio shows and community segments.", "/contact?interest=RJ%20%2F%20Radio%20Host"],
  ["Become a VJ", "Anchor interviews, reels, event coverage, and community stories.", "/contact?interest=VJ%20%2F%20Anchor"],
  ["Request Coverage", "Invite SDTV to cover your cultural, community, nonprofit, or business event.", "/contact?interest=Event%20Coverage"],
  ["Sponsor SDTV", "Promote your brand across SDTV web, video, radio, and community channels.", "/contact?interest=Sponsorship"],
  ["Contact Us", "Have a question, story idea, or partnership opportunity? Reach out.", "/contact"],
];

export default function ContactCTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-12">
      <div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">Get Involved</p>
            <h2 className="text-3xl md:text-5xl font-black mt-2">Have an event, business, story, or idea?</h2>
            <p className="text-slate-300 mt-3 max-w-3xl">Seattle Desi TV would love to hear from you. Choose the right path and we will take you to the contact page.</p>
          </div>
          <a href="/contact" className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black text-center">Contact Us</a>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ctas.map(([title, note, href]) => (
            <a key={title} href={href} className="bg-white/10 border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition block">
              <h3 className="text-xl font-black">{title}</h3>
              <p className="text-slate-300 text-sm mt-2">{note}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
