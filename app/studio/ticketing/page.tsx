"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();
function money(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(cents || 0) / 100);
}
function label(value?: string) {
  return String(value || "unknown").replaceAll("_", " ");
}

export default function StudioTicketingPage() {
  const site = useCurrentSite();
  const [canAccess, setCanAccess] = useState(false),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState("Checking access...");
  const [rows, setRows] = useState<any[]>([]),
    [accounts, setAccounts] = useState<any[]>([]),
    [types, setTypes] = useState<any[]>([]),
    [filter, setFilter] = useState("pending_review"),
    [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const auth = await supabase.auth.getUser();
    const user = auth.data.user || null;
    if (!user || !isAdminRole(await resolveUserRole(supabase, user))) {
      setCanAccess(false);
      setMessage("Studio admin access is required.");
      setLoading(false);
      return;
    }
    setCanAccess(true);
    const [settingsResult, accountsResult] = await Promise.all([
      forSite(
        supabase
          .from("event_ticket_settings")
          .select(
            "*,events(title,date,location),community_organizations(name)",
          ),
        site.id,
      ).order("updated_at", { ascending: false }),
      forSite(
        supabase.from("organization_payment_accounts").select("*"),
        site.id,
      ),
    ]);
    if (settingsResult.error || accountsResult.error) {
      setMessage(
        settingsResult.error?.message ||
          accountsResult.error?.message ||
          "Run the ticketing SQL migration first.",
      );
      setLoading(false);
      return;
    }
    const nextRows = settingsResult.data || [];
    setRows(nextRows);
    setAccounts(accountsResult.data || []);
    const ids = nextRows.map((row: any) => row.id);
    if (ids.length) {
      const result = await forSite(
        supabase
          .from("event_ticket_types")
          .select("*")
          .in("ticket_setting_id", ids),
        site.id,
      );
      if (!result.error) setTypes(result.data || []);
    }
    setMessage("");
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, [site.id]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (filter === "all" || row.status === filter) &&
          (!search.trim() ||
            `${row.events?.title} ${row.community_organizations?.name} ${row.events?.location}`
              .toLowerCase()
              .includes(search.trim().toLowerCase())),
      ),
    [rows, filter, search],
  );
  const counts = useMemo(
    () =>
      rows.reduce(
        (result: Record<string, number>, row) => ({
          ...result,
          [row.status]: (result[row.status] || 0) + 1,
        }),
        {},
      ),
    [rows],
  );

  async function update(row: any, status: "active" | "paused" | "rejected") {
    const account = accounts.find(
      (item) => item.organization_id === row.organization_id,
    );
    const rowTypes = types.filter((type) => type.ticket_setting_id === row.id && type.status === "active");
    const freeOnly = rowTypes.length > 0 && rowTypes.every((type) => Number(type.price_cents) === 0);
    if (status === "active" && !account?.payouts_enabled && !row.test_mode && !freeOnly) {
      setMessage(
        "Ticket sales cannot be activated until Swirepay verifies the organization's payout destination.",
      );
      return;
    }
    if (
      status === "active" &&
      !types.some(
        (type) => type.ticket_setting_id === row.id && type.status === "active",
      )
    ) {
      setMessage("Add at least one active ticket type before activation.");
      return;
    }
    const auth = await supabase.auth.getUser();
    const result = await forSite(
      supabase.from("event_ticket_settings").update({
        status,
        approved_by: status === "active" ? auth.data.user?.id : row.approved_by,
        approved_at:
          status === "active" ? new Date().toISOString() : row.approved_at,
        updated_at: new Date().toISOString(),
      }),
      site.id,
    ).eq("id", row.id);
    if (result.error) setMessage(result.error.message);
    else {
      setMessage(
        status === "active"
          ? "Ticket sales activated."
          : `Ticket sales marked ${label(status)}.`,
      );
      await load();
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-black uppercase tracking-wide text-pink-300">
              Commerce Operations
            </p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl">
              Event Ticketing
            </h1>
            <p className="mt-2 text-slate-300">
              Review organizer inventory, Swirepay readiness, and ticket-sale
              activation.
            </p>
          </div>
          <button
            onClick={load}
            className="rounded-xl bg-white px-5 py-3 font-black text-slate-950"
          >
            Refresh
          </button>
        </div>
        {message && (
          <div className="mt-6 rounded-2xl bg-amber-100 p-4 font-bold text-amber-950">
            {message}
          </div>
        )}
        {!loading && canAccess && (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                "all",
                "pending_review",
                "active",
                "draft",
                "paused",
                "rejected",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-2xl border p-4 text-left ${filter === status ? "border-pink-400 bg-pink-600" : "border-white/10 bg-white/10"}`}
                >
                  <p className="text-2xl font-black">
                    {status === "all" ? rows.length : counts[status] || 0}
                  </p>
                  <p className="text-xs font-black capitalize">
                    {label(status)}
                  </p>
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search event, organization or location..."
              className="mt-5 w-full rounded-xl bg-white p-4 font-bold text-slate-950"
            />
            <div className="mt-6 grid gap-5">
              {filtered.map((row) => {
                const account = accounts.find(
                  (item) => item.organization_id === row.organization_id,
                );
                const ticketTypes = types.filter(
                  (item) => item.ticket_setting_id === row.id,
                );
                const freeOnly =
                  ticketTypes.length > 0 &&
                  ticketTypes.every((type) => Number(type.price_cents) === 0);
                const ready =
                  Boolean(account?.payouts_enabled) ||
                  Boolean(row.test_mode) ||
                  freeOnly;
                return (
                  <article
                    key={row.id}
                    className="rounded-3xl bg-white p-6 text-slate-950"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row">
                      <div>
                        <p className="text-xs font-black uppercase text-pink-600">
                          {label(row.status)}
                        </p>
                        <h2 className="mt-1 text-2xl font-black">
                          {row.events?.title || "Event"}
                        </h2>
                        <p className="mt-1 text-slate-500">
                          {row.community_organizations?.name || "Organization"}{" "}
                          · {row.events?.date} · {row.events?.location}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                            Collected into SDTV Swirepay
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                          >
                            {freeOnly
                              ? "Free event — no payout needed"
                              : `Organizer payout ${ready ? "ready" : label(account?.onboarding_status || "not started")}`}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            {ticketTypes.length} ticket type
                            {ticketTypes.length === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            Max {row.max_tickets_per_order}/order
                          </span>
                        </div>
                        <div className="mt-4 space-y-1 text-sm">
                          {ticketTypes.map((item) => (
                            <p key={item.id}>
                              <b>{item.name}:</b> {money(item.price_cents)} ·{" "}
                              {item.quantity_total -
                                item.quantity_sold -
                                item.quantity_reserved}{" "}
                              available of {item.quantity_total}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-start gap-2 lg:max-w-sm lg:justify-end">
                        <button
                          onClick={() => update(row, "active")}
                          disabled={!ready}
                          className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Activate Sales
                        </button>
                        <button
                          onClick={() => update(row, "paused")}
                          className="rounded-xl bg-amber-400 px-4 py-3 font-black"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => update(row, "rejected")}
                          className="rounded-xl bg-red-600 px-4 py-3 font-black text-white"
                        >
                          Reject
                        </button>
                        <a
                          href={`/events/${row.event_id}`}
                          className="rounded-xl border px-4 py-3 font-black"
                        >
                          Public Event
                        </a>
                      </div>
                    </div>
                    {!ready && (
                      <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
                        Activation is intentionally locked until Swirepay
                        verifies the organization payout destination. Customer
                        payments will be collected into SDTV's Swirepay account.
                      </p>
                    )}
                  </article>
                );
              })}
              {filtered.length === 0 && (
                <div className="rounded-3xl bg-white/10 p-8 text-center text-slate-300">
                  No ticket configurations match this view.
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
