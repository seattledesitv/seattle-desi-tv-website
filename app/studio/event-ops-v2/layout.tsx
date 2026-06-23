import "./event-ops-v2.css";
import EventOpsAgingPanel from "./EventOpsAgingPanel";

export default function EventOpsV2Layout({ children }: { children: React.ReactNode }) {
  return <div className="event-ops-v2-skin">{children}<section className="mx-auto max-w-7xl px-4 pb-8 md:px-6"><div className="ml-auto max-w-[720px]"><EventOpsAgingPanel /></div></section></div>;
}
