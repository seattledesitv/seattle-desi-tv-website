"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import CheckedExternalLink from "../components/CheckedExternalLink";
import SafeImage from "../components/SafeImage";
import ExpandableBusinessOffer from "../components/ExpandableBusinessOffer";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { seoEntityPath } from "../lib/seo/urls";
import {
  canRequestCrew as roleCanRequestCrew,
  resolveUserRole,
} from "../lib/roles";
import {
  firstError,
  normalizeUrl,
  requireText,
  validateOptionalEmail,
  validateOptionalImageFile,
  validateOptionalPhone,
  validateOptionalUrl,
} from "../lib/validation";

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "seattledesitv@gmail.com";
const supabase = getSupabaseBrowserClient();

type BusinessRow = {
  id: string;
  name: string;
  address: string;
  website?: string | null;
  category?: string | null;
  discount?: string | null;
  offer?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
  status?: string | null;
  created_at?: string | null;
  is_premium?: boolean | null;
  premium_rank?: number | null;
  premium_starts_at?: string | null;
  premium_ends_at?: string | null;
  premium_label?: string | null;
};

type InsertedBusiness = { id: string; name: string; address: string };
type FieldProps = {
  label: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
};

function Field({ label, required, help, children }: FieldProps) {
  return (
    <label className="block text-sm font-bold text-slate-900">
      <span>
        {label}
        {required && <span className="text-pink-600"> *</span>}
      </span>
      {children}
      {help && <p className="mt-1 text-xs font-normal text-gray-500">{help}</p>}
    </label>
  );
}

function getImages(business: BusinessRow) {
  return Array.isArray(business.image_urls) && business.image_urls.length
    ? business.image_urls
    : business.image
      ? [business.image]
      : [];
}
function formatError(error: any) {
  return (
    [error?.message, error?.details, error?.hint, error?.code]
      .filter(Boolean)
      .join(" | ") || String(error || "Unknown error.")
  );
}
function siteOrigin() {
  return typeof window !== "undefined"
    ? window.location.origin
    : "https://seattledesitv.com";
}
function safeExternalUrl(value?: string | null) {
  return value && validateOptionalUrl(value, "Website").ok
    ? normalizeUrl(value)
    : "";
}
function normalizePhone(value: string) {
  const trimmed = String(value || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15)
    return `+${digits}`;
  return trimmed;
}
function profileContact(profile: any, user: any) {
  return {
    name:
      profile?.preferred_name ||
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "",
    email: profile?.email || user?.email || "",
    phone: normalizePhone(profile?.phone || ""),
  };
}
function cityFromAddress(address?: string | null) {
  const parts = String(address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 2];
  if (parts.length === 2) return parts[0];
  return "Other";
}
function premiumIsActive(business: BusinessRow) {
  if (!business.is_premium) return false;
  const now = Date.now();
  const starts = business.premium_starts_at
    ? new Date(business.premium_starts_at).getTime()
    : 0;
  const ends = business.premium_ends_at
    ? new Date(business.premium_ends_at).getTime()
    : Number.POSITIVE_INFINITY;
  return starts <= now && now <= ends;
}

