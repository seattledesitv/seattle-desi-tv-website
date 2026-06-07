import StudioHeader from "./StudioHeader";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        {children}
      </div>
    </main>
  );
}
