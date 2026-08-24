/* eslint-disable @next/next/no-img-element -- user-uploaded public media can use multiple configured hosts */
import Link from "next/link";
import type { PressRelease } from "../../lib/pressReleases/types";
import { seoEntityPath } from "../../lib/seo/urls";

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export default function PressReleaseCard({ release }: { release: PressRelease }) {
  const detailsPath = seoEntityPath("press-releases", release.title, release.id);
  const image = release.image_urls[0];
  const mode = release.image_display_mode || "cover";
  const imageClass = mode === "cover" ? "h-full w-full object-cover transition duration-300 group-hover:scale-105" : "relative z-10 h-full w-full object-contain p-4";
  const imageStyle = mode === "cover" ? { objectPosition: `${release.image_position_x ?? 50}% ${release.image_position_y ?? 50}%`, transform: `scale(${release.image_zoom ?? 1})`, transformOrigin: `${release.image_position_x ?? 50}% ${release.image_position_y ?? 50}%` } : undefined;
  return <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-xl">
    <Link href={detailsPath} className="relative block aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-950 to-pink-900">
      {image ? <>{mode === "blur" && <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-xl" />}<img src={image} alt="" className={imageClass} style={imageStyle} /></> : <div className="flex h-full items-center justify-center px-6 text-center text-2xl font-black text-white">Seattle Desi TV<br/>Press Release</div>}
    </Link>
    <div className="p-6">
      <p className="text-xs font-black uppercase tracking-widest text-pink-600">{date(release.release_date)}{release.location ? ` · ${release.location}` : ""}</p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950"><Link href={detailsPath}>{release.title}</Link></h2>
      {release.organization_name && <p className="mt-2 font-bold text-slate-500">{release.organization_name}</p>}
      <p className="mt-3 line-clamp-3 leading-7 text-slate-600">{release.summary}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link href={detailsPath} className="inline-flex font-black text-pink-600">Read press release →</Link>
        {release.instagram_permalink && <a href={release.instagram_permalink} target="_blank" rel="noreferrer" className="inline-flex font-black text-fuchsia-700">View on Instagram ↗</a>}
      </div>
    </div>
  </article>;
}