async function uploadFileToCloudinary(file: File) {
  const validation = validateOptionalImageFile(file, "Business image", 5);
  if (!validation.ok) throw new Error(validation.message);
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET)
    throw new Error("Cloudinary is not configured.");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "seattle-desi-tv/businesses");
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result?.error?.message ||
        `Cloudinary upload failed with status ${response.status}`,
    );
  return result.secure_url as string;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [message, setMessage] = useState("Loading approved businesses...");
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState("general_public");
  const [baseProfile, setBaseProfile] = useState<any>(null);
  const [useProfilePoc, setUseProfilePoc] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    website: "",
    category: "",
    discount: "",
    offer: "",
    pocName: "",
    pocEmail: "",
    pocPhone: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitMessage, setSubmitMessage] = useState("");
  const [adminReviewLink, setAdminReviewLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [directorySearch, setDirectorySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [offerFilter, setOfferFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("recommended");
  const isTeamMember = Boolean(user && roleCanRequestCrew(userRole));

  async function loadBusinesses() {
    setMessage("Loading approved businesses...");
    const premiumSelect =
      "id,name,address,website,category,discount,offer,image,image_urls,status,created_at,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label";
    const standardSelect =
      "id,name,address,website,category,discount,offer,image,image_urls,status,created_at";

    const premiumResult = await supabase
      .from("local_businesses")
      .select(premiumSelect)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    let rows: BusinessRow[] = [];
    let loadError = premiumResult.error;

    if (
      premiumResult.error &&
      /is_premium|premium_/i.test(premiumResult.error.message || "")
    ) {
      const standardResult = await supabase
        .from("local_businesses")
        .select(standardSelect)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      loadError = standardResult.error;
      rows = (standardResult.data || []) as BusinessRow[];
    } else {
      rows = (premiumResult.data || []) as BusinessRow[];
    }

    if (loadError) {
      setBusinesses([]);
      setMessage(`Could not load businesses: ${loadError.message}`);
      return;
    }
    setBusinesses(rows);
    setMessage(
      rows.length
        ? `Showing ${rows.length} approved business(es).`
        : "No approved businesses found.",
    );
  }

  async function loadUserContext(currentUser: any) {
    if (!currentUser) {
      setUserRole("general_public");
      setBaseProfile(null);
      setUseProfilePoc(false);
      setForm((current) => ({
        ...current,
        pocName: "",
        pocEmail: "",
        pocPhone: "",
      }));
      return;
    }
    const role = await resolveUserRole(supabase, currentUser);
    setUserRole(role);
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name,preferred_name,email,phone")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    setBaseProfile(profile || null);
    const contact = profileContact(profile, currentUser);
    const team = roleCanRequestCrew(role);
    setUseProfilePoc(!team);
    setForm((current) =>
      team
        ? { ...current, pocName: "", pocEmail: "", pocPhone: "" }
        : {
            ...current,
            pocName: contact.name,
            pocEmail: contact.email,
            pocPhone: contact.phone,
          },
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }
  function toggleProfilePoc(checked: boolean) {
    setUseProfilePoc(checked);
    const contact = checked
      ? profileContact(baseProfile, user)
      : { name: "", email: "", phone: "" };
    setForm((current) => ({
      ...current,
      pocName: contact.name,
      pocEmail: contact.email,
      pocPhone: contact.phone,
    }));
  }
  function openAdminEmail(
    id: string,
    businessName: string,
    businessAddress: string,
  ) {
    const reviewLink = `${siteOrigin()}/studio/businesses`;
    const directLink = `${siteOrigin()}/studio/businesses/${id}`;
    setAdminReviewLink(reviewLink);
    const subject = `New SDTV business submitted: ${businessName}`;
    const body = [
      "A new business has been submitted for Seattle Desi TV review.",
      "",
      `Business: ${businessName}`,
      `Address: ${businessAddress}`,
      `Submitted by: ${user?.email || "unknown"}`,
      "",
      `Open business review page: ${reviewLink}`,
      `Direct edit link: ${directLink}`,
    ].join("\n");
    window.open(
      `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank",
    );
  }
  async function notifyAdmin(
    id: string,
    businessName: string,
    businessAddress: string,
  ) {
    const reviewLink = `${siteOrigin()}/studio/businesses`;
    const directLink = `${siteOrigin()}/studio/businesses/${id}`;
    setAdminReviewLink(reviewLink);
    try {
      const response = await fetch("/api/notify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "business",
          title: businessName,
          location: businessAddress,
          submittedBy: user?.email || "unknown",
          reviewUrl: reviewLink,
          directUrl: directLink,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok)
        throw new Error(
          result?.error || "Admin email API did not confirm success.",
        );
      return true;
    } catch {
      openAdminEmail(id, businessName, businessAddress);
      return false;
    }
  }
  function validateBusinessForm() {
    const phone = normalizePhone(form.pocPhone);
    return firstError(
      requireText(form.name, "Business name", 2),
      requireText(form.address, "Business address", 5),
      validateOptionalUrl(form.website, "Website"),
      requireText(form.pocName, "Business contact name", 2),
      requireText(form.pocEmail, "Business contact email", 5),
      validateOptionalEmail(form.pocEmail, "Business contact email"),
      requireText(phone, "Business contact phone", 10),
      validateOptionalPhone(phone, "Business contact phone"),
      validateOptionalImageFile(imageFiles[0], "Business image / logo", 5),
    );
  }

  async function submitBusiness() {
    setSubmitMessage("");
    setAdminReviewLink("");
    if (!user?.id)
      return setSubmitMessage("Please login before submitting a business.");
    const validationError = validateBusinessForm();
    if (validationError) return setSubmitMessage(validationError);
    setSaving(true);
    try {
      const imageUrl = imageFiles[0]
        ? await uploadFileToCloudinary(imageFiles[0])
        : "";
      const payload: any = {
        name: form.name.trim(),
        address: form.address.trim(),
        website: safeExternalUrl(form.website) || null,
        category: form.category.trim() || null,
        discount: form.discount.trim() || null,
        offer: form.offer.trim() || null,
        poc_name: form.pocName.trim(),
        poc_email: form.pocEmail.trim(),
        poc_phone: normalizePhone(form.pocPhone),
        image: imageUrl || null,
        created_by: user.id,
        status: "pending",
        approved: false,
      };
      const { data, error } = await supabase
        .from("local_businesses")
        .insert(payload)
        .select("id,name,address")
        .single();
      if (error) throw error;
      const inserted = data as InsertedBusiness;
      const sent = await notifyAdmin(
        inserted.id,
        inserted.name,
        inserted.address,
      );
      setForm({
        name: "",
        address: "",
        website: "",
        category: "",
        discount: "",
        offer: "",
        pocName: "",
        pocEmail: "",
        pocPhone: "",
      });
      setImageFiles([]);
      setShowSubmitForm(false);
      setSubmitMessage(
        sent
          ? "Business submitted successfully. Admin notification email was sent."
          : "Business submitted successfully. An admin email window was opened as backup.",
      );
      await loadBusinesses();
    } catch (error: any) {
      setSubmitMessage(`Could not submit business: ${formatError(error)}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user || null;
      setUser(currentUser);
      await loadUserContext(currentUser);
      setAuthChecked(true);
      await loadBusinesses();
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user || null;
        setUser(nextUser);
        await loadUserContext(nextUser);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          businesses
            .map((business) => String(business.category || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [businesses],
  );
  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          businesses
            .map((business) => cityFromAddress(business.address))
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [businesses],
  );
  const categoryCounts = useMemo(
    () =>
      categories.map((category) => ({
        category,
        count: businesses.filter(
          (business) => String(business.category || "").trim() === category,
        ).length,
      })),
    [businesses, categories],
  );
  const visibleBusinesses = useMemo(() => {
    const query = directorySearch.trim().toLowerCase();
    const filtered = businesses.filter((business) => {
      const matchesSearch =
        !query ||
        [
          business.name,
          business.address,
          cityFromAddress(business.address),
          business.category,
          business.offer,
          business.discount,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );
      const matchesCategory =
        categoryFilter === "all" ||
        String(business.category || "").trim() === categoryFilter;
      const matchesCity =
        cityFilter === "all" ||
        cityFromAddress(business.address) === cityFilter;
      const hasOffer = Boolean(
        String(business.discount || business.offer || "").trim(),
      );
      return (
        matchesSearch &&
        matchesCategory &&
        matchesCity &&
        (offerFilter === "all" ||
          (offerFilter === "offers" ? hasOffer : !hasOffer))
      );
    });
    return [...filtered].sort((a, b) => {
      if (sortOrder === "name") return a.name.localeCompare(b.name);
      if (sortOrder === "city")
        return (
          cityFromAddress(a.address).localeCompare(
            cityFromAddress(b.address),
          ) || a.name.localeCompare(b.name)
        );
      if (sortOrder === "newest")
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      const premiumDifference =
        Number(premiumIsActive(b)) - Number(premiumIsActive(a));
      if (premiumDifference) return premiumDifference;
      if (premiumIsActive(a) && premiumIsActive(b))
        return Number(a.premium_rank || 100) - Number(b.premium_rank || 100);
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });
  }, [
    businesses,
    directorySearch,
    categoryFilter,
    cityFilter,
    offerFilter,
    sortOrder,
  ]);
  const filtersActive = Boolean(
    directorySearch.trim() ||
    categoryFilter !== "all" ||
    cityFilter !== "all" ||
    offerFilter !== "all" ||
    sortOrder !== "recommended",
  );
  function clearFilters() {
    setDirectorySearch("");
    setCategoryFilter("all");
    setCityFilter("all");
    setOfferFilter("all");
    setSortOrder("recommended");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-[#081024]">
      <SiteHeader />
      <section className="px-6 py-10 md:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-black uppercase tracking-wide text-pink-600">
                Seattle Desi Marketplace
              </p>
              <h1 className="mt-2 text-4xl font-black md:text-5xl">
                Local Business Directory
              </h1>
              <p className="mt-2 text-gray-500">
                Approved Seattle Desi TV local business listings.
              </p>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/offers"
                className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
              >
                View Business Offers
              </a>
              <button
                onClick={() => setShowSubmitForm((value) => !value)}
                className="rounded-xl bg-pink-600 px-5 py-3 font-bold text-white"
              >
                {showSubmitForm ? "Hide Add Business" : "Add Business"}
              </button>
              <button
                onClick={loadBusinesses}
                className="rounded-xl border border-pink-600 bg-white px-5 py-3 font-bold text-pink-600"
              >
                Refresh Businesses
              </button>
            </div>
          </div>
          {submitMessage && (
            <div className="mb-6 whitespace-pre-line rounded-2xl border bg-white p-4 text-sm font-bold text-orange-700">
              {submitMessage}
              {adminReviewLink && (
                <a
                  href={adminReviewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-pink-600"
                >
                  Admin business review page
                </a>
              )}
            </div>
          )}
          {showSubmitForm && (
            <section className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black">Add Business</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Listings appear after admin approval.
                  </p>
                </div>
                <button
                  onClick={() => setShowSubmitForm(false)}
                  className="text-sm font-black text-gray-500"
                >
                  Collapse
                </button>
              </div>
              {!authChecked ? (
                <p>Checking login...</p>
              ) : user ? (
                <div>
                  <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Logged in as <b>{user.email}</b>
                    <span className="ml-2 text-xs">{userRole}</span>
                    <button
                      onClick={signOut}
                      className="mt-2 block font-bold text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Business name" required>
                      <input
                        className="mt-1 w-full rounded-lg border p-3"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Business address" required>
                      <input
                        className="mt-1 w-full rounded-lg border p-3"
                        value={form.address}
                        onChange={(e) =>
                          setForm({ ...form, address: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Website">
                      <input
                        className="mt-1 w-full rounded-lg border p-3"
                        value={form.website}
                        onChange={(e) =>
                          setForm({ ...form, website: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Category">
                      <input
                        className="mt-1 w-full rounded-lg border p-3"
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Discount / special offer">
                      <input
                        className="mt-1 w-full rounded-lg border p-3"
                        value={form.discount}
                        onChange={(e) =>
                          setForm({ ...form, discount: e.target.value })
                        }
                      />
                    </Field>
                    <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-2">
                      <label className="flex gap-3 text-sm font-black">
                        <input
                          type="checkbox"
                          checked={useProfilePoc}
                          onChange={(e) => toggleProfilePoc(e.target.checked)}
                        />
                        <span>
                          {isTeamMember
                            ? "Use my SDTV Base Profile as the Business POC"
                            : "Use my contact information as the Business POC"}
                        </span>
                      </label>
                    </div>
                    <Field label="Business contact name" required>
                      <input
                        className="mt-1 w-full rounded-lg border p-3"
                        value={form.pocName}
                        onChange={(e) =>
                          setForm({ ...form, pocName: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Business contact email" required>
                      <input
                        type="email"
                        className="mt-1 w-full rounded-lg border p-3"
                        value={form.pocEmail}
                        onChange={(e) =>
                          setForm({ ...form, pocEmail: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Business contact phone" required>
                      <input
                        className="mt-1 w-full rounded-lg border p-3"
                        value={form.pocPhone}
                        onBlur={() =>
                          setForm({
                            ...form,
                            pocPhone: normalizePhone(form.pocPhone),
                          })
                        }
                        onChange={(e) =>
                          setForm({ ...form, pocPhone: e.target.value })
                        }
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Offer / description">
                        <textarea
                          className="mt-1 min-h-24 w-full rounded-lg border p-3"
                          value={form.offer}
                          onChange={(e) =>
                            setForm({ ...form, offer: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Upload business image / logo">
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-1 w-full rounded-lg border p-3"
                          onChange={(e) =>
                            setImageFiles(Array.from(e.target.files || []))
                          }
                        />
                      </Field>
                    </div>
                  </div>
                  <button
                    onClick={submitBusiness}
                    disabled={saving}
                    className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-3 font-bold text-white disabled:opacity-60"
                  >
                    {saving
                      ? "Saving Business..."
                      : "Submit Business for Approval"}
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-black">Login to Add Business</h3>
                  <a
                    href="/login"
                    className="mt-4 inline-block rounded-xl bg-pink-600 px-5 py-3 font-bold text-white"
                  >
                    Login to continue
                  </a>
                </div>
              )}
            </section>
          )}
          {businesses.length > 0 && (
            <section className="mb-7 rounded-3xl border bg-white p-5 shadow-sm">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-4 text-xl text-slate-400">
                  ⌕
                </span>
                <input
                  autoFocus
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="Search by business name, city, category, service or offer..."
                  className="w-full rounded-2xl border-2 border-slate-200 py-4 pl-12 pr-4 text-base outline-none transition focus:border-pink-500"
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border px-3 py-3"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="rounded-xl border px-3 py-3"
                >
                  <option value="all">All cities</option>
                  {cities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
                <select
                  value={offerFilter}
                  onChange={(e) => setOfferFilter(e.target.value)}
                  className="rounded-xl border px-3 py-3"
                >
                  <option value="all">All businesses</option>
                  <option value="offers">Offers available</option>
                  <option value="no_offers">No current offer</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="rounded-xl border px-3 py-3"
                >
                  <option value="recommended">Recommended</option>
                  <option value="newest">Newest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="city">City A–Z</option>
                </select>
                <button
                  onClick={clearFilters}
                  disabled={!filtersActive}
                  className="rounded-xl border border-pink-200 px-4 py-3 font-bold text-pink-600 disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${categoryFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
                >
                  All {businesses.length}
                </button>
                {categoryCounts.map(({ category, count }) => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${categoryFilter === category ? "bg-pink-600 text-white" : "bg-pink-50 text-pink-700"}`}
                  >
                    {category} {count}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-sm text-slate-500">
                <p>
                  Showing{" "}
                  <strong className="text-slate-900">
                    {visibleBusinesses.length}
                  </strong>{" "}
                  of {businesses.length} businesses
                </p>
                <p className="hidden sm:block">
                  Premium listings appear first under Recommended.
                </p>
              </div>
            </section>
          )}
          <section>
            {businesses.length === 0 ? (
              <div className="rounded-2xl border bg-white p-8 text-gray-500">
                {message}
              </div>
            ) : visibleBusinesses.length === 0 ? (
              <div className="rounded-2xl border bg-white p-8 text-center">
                <h2 className="text-xl font-black">
                  No businesses match these filters
                </h2>
                <button
                  onClick={clearFilters}
                  className="mt-4 rounded-xl bg-pink-600 px-5 py-3 font-bold text-white"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {visibleBusinesses.map((business) => {
                  const images = getImages(business);
                  const premium = premiumIsActive(business);
                  return (
                    <article
                      key={business.id}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${premium ? "border-amber-300 ring-2 ring-amber-100" : ""}`}
                    >
                      <div className="relative">
                        {images.length ? (
                          <SafeImage
                            src={images[0]}
                            alt={business.name}
                            className="h-56 w-full bg-gray-100 object-cover"
                            fallbackClassName="h-56 w-full bg-pink-50 grid place-items-center text-pink-600 font-black"
                            fallbackLabel="Seattle Desi TV"
                            widthHint={900}
                          />
                        ) : (
                          <div className="grid h-56 place-items-center bg-pink-50 font-black text-pink-600">
                            Seattle Desi TV
                          </div>
                        )}
                        {premium && (
                          <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase text-amber-950 shadow">
                            {business.premium_label || "Premium"}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-xl font-black">
                              {business.name}
                            </h2>
                            <p className="mt-1 text-gray-500">
                              {business.address}
                            </p>
                          </div>
                          {business.category && (
                            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">
                              {business.category}
                            </span>
                          )}
                        </div>
                        {business.discount && (
                          <p className="mt-3 text-sm font-black text-green-700">
                            {business.discount}
                          </p>
                        )}
                        {business.offer && (
                          <ExpandableBusinessOffer offer={business.offer} />
                        )}
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link
                            href={seoEntityPath(
                              "businesses",
                              business.name,
                              business.id,
                            )}
                            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                          >
                            View Profile
                          </Link>
                          {business.website && (
                            <CheckedExternalLink
                              href={business.website}
                              notFoundMessage="Page not found. This business link is not available."
                              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                            >
                              Website
                            </CheckedExternalLink>
                          )}
                          <a
                            href={`https://www.google.com/maps?q=${encodeURIComponent(business.address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border px-4 py-2 text-sm font-bold"
                          >
                            Map
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
