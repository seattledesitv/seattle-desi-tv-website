type Props = { status: "included" | "excluded" | "featured" | "edited" };

const styles = {
  included: "bg-emerald-100 text-emerald-700",
  excluded: "bg-slate-200 text-slate-600",
  featured: "bg-amber-100 text-amber-800",
  edited: "bg-blue-100 text-blue-700",
};

export default function ItemStatusBadge({ status }: Props) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${styles[status]}`}>
    {status[0].toUpperCase() + status.slice(1)}
  </span>;
}
