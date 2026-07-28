"use client";

export type NewsletterItem = {
  title: string;
  text?: string;
  image?: string;
  url?: string;
  meta?: string;
  badge?: string;
  cta?: string;
  imageFit?: "cover" | "contain";
};

export type NewsletterSection = {
  id: string;
  key?: string;
  title: string;
  body?: string;
  items: NewsletterItem[];
};

export default function NewsletterPreview({ draft }: { draft: any }) {
  if (!draft) return null;

  function printNewsletter() {
    const preview = document.getElementById("sdtv-newsletter-preview");
    if (!preview) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${draft.subject || "Seattle Desi TV Newsletter"}</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
      *{box-sizing:border-box}body{margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a}.sheet{max-width:900px;margin:0 auto;background:white}.header{background:#050b18;color:white;padding:42px 34px;text-align:center}.logo{height:64px;width:auto;margin:0 auto 16px}.brand{font-size:12px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#f9a8d4}.header h1{font-size:36px;line-height:1.1;margin:12px 0}.header p{color:#cbd5e1;margin:0 auto;max-width:680px;line-height:1.6}.content{padding:28px}.section{border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;margin-bottom:24px;break-inside:avoid}.section-title{background:linear-gradient(90deg,#020617,#831843);color:white;padding:16px 20px;font-size:24px;font-weight:900}.section-body{padding:20px;color:#475569;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:0 20px 20px}.card{border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;background:#f8fafc;break-inside:avoid}.card img{display:block;width:100%;height:190px;object-fit:cover;background:white}.card img.contain{object-fit:contain;padding:12px}.card-copy{padding:16px}.meta{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#db2777}.card h3{font-size:19px;margin:6px 0}.card p{font-size:14px;line-height:1.55;color:#64748b}.badge{display:inline-block;background:#fbbf24;color:#451a03;border-radius:999px;padding:5px 10px;font-size:10px;font-weight:900;text-transform:uppercase}.cta{display:inline-block;margin-top:10px;background:#db2777;color:white;text-decoration:none;border-radius:10px;padding:9px 13px;font-size:13px;font-weight:900}.footer{padding:22px;text-align:center;background:#f1f5f9;color:#64748b;font-size:13px}@page{size:A4;margin:10mm}@media print{body{background:white}.sheet{max-width:none}.section{break-inside:avoid}.card{break-inside:avoid}}@media(max-width:650px){.grid{grid-template-columns:1fr}.header h1{font-size:28px}}
    </style></head><body><div class="sheet">${preview.innerHTML}</div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    popup.document.close();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={printNewsletter} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950 shadow-lg hover:bg-amber-200">Print / Save as PDF</button>
      </div>
      <div id="sdtv-newsletter-preview" className="sheet overflow-hidden rounded-[2rem] bg-white text-slate-950 shadow-2xl">
        <div className="header bg-[#050b18] px-8 py-10 text-center text-white">
          <img src="/sdtv-logo.png" alt="Seattle Desi TV" className="logo mx-auto mb-4 h-16 w-auto" />
          <p className="brand text-sm font-black uppercase tracking-[0.2em] text-pink-300">Seattle Desi TV</p>
          <h1 className="mt-3 text-4xl font-black">{draft.subject}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">{draft.preheader}</p>
        </div>
        <div className="content grid gap-8 p-6 md:p-8">
          {draft.sections.map((section: NewsletterSection) => (
            <section key={section.id} className="section overflow-hidden rounded-[1.5rem] border border-slate-200">
              <div className="section-title bg-gradient-to-r from-slate-950 to-pink-900 px-5 py-4 text-white"><h2 className="text-2xl font-black">{section.title}</h2></div>
              {section.body && <p className="section-body mb-4 p-5 leading-7 text-slate-700">{section.body}</p>}
              <div className="grid grid-cols-1 gap-4 p-5 pt-0 md:grid-cols-2">
                {section.items.map((item, index) => (
                  <article key={index} className="card group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="p-4">
                      {item.badge && <span className="badge rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-950">{item.badge}</span>}
                    </div>
                    {item.image && <img src={item.image} alt={item.title} className={`${item.imageFit === "contain" ? "contain object-contain p-3" : "object-cover"} h-44 w-full bg-white`} />}
                    <div className="card-copy p-4">
                      {item.meta && <p className="meta text-xs font-black uppercase tracking-wide text-pink-600">{item.meta}</p>}
                      <h3 className="mt-1 text-lg font-black">{item.title}</h3>
                      {item.text && <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>}
                      {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="cta mt-4 inline-flex rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white">{item.cta || "View more"}</a>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="footer bg-slate-100 p-6 text-center text-sm text-slate-600">Seattle Desi TV · Community media, events, businesses, organizations, and culture.</div>
      </div>
    </div>
  );
}
