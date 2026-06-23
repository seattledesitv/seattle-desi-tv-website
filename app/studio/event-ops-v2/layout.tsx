import "./event-ops-v2.css";
import EventOpsAgingPanel from "./EventOpsAgingPanel";

export default function EventOpsV2Layout({ children }: { children: React.ReactNode }) {
  return <div className="event-ops-v2-skin">{children}<EventOpsAgingPanel /></div>;
}
