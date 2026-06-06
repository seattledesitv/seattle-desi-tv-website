"use client";

export default function LatestYouTubeVideos() {
  return (
    <section id="videos" className="max-w-7xl mx-auto px-6 md:px-10 py-10">
      <div className="bg-slate-950 text-white rounded-3xl p-8 md:p-10">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">Watch SDTV</p>
            <h2 className="text-3xl md:text-4xl font-black">Top Videos</h2>
            <p className="text-slate-300 mt-1">Latest Seattle Desi TV videos.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
