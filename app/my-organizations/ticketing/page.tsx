"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../../components/MyHubHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";
import SwirepayContactOnboarding from "../../components/ticketing/SwirepayContactOnboarding";

const supabase = getSupabaseBrowserClient();
const emptyType = {
  name: "General Admission",
  description: "",
  price: "",
  quantity: "100",
  min: "1",
  max: "10",
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(cents || 0) / 100);
}
function when(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function OrganizationTicketingPage() {
  const site = useCurrentSite();
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [eventId, setEventId] = useState("");
  const [message, setMessage] = useState("Loading ticketing workspace...");
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    salesStart: "",
    salesEnd: "",
    capacity: "",
    maxPerOrder: "10",
    refundPolicy: "",
    terms: "",
    emailSubject: "",
    emailMessage: "",
    emailFooter: "",
    replyTo: "",
    testMode: false,
    testEmails: "",
  });
  const [ticketType, setTicketType] = useState(emptyType);

  async function load() {
    const auth = await supabase.auth.getUser();
    const currentUser = auth.data.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setMessage("Please sign in to configure organization ticket sales.");
      return;
    }
    const managers = await forSite(
      supabase
        .from("organization_managers")
        .select(
          "organization_id,role,community_organizations(id,name,status,image,contact_email)",
        )
        .eq("user_id", currentUser.id)
        .eq("active", true),
      site.id,
    );
    if (managers.error) {
      setMessage(managers.error.message);
      return;
    }
    const orgs = (managers.data || [])
      .map((row: any) => ({
        ...row.community_organizations,
        manager_role: row.role,
      }))
      .filter((row: any) => row?.id);
    setOrganizations(orgs);
    const ids = orgs.map((row: any) => row.id);
    setOrganizationId((current) =>
      ids.includes(current) ? current : ids[0] || "",
    );
    if (!ids.length) {
      setMessage(
        "No verified organization-management access was found for your account.",
      );
      return;
    }
    const [links, accountRows, settingRows, orderRows, settlementRows] =
      await Promise.all([
        forSite(
          supabase
            .from("event_organizations")
            .select(
              "organization_id,relationship,events(id,title,date,local_start_time,local_end_time,event_timezone,location,image,image_urls,status,approved)",
            )
            .in("organization_id", ids),
          site.id,
        ),
        forSite(
          supabase
            .from("organization_payment_accounts")
            .select("*")
            .in("organization_id", ids),
          site.id,
        ),
        forSite(
          supabase
            .from("event_ticket_settings")
            .select("*")
            .in("organization_id", ids),
          site.id,
        ),
        forSite(
          supabase
            .from("ticket_orders")
            .select(
              "id,event_id,organization_id,buyer_name,buyer_email,buyer_phone,status,currency,subtotal_cents,fee_cents,total_cents,paid_at,refunded_at,created_at,ticket_order_items(ticket_name,unit_price_cents,quantity,line_total_cents)",
            )
            .in("organization_id", ids)
            .order("created_at", { ascending: false }),
          site.id,
        ),
        forSite(
          supabase
            .from("ticket_settlements")
            .select("*")
            .in("organization_id", ids)
            .order("created_at", { ascending: false }),
          site.id,
        ),
      ]);
    if (
      links.error ||
      accountRows.error ||
      settingRows.error ||
      orderRows.error ||
      settlementRows.error
    ) {
      setMessage(
        links.error?.message ||
          accountRows.error?.message ||
          settingRows.error?.message ||
          orderRows.error?.message ||
          settlementRows.error?.message ||
          "Ticketing tables are not ready. Run the ticketing SQL migration first.",
      );
      return;
    }
    const eventRows = (links.data || [])
      .map((row: any) => ({
        ...row.events,
        organization_id: row.organization_id,
        relationship: row.relationship,
      }))
      .filter(
        (row: any) => row?.id && (row.approved || row.status === "approved"),
      );
    setEvents(eventRows);
    setEventId((current) =>
      eventRows.some((row: any) => row.id === current)
        ? current
        : eventRows[0]?.id || "",
    );
    setAccounts(accountRows.data || []);
    setSettings(settingRows.data || []);
    setOrders(orderRows.data || []);
    setSettlements(settlementRows.data || []);
    const settingIds = (settingRows.data || []).map((row: any) => row.id);
    if (settingIds.length) {
      const typeRows = await forSite(
        supabase
          .from("event_ticket_types")
          .select("*")
          .in("ticket_setting_id", settingIds)
          .order("display_order"),
        site.id,
      );
      if (!typeRows.error) setTypes(typeRows.data || []);
    }
    setMessage(
      "Configure ticket inventory now. Swirepay organizer onboarding will connect here when its routing fields are confirmed.",
    );
  }

  useEffect(() => {
    void load();
  }, [site.id]);
  const selectedOrganization =
    organizations.find((row) => row.id === organizationId) || null;
  const visibleEvents = useMemo(
    () => events.filter((row) => row.organization_id === organizationId),
    [events, organizationId],
  );
  const selectedEvent =
    visibleEvents.find((row) => row.id === eventId) || visibleEvents[0] || null;
  const selectedSetting =
    settings.find((row) => row.event_id === selectedEvent?.id) || null;
  const selectedAccount =
    accounts.find((row) => row.organization_id === organizationId) || null;
  const selectedTypes = types.filter(
    (row) => row.ticket_setting_id === selectedSetting?.id,
  );
  const eventFlyer = selectedEvent
    ? [
        ...(Array.isArray(selectedEvent.image_urls)
          ? selectedEvent.image_urls
          : []),
        selectedEvent.image,
      ].find(Boolean) || ""
    : "";
  const activePrices = selectedTypes
    .filter((row) => row.status === "active")
    .map((row) => Number(row.price_cents || 0));
  const priceSummary = activePrices.length
    ? `${money(Math.min(...activePrices))}${new Set(activePrices).size > 1 ? " and up" : ""}`
    : "Add ticket price below";
  const sampleSubject = (
    config.emailSubject || "Your tickets for {{event_name}}"
  )
    .replaceAll("{{event_name}}", selectedEvent?.title || "Event")
    .replaceAll(
      "{{organization_name}}",
      selectedOrganization?.name || "Organizer",
    )
    .replaceAll("{{order_number}}", "SDTV-12345");
  const eventOrders = orders.filter(
    (row) => row.event_id === selectedEvent?.id,
  );
  const paidOrders = eventOrders.filter((row) =>
    ["paid", "partially_refunded", "refunded"].includes(row.status),
  );
  const ticketsSold = paidOrders.reduce(
    (sum, row) =>
      sum +
      (row.ticket_order_items || []).reduce(
        (lineSum: number, item: any) => lineSum + Number(item.quantity || 0),
        0,
      ),
    0,
  );
  const grossSales = paidOrders.reduce(
    (sum, row) => sum + Number(row.subtotal_cents || 0),
    0,
  );
  const eventSettlements = settlements.filter(
    (row) => row.event_id === selectedEvent?.id,
  );
  const paidOut = eventSettlements
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + Number(row.net_payout_cents || 0), 0);

  useEffect(() => {
    if (!selectedEvent && visibleEvents[0]) setEventId(visibleEvents[0].id);
  }, [organizationId, visibleEvents.length]);
  useEffect(() => {
    if (!selectedSetting) {
      setConfig({
        salesStart: "",
        salesEnd: "",
        capacity: "",
        maxPerOrder: "10",
        refundPolicy: "",
        terms: "",
        emailSubject: "",
        emailMessage: "",
        emailFooter: "",
        replyTo: selectedOrganization?.contact_email || "",
        testMode: false,
        testEmails: [user?.email, "seattledesitv@gmail.com"]
          .filter(Boolean)
          .join(", "),
      });
      return;
    }
    setConfig({
      salesStart: selectedSetting.sales_start_at?.slice(0, 16) || "",
      salesEnd: selectedSetting.sales_end_at?.slice(0, 16) || "",
      capacity: selectedSetting.venue_capacity
        ? String(selectedSetting.venue_capacity)
        : "",
      maxPerOrder: String(selectedSetting.max_tickets_per_order || 10),
      refundPolicy: selectedSetting.refund_policy || "",
      terms: selectedSetting.terms || "",
      emailSubject: selectedSetting.confirmation_email_subject || "",
      emailMessage: selectedSetting.confirmation_email_message || "",
      emailFooter: selectedSetting.confirmation_email_footer || "",
      replyTo:
        selectedSetting.confirmation_reply_to ||
        selectedOrganization?.contact_email ||
        "",
      testMode: Boolean(selectedSetting.test_mode),
      testEmails: (selectedSetting.test_access_emails || []).join(", "),
    });
  }, [selectedSetting?.id, selectedOrganization?.id, user?.email]);

  async function saveConfiguration(submit = false) {
    if (!user || !selectedOrganization || !selectedEvent) return;
    setSaving(true);
    setMessage("");
    const payload = {
      site_id: site.id,
      event_id: selectedEvent.id,
      organization_id: selectedOrganization.id,
      status: submit
        ? "pending_review"
        : selectedSetting?.status === "active"
          ? "paused"
          : "draft",
      currency: "USD",
      sales_start_at: config.salesStart
        ? new Date(config.salesStart).toISOString()
        : null,
      sales_end_at: config.salesEnd
        ? new Date(config.salesEnd).toISOString()
        : null,
      venue_capacity: config.capacity ? Number(config.capacity) : null,
      max_tickets_per_order: Number(config.maxPerOrder || 10),
      refund_policy: config.refundPolicy.trim() || null,
      terms: config.terms.trim() || null,
      confirmation_email_subject: config.emailSubject.trim() || null,
      confirmation_email_message: config.emailMessage.trim() || null,
      confirmation_email_footer: config.emailFooter.trim() || null,
      confirmation_reply_to: config.replyTo.trim().toLowerCase() || null,
      test_mode: config.testMode,
      test_access_emails: config.testMode
        ? Array.from(
            new Set(
              config.testEmails
                .split(/[;,\n]/)
                .map((value) => value.trim().toLowerCase())
                .filter((value) => value.includes("@")),
            ),
          )
        : [],
      created_by: selectedSetting?.created_by || user.id,
      updated_at: new Date().toISOString(),
    };
    const result = await supabase
      .from("event_ticket_settings")
      .upsert(payload, { onConflict: "site_id,event_id" });
    setSaving(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(
      submit
        ? "Ticket sales configuration submitted for Studio review."
        : "Draft ticket configuration saved.",
    );
    await load();
  }

  async function addTicketType() {
    if (!selectedSetting) {
      setMessage(
        "Save the event ticket configuration before adding ticket types.",
      );
      return;
    }
    const price = Math.round(Number(ticketType.price || 0) * 100),
      quantity = Number(ticketType.quantity),
      min = Number(ticketType.min),
      max = Number(ticketType.max);
    if (
      !ticketType.name.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      min < 1 ||
      max < min
    ) {
      setMessage(
        "Enter a valid name, price, inventory quantity, and order limits.",
      );
      return;
    }
    setSaving(true);
    const result = await supabase.from("event_ticket_types").insert({
      site_id: site.id,
      ticket_setting_id: selectedSetting.id,
      event_id: selectedSetting.event_id,
      name: ticketType.name.trim(),
      description: ticketType.description.trim() || null,
      price_cents: price,
      quantity_total: quantity,
      min_per_order: min,
      max_per_order: max,
      display_order: selectedTypes.length,
    });
    setSaving(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setTicketType(emptyType);
    setMessage("Ticket type added.");
    await load();
  }

  async function toggleType(row: any) {
    const status = row.status === "active" ? "hidden" : "active";
    const result = await forSite(
      supabase
        .from("event_ticket_types")
        .update({ status, updated_at: new Date().toISOString() }),
      site.id,
    ).eq("id", row.id);
    if (result.error) setMessage(result.error.message);
    else await load();
  }
  async function removeType(row: any) {
    if (row.quantity_sold > 0 || !window.confirm(`Delete ${row.name}?`)) return;
    const result = await forSite(
      supabase.from("event_ticket_types").delete(),
      site.id,
    ).eq("id", row.id);
    if (result.error) setMessage(result.error.message);
    else await load();
  }
  function downloadSalesCsv() {
    if (!selectedEvent) return;
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [
      [
        "Order",
        "Purchased",
        "Purchaser",
        "Email",
        "Phone",
        "Tickets",
        "Subtotal",
        "Fees",
        "Total",
        "Status",
      ],
      ...eventOrders.map((row) => [
        row.id,
        row.paid_at || row.created_at,
        row.buyer_name,
        row.buyer_email,
        row.buyer_phone || "",
        (row.ticket_order_items || [])
          .map((item: any) => `${item.ticket_name} x${item.quantity}`)
          .join("; "),
        (Number(row.subtotal_cents || 0) / 100).toFixed(2),
        (Number(row.fee_cents || 0) / 100).toFixed(2),
        (Number(row.total_cents || 0) / 100).toFixed(2),
        row.status,
      ]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([lines], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${String(selectedEvent.title)
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()}-ticket-sales.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-black uppercase tracking-wide text-pink-300">
              Organization tools
            </p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">
              Event Ticketing
            </h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Set up inventory and submit ticket sales for approval. Payment
              activation remains controlled by SDTV and Swirepay verification.
            </p>
          </div>
          <a
            href="/my-organizations"
            className="rounded-xl bg-white px-5 py-3 text-center font-black text-slate-950"
          >
            Back to My Organizations
          </a>
        </div>
        {message && (
          <div className="mt-6 rounded-2xl bg-amber-100 p-4 font-bold text-amber-950">
            {message}
          </div>
        )}
        {!user ? (
          <a
            href="/login?next=/my-organizations/ticketing"
            className="mt-6 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black"
          >
            Sign in
          </a>
        ) : (
          organizations.length > 0 && (
            <div className="mt-8 grid gap-6 xl:grid-cols-[340px_1fr]">
              <aside className="h-fit rounded-3xl bg-white p-5 text-slate-950">
                <label className="text-sm font-black">
                  Organization
                  <select
                    className="mt-2 w-full rounded-xl border p-3"
                    value={organizationId}
                    onChange={(event) => {
                      setOrganizationId(event.target.value);
                      setEventId("");
                    }}
                  >
                    <option value="">Select</option>
                    {organizations.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Swirepay payout registration
                  </p>
                  <p className="mt-2 text-xl font-black capitalize">
                    {String(
                      selectedAccount?.onboarding_status || "not started",
                    ).replaceAll("_", " ")}
                  </p>
                  <div className="mt-3 flex gap-2 text-xs font-black">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">
                      Payments collected by SDTV
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 ${selectedAccount?.payouts_enabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                    >
                      Organizer payouts{" "}
                      {selectedAccount?.payouts_enabled ? "ready" : "pending"}
                    </span>
                  </div>
                  {selectedOrganization && (
                    <SwirepayContactOnboarding
                      organizationId={selectedOrganization.id}
                      organizationName={selectedOrganization.name}
                      email={selectedOrganization.contact_email || user?.email}
                      existingContactGid={selectedAccount?.onboarding_reference}
                      onComplete={load}
                    />
                  )}
                </div>
                <div className="mt-5 grid gap-2">
                  {visibleEvents.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => setEventId(row.id)}
                      className={`rounded-xl border p-3 text-left ${selectedEvent?.id === row.id ? "border-pink-500 bg-pink-50" : "bg-white"}`}
                    >
                      <p className="font-black">{row.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.date} · {row.relationship}
                      </p>
                    </button>
                  ))}
                  {visibleEvents.length === 0 && (
                    <p className="rounded-xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                      No approved linked events found.
                    </p>
                  )}
                </div>
              </aside>
              <section className="rounded-[2rem] bg-white p-6 text-slate-950">
                {!selectedEvent ? (
                  <p className="font-bold text-slate-500">
                    Choose an organization with an approved linked event.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase text-pink-600">
                          Ticket configuration
                        </p>
                        <h2 className="mt-1 text-3xl font-black">
                          {selectedEvent.title}
                        </h2>
                        <p className="mt-2 text-slate-500">
                          {selectedEvent.date} · {selectedEvent.location}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href="#sales-report"
                          className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white"
                        >
                          View Sales Report
                        </a>
                        <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black capitalize">
                          {String(
                            selectedSetting?.status || "not configured",
                          ).replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 grid overflow-hidden rounded-3xl border bg-slate-950 text-white md:grid-cols-[220px_1fr]">
                      <div className="min-h-52 bg-slate-800">
                        {eventFlyer ? (
                          <img
                            src={eventFlyer}
                            alt={`${selectedEvent.title} flyer`}
                            className="h-full min-h-52 w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full min-h-52 place-items-center p-5 text-center font-black text-slate-400">
                            Event flyer not uploaded
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-4">
                          {selectedOrganization?.image ? (
                            <img
                              src={selectedOrganization.image}
                              alt={`${selectedOrganization.name} logo`}
                              className="h-16 w-16 rounded-2xl bg-white object-contain p-2"
                            />
                          ) : (
                            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-xl font-black">
                              {String(selectedOrganization?.name || "OR")
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((part: string) => part[0])
                                .join("")}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-black uppercase text-pink-300">
                              Presented by
                            </p>
                            <p className="text-xl font-black">
                              {selectedOrganization?.name}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs font-black uppercase text-slate-400">
                              Ticket price
                            </p>
                            <p className="mt-1 text-lg font-black">
                              {priceSummary}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-slate-400">
                              Event location
                            </p>
                            <p className="mt-1 font-black">
                              {selectedEvent.location || "Location pending"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-slate-400">
                              Event date
                            </p>
                            <p className="mt-1 font-black">
                              {selectedEvent.date || "Date pending"}
                            </p>
                          </div>
                        </div>
                        <p className="mt-5 text-xs text-slate-400">
                          Flyer, location and organizer branding come from the
                          approved event and organization profiles. Update those
                          source profiles to change them everywhere.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
                      <label className="flex items-start gap-3 font-black">
                        <input
                          type="checkbox"
                          checked={config.testMode}
                          onChange={(event) =>
                            setConfig({
                              ...config,
                              testMode: event.target.checked,
                            })
                          }
                          className="mt-1 h-5 w-5 accent-pink-600"
                        />
                        <span>
                          Private ticket testing mode
                          <span className="mt-1 block text-sm font-normal text-slate-600">
                            Hide this entire event from everyone except
                            organization managers, SDTV admins, and the testers
                            listed below.
                          </span>
                        </span>
                      </label>
                      {config.testMode && (
                        <label className="mt-4 block font-black">
                          Allowed tester emails
                          <textarea
                            value={config.testEmails}
                            onChange={(event) =>
                              setConfig({
                                ...config,
                                testEmails: event.target.value,
                              })
                            }
                            placeholder="buyer@example.com, seattledesitv@gmail.com"
                            className="mt-1 min-h-20 w-full rounded-xl border bg-white p-3 font-normal"
                          />
                          <span className="mt-1 block text-xs font-normal text-slate-500">
                            Use the exact sign-in emails. Organization managers
                            and Studio admins are automatically included.
                          </span>
                        </label>
                      )}
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <label className="font-black">
                        Sales start
                        <input
                          type="datetime-local"
                          value={config.salesStart}
                          onChange={(e) =>
                            setConfig({ ...config, salesStart: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border p-3 font-normal"
                        />
                      </label>
                      <label className="font-black">
                        Sales end
                        <input
                          type="datetime-local"
                          value={config.salesEnd}
                          onChange={(e) =>
                            setConfig({ ...config, salesEnd: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border p-3 font-normal"
                        />
                      </label>
                      <label className="font-black">
                        Venue capacity
                        <input
                          type="number"
                          min="1"
                          value={config.capacity}
                          onChange={(e) =>
                            setConfig({ ...config, capacity: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border p-3 font-normal"
                          placeholder="Optional"
                        />
                      </label>
                      <label className="font-black">
                        Maximum tickets per order
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={config.maxPerOrder}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              maxPerOrder: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border p-3 font-normal"
                        />
                      </label>
                      <label className="font-black md:col-span-2">
                        Refund policy
                        <textarea
                          value={config.refundPolicy}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              refundPolicy: e.target.value,
                            })
                          }
                          className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"
                        />
                      </label>
                      <label className="font-black md:col-span-2">
                        Ticket terms
                        <textarea
                          value={config.terms}
                          onChange={(e) =>
                            setConfig({ ...config, terms: e.target.value })
                          }
                          className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"
                        />
                      </label>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        disabled={saving}
                        onClick={() => saveConfiguration(false)}
                        className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white"
                      >
                        Save Draft
                      </button>
                      <button
                        disabled={
                          saving ||
                          !selectedSetting ||
                          selectedTypes.length === 0
                        }
                        onClick={() => saveConfiguration(true)}
                        className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-40"
                      >
                        Submit for Approval
                      </button>
                    </div>
                    <section className="mt-8 border-t pt-7">
                      <div>
                        <p className="text-xs font-black uppercase text-pink-600">
                          Purchaser communication
                        </p>
                        <h3 className="mt-1 text-2xl font-black">
                          Ticket Confirmation Email
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                          Sent by SDTV after the signed Swirepay webhook
                          confirms payment. Event details, flyer, organizer
                          branding, purchased tickets, totals and QR codes are
                          inserted automatically.
                        </p>
                      </div>
                      <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <div className="grid content-start gap-4">
                          <label className="font-black">
                            Email subject
                            <input
                              value={config.emailSubject}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  emailSubject: e.target.value,
                                })
                              }
                              placeholder="Your tickets for {{event_name}}"
                              className="mt-1 w-full rounded-xl border p-3 font-normal"
                            />
                          </label>
                          <p className="-mt-2 text-xs text-slate-500">
                            Available: {"{{event_name}}"},{" "}
                            {"{{organization_name}}"}, {"{{order_number}}"}
                          </p>
                          <label className="font-black">
                            Organizer message
                            <textarea
                              value={config.emailMessage}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  emailMessage: e.target.value,
                                })
                              }
                              placeholder="Thank you for supporting our event. Please present your QR code at entry."
                              className="mt-1 min-h-28 w-full rounded-xl border p-3 font-normal"
                            />
                          </label>
                          <label className="font-black">
                            Organizer footer
                            <textarea
                              value={config.emailFooter}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  emailFooter: e.target.value,
                                })
                              }
                              placeholder="Parking, entry or support instructions"
                              className="mt-1 min-h-20 w-full rounded-xl border p-3 font-normal"
                            />
                          </label>
                          <label className="font-black">
                            Reply-to email
                            <input
                              type="email"
                              value={config.replyTo}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  replyTo: e.target.value,
                                })
                              }
                              placeholder="Organizer support email"
                              className="mt-1 w-full rounded-xl border p-3 font-normal"
                            />
                          </label>
                        </div>
                        <div className="overflow-hidden rounded-3xl border bg-slate-100">
                          <div className="bg-slate-950 px-5 py-4 text-white">
                            <p className="text-xs font-black uppercase text-pink-300">
                              Email preview
                            </p>
                            <p className="mt-1 font-black">{sampleSubject}</p>
                          </div>
                          {eventFlyer && (
                            <img
                              src={eventFlyer}
                              alt="Email flyer preview"
                              className="h-48 w-full object-cover"
                            />
                          )}
                          <div className="p-5">
                            <div className="flex items-center gap-3">
                              {selectedOrganization?.image && (
                                <img
                                  src={selectedOrganization.image}
                                  alt="Organizer logo preview"
                                  className="h-12 w-12 rounded-xl bg-white object-contain p-1"
                                />
                              )}
                              <div>
                                <p className="text-xs font-black uppercase text-slate-400">
                                  Your ticket from SDTV
                                </p>
                                <p className="font-black">
                                  {selectedOrganization?.name}
                                </p>
                              </div>
                            </div>
                            <h4 className="mt-5 text-2xl font-black">
                              {selectedEvent.title}
                            </h4>
                            <p className="mt-2 text-sm font-bold text-slate-600">
                              {selectedEvent.date} · {selectedEvent.location}
                            </p>
                            <p className="mt-4 whitespace-pre-line text-sm text-slate-700">
                              {config.emailMessage ||
                                "Thank you for your purchase. Your confirmed ticket and QR code are included below."}
                            </p>
                            <div className="mt-4 rounded-2xl border bg-white p-4">
                              <p className="font-black">
                                General Admission ·{" "}
                                {activePrices.length
                                  ? money(Math.min(...activePrices))
                                  : "$0.00"}
                              </p>
                              <div className="mt-3 grid h-24 place-items-center rounded-xl bg-slate-950 font-black text-white">
                                QR CODE
                              </div>
                            </div>
                            {config.emailFooter && (
                              <p className="mt-4 whitespace-pre-line text-xs text-slate-500">
                                {config.emailFooter}
                              </p>
                            )}
                            <p className="mt-5 border-t pt-4 text-xs text-slate-400">
                              Payment receipt and tickets issued securely by
                              Seattle Desi TV.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                    <section className="mt-8 border-t pt-7">
                      <h3 className="text-2xl font-black">
                        Ticket Types & Prices
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Each ticket type has its own price and inventory. Free
                        tickets can use a $0.00 price.
                      </p>
                      <div className="mt-4 grid gap-3">
                        {selectedTypes.map((row) => (
                          <div
                            key={row.id}
                            className="flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="font-black">
                                {row.name} ·{" "}
                                {money(
                                  row.price_cents,
                                  selectedSetting?.currency,
                                )}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {row.quantity_sold} sold ·{" "}
                                {row.quantity_reserved} reserved ·{" "}
                                {row.quantity_total -
                                  row.quantity_sold -
                                  row.quantity_reserved}{" "}
                                available · {row.status}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => toggleType(row)}
                                className="rounded-lg border px-3 py-2 text-sm font-black"
                              >
                                {row.status === "active" ? "Hide" : "Show"}
                              </button>
                              <button
                                disabled={row.quantity_sold > 0}
                                onClick={() => removeType(row)}
                                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-black text-red-600 disabled:opacity-40"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedSetting && (
                        <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
                          <input
                            value={ticketType.name}
                            onChange={(e) =>
                              setTicketType({
                                ...ticketType,
                                name: e.target.value,
                              })
                            }
                            placeholder="Ticket name"
                            className="rounded-xl border p-3 font-bold"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ticketType.price}
                            onChange={(e) =>
                              setTicketType({
                                ...ticketType,
                                price: e.target.value,
                              })
                            }
                            placeholder="Price in USD"
                            className="rounded-xl border p-3"
                          />
                          <input
                            type="number"
                            min="1"
                            value={ticketType.quantity}
                            onChange={(e) =>
                              setTicketType({
                                ...ticketType,
                                quantity: e.target.value,
                              })
                            }
                            placeholder="Quantity"
                            className="rounded-xl border p-3"
                          />
                          <input
                            value={ticketType.description}
                            onChange={(e) =>
                              setTicketType({
                                ...ticketType,
                                description: e.target.value,
                              })
                            }
                            placeholder="Description (optional)"
                            className="rounded-xl border p-3 md:col-span-3"
                          />
                          <input
                            type="number"
                            min="1"
                            value={ticketType.min}
                            onChange={(e) =>
                              setTicketType({
                                ...ticketType,
                                min: e.target.value,
                              })
                            }
                            placeholder="Minimum/order"
                            className="rounded-xl border p-3"
                          />
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={ticketType.max}
                            onChange={(e) =>
                              setTicketType({
                                ...ticketType,
                                max: e.target.value,
                              })
                            }
                            placeholder="Maximum/order"
                            className="rounded-xl border p-3"
                          />
                          <button
                            disabled={saving}
                            onClick={addTicketType}
                            className="rounded-xl bg-pink-600 px-4 py-3 font-black text-white"
                          >
                            Add Ticket Type & Price
                          </button>
                        </div>
                      )}
                    </section>
                    <section
                      id="sales-report"
                      className="mt-8 scroll-mt-6 border-t pt-7"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase text-pink-600">
                            Organizer report
                          </p>
                          <h3 className="mt-1 text-2xl font-black">
                            Ticket Sales Report
                          </h3>
                          <p className="mt-2 text-sm text-slate-600">
                            Only verified managers of this organization and SDTV
                            administrators can view purchaser information.
                          </p>
                        </div>
                        <button
                          onClick={downloadSalesCsv}
                          disabled={eventOrders.length === 0}
                          className="rounded-xl border px-4 py-3 text-sm font-black disabled:opacity-40"
                        >
                          Download CSV
                        </button>
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-pink-50 p-4">
                          <p className="text-xs font-black uppercase text-pink-600">
                            Tickets sold
                          </p>
                          <p className="mt-1 text-3xl font-black">
                            {ticketsSold}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 p-4">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Paid orders
                          </p>
                          <p className="mt-1 text-3xl font-black">
                            {paidOrders.length}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 p-4">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Gross ticket sales
                          </p>
                          <p className="mt-1 text-3xl font-black">
                            {money(grossSales)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4">
                          <p className="text-xs font-black uppercase text-emerald-700">
                            Transferred to organizer
                          </p>
                          <p className="mt-1 text-3xl font-black">
                            {money(paidOut)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 overflow-x-auto rounded-2xl border">
                        <table className="w-full min-w-[900px] text-left text-sm">
                          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="p-3">Order</th>
                              <th className="p-3">Purchaser</th>
                              <th className="p-3">Tickets</th>
                              <th className="p-3">Total</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventOrders.map((row) => (
                              <tr key={row.id} className="border-t">
                                <td className="p-3 font-mono text-xs">
                                  {String(row.id).slice(0, 8).toUpperCase()}
                                </td>
                                <td className="p-3">
                                  <p className="font-black">{row.buyer_name}</p>
                                  <p className="text-xs text-slate-500">
                                    {row.buyer_email}
                                    {row.buyer_phone
                                      ? ` · ${row.buyer_phone}`
                                      : ""}
                                  </p>
                                </td>
                                <td className="p-3">
                                  {(row.ticket_order_items || []).map(
                                    (item: any) => (
                                      <p key={`${row.id}-${item.ticket_name}`}>
                                        {item.ticket_name} × {item.quantity}
                                      </p>
                                    ),
                                  )}
                                </td>
                                <td className="p-3 font-black">
                                  {money(row.total_cents, row.currency)}
                                </td>
                                <td className="p-3 capitalize">
                                  {String(row.status).replaceAll("_", " ")}
                                </td>
                                <td className="p-3">
                                  {new Date(
                                    row.paid_at || row.created_at,
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {eventOrders.length === 0 && (
                          <p className="p-8 text-center font-bold text-slate-500">
                            No ticket orders yet. Sales will appear here after
                            checkout begins.
                          </p>
                        )}
                      </div>
                      {eventSettlements.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-black">Settlement History</h4>
                          <div className="mt-3 grid gap-3">
                            {eventSettlements.map((row) => (
                              <div
                                key={row.id}
                                className="flex flex-wrap justify-between gap-3 rounded-2xl bg-slate-50 p-4"
                              >
                                <div>
                                  <p className="font-black capitalize">
                                    {String(row.status).replaceAll("_", " ")}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {row.payout_reference ||
                                      row.provider_transfer_gid ||
                                      "Transfer reference pending"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black">
                                    {money(row.net_payout_cents, row.currency)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Gross{" "}
                                    {money(row.gross_sales_cents, row.currency)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                    {selectedSetting && (
                      <p className="mt-6 text-xs font-bold text-slate-400">
                        Last updated: {when(selectedSetting.updated_at)}
                      </p>
                    )}
                  </>
                )}
              </section>
            </div>
          )
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
