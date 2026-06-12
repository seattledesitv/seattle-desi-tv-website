export type TestimonialItem = {
  id: string;
  name: string;
  title?: string | null;
  quote: string;
  image_url?: string | null;
  display_order?: number | null;
};

export default function TestimonialsSection({ items, title, subtitle }: { items: TestimonialItem[]; title: string; subtitle?: string }) {
  if (!items.length) return null;

  return (
    <section key="testimonials" id="testimonials" className="bg-[#fbf1ec] px-6 py-12 text-slate-950 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">{title}</h2>
          {subtitle && <p className="mx-auto mt-3 max-w-3xl text-slate-600">{subtitle}</p>}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <article key={item.id} className="rounded-sm bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mx-auto mb-5 grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-slate-100">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : <span className="text-3xl font-black text-pink-600">{item.name.charAt(0)}</span>}
              </div>
              <div className="text-4xl font-black leading-none text-red-500">“</div>
              <h3 className="mt-1 font-medium text-blue-600">{item.name}</h3>
              {item.title && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.title}</p>}
              <p className="mt-5 text-sm leading-7 text-slate-800">{item.quote}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
