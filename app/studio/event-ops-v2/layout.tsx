import "./event-ops-v2.css";
import EventOpsAgingPanel from "./EventOpsAgingPanel";
import EventOpsHealthStatus from "./EventOpsHealthStatus";
import SiteFooter from "../../components/SiteFooter";

export default function EventOpsV2Layout({ children }: { children: React.ReactNode }) {
  return <div className="event-ops-v2-skin"><div className="event-ops-v2-page-shell">{children}<EventOpsHealthStatus /><EventOpsAgingPanel /></div><SiteFooter /></div>;
}
