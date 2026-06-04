export default function HomeCard({ title, href, description }: { title: string; href: string; description: string }) {
  return (
    <a href={href} className="block bg-white border rounded-3xl p-6 shadow-sm hover:shadow-xl transition">
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      <p className="text-gray-600 mt-2 text-sm">{description}</p>
      <span className="inline-block mt-5 text-pink-600 font-black">Open</span>
    </a>
  );
}
