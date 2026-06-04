export default function SiteHeader() {
  const links = [
    ["Home", "/"],
    ["Events", "/events"],
    ["Businesses", "/businesses"],
    ["Team", "/team"],
    ["Portal", "/portal"],
  ];

  return (
    <>
      <div className="bg-[#050b18] text-white text-sm px-6 md:px-10 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 flex-wrap">
          <a href="https://www.youtube.com/@SeattleDesiTV" target="_blank" rel="noreferrer" className="hover:text-pink-300">YouTube</a>
          <a href="https://instagram.com/seattledesitv" target="_blank" rel="noreferrer" className="hover:text-pink-300">Instagram</a>
          <a href="mailto:info@seattledesitv.com" className="hover:text-pink-300">info@seattledesitv.com</a>
        </div>
        <span className="font-bold text-yellow-300">Seattle Desi TV + Radio</span>
      </div>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-6 md:px-10 py-4 text-slate-950">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 font-black text-xl">
            <img src="/sdtv-logo.png" alt="Seattle Desi TV" className="h-14 w-auto" />
            <span>Seattle Desi TV</span>
          </a>
          <nav className="hidden lg:flex items-center gap-3 font-bold text-sm">
            {links.map(([label, href]) => <a key={href} href={href} className="hover:text-pink-600">{label}</a>)}
            <a href="/my-assignments" className="hover:text-pink-600">My Assignments</a>
            <a href="/studio" className="hover:text-pink-600">Studio</a>
            <a href="/login" className="bg-pink-600 text-white px-4 py-2 rounded-xl">Login</a>
          </nav>
          <a href="/portal" className="lg:hidden bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">Menu</a>
        </div>
      </header>
    </>
  );
}
