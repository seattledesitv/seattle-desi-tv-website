"use client";
import { useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { useClassifieds } from "../../hooks/useClassifieds";
import type {
  ClassifiedInput,
  ClassifiedPlacement,
} from "../../lib/classifieds/types";
import { useCurrentSite } from "../../lib/sites/SiteContext";
const blank = (city: string): ClassifiedInput => ({
  category: "items",
  title: "",
  description: "",
  price_cents: null,
  price_type: "fixed",
  item_condition: "good",
  location: `${city} Area`,
  image_urls: [],
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  contact_method: "form",
  destination_url: "",
  requested_placement: "standard",
});
export default function NewClassified() {
  const site = useCurrentSite();
  const { pricing, userId, saving, error, create, upload } =
    useClassifieds("owner");
  const [form, setForm] = useState(() => blank(site.city)),
    [message, setMessage] = useState(""),
    [uploading, setUploading] = useState(false),
    [accepted, setAccepted] = useState(false);
  const set = (k: keyof ClassifiedInput, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));
  async function addFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files).slice(0, 5 - form.image_urls.length))
        urls.push(await upload(file));
      set("image_urls", [...form.image_urls, ...urls]);
    } finally {
      setUploading(false);
    }
  }
  async function submit() {
    setMessage("");
    if (!accepted) {
      setMessage(
        "Please accept the SDTV community classified rules before submitting.",
      );
      return;
    }
    try {
      await create(form);
      setMessage(
        "Submitted for SDTV review. You can track it in My Classifieds.",
      );
      setForm(blank(site.city));
    } catch {}
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-6 py-12">
        <p className="font-black uppercase text-pink-600">
          Community classifieds
        </p>
        <h1 className="mt-2 text-4xl font-black">Post a Classified</h1>
        <p className="mt-2 text-slate-600">
          Your listing is reviewed before publication. Paid placement is charged
          only after approval.
        </p>
        {!userId ? (
          <a
            href="/login?next=/classifieds/new"
            className="mt-6 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white"
          >
            Log in to continue
          </a>
        ) : (
          <div className="mt-7 grid gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2">
            <label className="grid gap-1 font-bold">
              Category
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="rounded-xl border p-3"
              >
                <option value="items">Items for Sale</option>
                <option value="housing">Housing & Rentals</option>
                <option value="jobs">Jobs</option>
                <option value="services">Services</option>
                <option value="vehicles">Vehicles</option>
                <option value="community">Community Announcement</option>
                <option value="classes">Classes</option>
                <option value="lost_found">Lost & Found</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-1 font-bold">
              Title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="rounded-xl border p-3"
              />
            </label>
            <label className="grid gap-1 font-bold md:col-span-2">
              Description
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="min-h-36 rounded-xl border p-3"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Price type
              <select
                value={form.price_type}
                onChange={(e) => set("price_type", e.target.value)}
                className="rounded-xl border p-3"
              >
                <option value="fixed">Fixed</option>
                <option value="negotiable">Negotiable</option>
                <option value="free">Free</option>
                <option value="contact">Contact for price</option>
              </select>
            </label>
            <label className="grid gap-1 font-bold">
              Price in dollars
              <input
                type="number"
                min="0"
                disabled={["free", "contact"].includes(form.price_type)}
                value={form.price_cents == null ? "" : form.price_cents / 100}
                onChange={(e) =>
                  set(
                    "price_cents",
                    e.target.value
                      ? Math.round(Number(e.target.value) * 100)
                      : null,
                  )
                }
                className="rounded-xl border p-3"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Location
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="rounded-xl border p-3"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Contact name
              <input
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                className="rounded-xl border p-3"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Contact method
              <select
                value={form.contact_method}
                onChange={(e) => set("contact_method", e.target.value)}
                className="rounded-xl border p-3"
              >
                <option value="form">Private SDTV contact form</option>
                <option value="email">Display email</option>
                <option value="phone">Display phone</option>
                <option value="external">External link</option>
              </select>
            </label>
            <label className="grid gap-1 font-bold">
              Email
              <input
                type="email"
                value={form.contact_email || ""}
                onChange={(e) => set("contact_email", e.target.value)}
                className="rounded-xl border p-3"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Phone
              <input
                value={form.contact_phone || ""}
                onChange={(e) => set("contact_phone", e.target.value)}
                className="rounded-xl border p-3"
              />
            </label>
            <label className="grid gap-1 font-bold md:col-span-2">
              External link
              <input
                value={form.destination_url || ""}
                onChange={(e) => set("destination_url", e.target.value)}
                placeholder="https://..."
                className="rounded-xl border p-3"
              />
            </label>
            <div className="md:col-span-2">
              <p className="font-bold">Placement</p>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {pricing.map((p) => (
                  <button
                    type="button"
                    key={p.placement}
                    onClick={() =>
                      set(
                        "requested_placement",
                        p.placement as ClassifiedPlacement,
                      )
                    }
                    className={`rounded-2xl border p-4 text-left ${form.requested_placement === p.placement ? "border-pink-600 bg-pink-50" : ""}`}
                  >
                    <b>{p.label}</b>
                    <span className="mt-1 block text-sm">
                      {p.price_cents
                        ? `$${(p.price_cents / 100).toFixed(2)}`
                        : "Free"}{" "}
                      · {p.duration_days} days
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <label className="grid gap-2 font-bold md:col-span-2">
              Images (maximum 5)
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="rounded-xl border p-3"
              />
            </label>
            {form.image_urls.length > 0 && (
              <div className="flex gap-2 md:col-span-2">
                {form.image_urls.map((u) => (
                  <img
                    key={u}
                    src={u}
                    alt="Upload preview"
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
            <label className="flex gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              I confirm this listing is accurate, lawful, and follows SDTV
              community rules.
            </label>
            <button
              onClick={submit}
              disabled={saving || uploading}
              className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white md:col-span-2"
            >
              {uploading
                ? "Uploading..."
                : saving
                  ? "Submitting..."
                  : "Submit for review"}
            </button>
          </div>
        )}
        {(error || message) && (
          <p className="mt-5 rounded-xl bg-yellow-50 p-4 font-bold">
            {error || message}
          </p>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
