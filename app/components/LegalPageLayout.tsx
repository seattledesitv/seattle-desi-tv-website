import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export default function LegalPageLayout({
  eyebrow,
  title,
  summary,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />
      <section className="bg-[#050b18] px-6 py-14 text-white md:px-10 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-pink-300">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">{summary}</p>
          <p className="mt-5 text-sm font-bold text-slate-400">Last updated: {updated}</p>
        </div>
      </section>

      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-5xl space-y-6">
          {sections.map((section) => (
            <article key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-black text-slate-950">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-7 text-slate-700">{paragraph}</p>
              ))}
              {section.bullets && (
                <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-slate-700">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              )}
            </article>
          ))}

          <div className="rounded-3xl border border-pink-200 bg-pink-50 p-6 md:p-8">
            <h2 className="text-2xl font-black">Questions or notices</h2>
            <p className="mt-3 leading-7 text-slate-700">
              Contact Seattle Desi TV at <a className="font-black text-pink-700 underline" href="mailto:abharathkumar@gmail.com">abharathkumar@gmail.com</a>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
