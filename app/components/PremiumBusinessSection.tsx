import SafeImage from "./SafeImage";

type BusinessRow = {
  id: string;
  name: string;
  category?: string | null;
  offer?: string | null;
  discount?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
};

function firstImage(row: BusinessRow) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || "";
}

function BusinessShowcaseCard({ business }: { business: BusinessRow }) {
  const image = firstImage(business);
  return (
    <a href="/businesses" className="group min-w-[180px] max-w-[180px] rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-lg transition hover:-translate-y-1 hover:shadow-2xl sm:min-w-[190px] sm:max-w-[190px] md:min-w-[210px] md:max-w-[210px]">
      <div className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-pink-100 bg-slate-50 shadow-inner">
        <SafeImage src={image} alt={business.name} className="h-full w-full object-cover" fallbackClassName="h-full w-full rounded-full bg-pink-50 text-pink-600 grid place-items-center font-black text-xs" fallbackLabel="SDTV" />
      </div>
      <h3 className="mt-3 line-clamp-1 text-sm font-black text-slate-950">{business.name}</h3>
      <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-500">{business.category || business.offer || "Local business"}</p>
      {(business.discount || business.category) && <span className="mt-3 inline-flex rounded-full bg-pink-50 px-3 py-1 text-[10px] font-black uppercase text-pink-600">{business.discount || business.category}</span>}
    </a>
  );
}

function Impact({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center shadow-lg shadow-black/20">
      <p className="text-xl font-black text-white md:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/55">{label}</p>
    </div>
  );
}

export default function PremiumBusinessSection({ businesses }: { businesses: BusinessRow[] }) {
  return (
    <section key="businesses" className="bg-[#050b18] px-4 py-12 md:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#080201] px-5 py-8 text-white shadow-2xl md:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,210,100,.20),transparent_20rem),radial-gradient(circle_at_88%_20%,rgba(236,72,153,.16),transparent_18rem),linear-gradient(100deg,#070201,#210715,#070201)]" />
        <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle,rgba(255,210,100,.50)_1px,transparent_2px)] [background-size:34px_34px]" />
        <div className="absolute left-[-10%] right-[-10%] top-0 h-20 rotate-[2deg] rounded-full bg-gradient-to-r from-transparent via-[#f5af23]/40 to-transparent blur-sm" />
        <div className="absolute left-[-10%] right-[-10%] bottom-14 h-20 rotate-[-2deg] rounded-full bg-gradient-to-r from-transparent via-[#f5af23]/35 to-transparent blur-sm" />

        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffe099]">SDTV Businesses ✦</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Discover Local Businesses</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">A premium showcase for trusted community businesses, sponsors, and marketplace partners.</p>
          </div>
          <a href="/businesses" className="hidden rounded-full bg-pink-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-pink-600/30 md:inline-flex">View All Businesses →</a>
        </div>

        <div className="relative z-10 mt-8 flex max-w-full gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {businesses.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/10 p-8 text-white/60">No approved businesses yet.</div> : businesses.map((business) => <BusinessShowcaseCard key={business.id} business={business} />)}
        </div>

        <div className="relative z-10 mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Impact value="500+" label="Community Reach" />
          <Impact value="150+" label="Businesses" />
          <Impact value="80+" label="Partners" />
          <Impact value="1M+" label="Total Reach" />
        </div>
      </div>
    </section>
  );
}
