import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";

export default function PortalPage() {
  const links = [
    ["My Hub Dashboard", "/my-hub", "Your SDTV workspace home."],
    ["My Assignments", "/my-assignments", "Confirm and complete event coverage work."],
    ["My Availability", "/my-availability", "Share when you can support coverage."],
    ["Notifications", "/notifications", "View SDTV alerts and updates."],
    ["Events", "/events", "Browse public events."],
    ["Businesses", "/businesses", "Browse the local business directory."],
    ["Radio", "/radio", "Listen to Seattle Desi Radio."],
    ["Studio", "/studio", "Admin workspace."],
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p>
        <h1 className="text-4xl md:text-6xl font-black mt-3">Seattle Desi TV Portal</h1>
        <p className="text-slate-300 mt-3 max-w-3xl mb-8">A simple navigation bridge for public pages, team tools, account access, and Studio operations.</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {links.map(([label, href, note]) => (
            <a key={href} href={href} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border hover:scale-[1.01] transition block">
              <h2 className="text-xl font-black">{label}</h2>
              <p className="text-gray-600 mt-2 text-sm">{note}</p>
            </a>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
