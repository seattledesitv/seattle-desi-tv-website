"use client";

export type NewsletterItem = {
  title: string;
  text?: string;
  image?: string;
  url?: string;
  meta?: string;
};

export type NewsletterSection = {
  id: string;
  title: string;
  body?: string;
  items: NewsletterItem[];
};

export default function NewsletterPreview({ draft }: { draft: any }) {
  if (!draft) return null;
  return (
    <div className="overflow-hidden rounded-[2rem] bg-white text-slate-950 shadow-2xl">
      <div className="bg-[#050b18] px-8 py-10 text-center text-white">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-300">Seattle Desi TV</p>
        <h2 className="mt-3 text-4xl font-black">{draft.subject}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-300">{draft.preheader}</p>
      </div>
      <div className="grid gap-8 p-6 md:p-8">
        {draft.sections.map((section: NewsletterSection) => <section key={section.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200">
          <div className="bg-gradient-to-r from-slate-950 to-pink-900 px-5 py-4 text-white"><h3 className="text-2xl font-black">{section.title}</h3></div>
          <div className="p-5">
            {section.body && <p className="mb-4 leading-7 text-slate-700">{section.body}</p>}
            <div className="grid gap-4 md:grid-cols-2">
              {section.items.map((item, index) => <a key={index} href={item.url || "#"} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:bg-pink-50">
                {item.image && <img src={item.image} alt={item.title} className="h-40 w-full object-cover" />}
                <div className="p-4">
                  {item.meta && <p className="text-xs font-black uppercase tracking-wide text-pink-600">{item.meta}</p>}
                  <h4 className="mt-1 text-lg font-black">{item.title}</h4>
                  {item.text && <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>}
                </div>
              </a>)}
            </div>
          </div>
        </section>)}
      </div>
      <div className="bg-slate-100 p-6 text-center text-sm text-slate-600">Seattle Desi TV community media platform.</div>
    </div>
  );
}
