import "./event-ops-v2.css";
import EventOpsAgingPanel from "./EventOpsAgingPanel";
import SiteFooter from "../../components/SiteFooter";

export default function EventOpsV2Layout({ children }: { children: React.ReactNode }) {
  return <div className="event-ops-v2-skin"><div className="event-ops-v2-page-shell">{children}<EventOpsAgingPanel /></div><SiteFooter /></div>;
}
