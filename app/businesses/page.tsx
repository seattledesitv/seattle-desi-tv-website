"use client";

import { useEffect, useState, type ReactNode } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import CheckedExternalLink from "../components/CheckedExternalLink";
import SafeImage from "../components/SafeImage";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { canRequestCrew as roleCanRequestCrew, resolveUserRole } from "../lib/roles";
import { firstError, normalizeUrl, requireText, validateOptionalEmail, validateOptionalImageFile, validateOptionalPhone, validateOptionalUrl } from "../lib/validation";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "seattledesitv@gmail.com";
const supabase = getSupabaseBrowserClient();

type BusinessRow = { id: string; name: string; address: string; website?: string | null; category?: string | null; discount?: string | null; offer?: string | null; image?: string | null; image_urls?: string[] | null; status?: string | null };
type InsertedBusiness = { id: string; name: string; address: string };
type FieldProps = { label: string; required?: boolean; help?: string; children: ReactNode };

function Field({ label, required, help, children }: FieldProps) {
  return <label className="block text-sm font-bold text-slate-900"><span>{label}{required && <span className="text-pink-600"> *</span>}</span>{children}{help && <p className="text-xs text-gray-500 mt-1 font-normal">{help}</p>}</label>;
}

function getImages(business: BusinessRow) { if (Array.isArray(business.image_urls) && business.image_urls.length > 0) return business.image_urls; return business.image ? [business.image] : []; }
function formatError(error: any) { if (!error) return "Unknown error."; return [error.message, error.details, error.hint, error.code].filter(Boolean).join(" | ") || String(error); }
function siteOrigin() { return typeof window !== "undefined" ? window.location.origin : "https://seattledesitv.com"; }
function safeExternalUrl(value?: string | null) { return value && validateOptionalUrl(value, "Website").ok ? normalizeUrl(value) : ""; }
function normalizePhone(value: string) { const trimmed = String(value || "").trim(); const digits = trimmed.replace(/\D/g, ""); if (digits.length === 10) return `+1${digits}`; if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`; if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`; return trimmed; }
function profileContact(profile: any, u: any) { return { name: profile?.preferred_name || profile?.full_name || u?.user_metadata?.full_name || u?.user_metadata?.name || "", email: profile?.email || u?.email || "", phone: normalizePhone(profile?.phone || "") }; }

async function uploadFileToCloudinary(file: File) {
  const validation = validateOptionalImageFile(file, "Business image", 5);
  if (!validation.ok) throw new Error(validation.message);
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary is not configured.");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "seattle-desi-tv/businesses");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || `Cloudinary upload failed with status ${response.status}`);
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
  const [form, setForm] = useState({ name: "", address: "", website: "", category: "", discount: "", offer: "", pocName: "", pocEmail: "", pocPhone: "" });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitMessage, setSubmitMessage] = useState("");
  const [adminReviewLink, setAdminReviewLink] = useState("");
  const [saving, setSaving] = useState(false);
  const isTeamMember = Boolean(user && roleCanRequestCrew(userRole));

  async function loadBusinesses() {
    setMessage("Loading approved businesses...");
    const { data, error } = await supabase.from("local_businesses").select("id,name,address,website,category,discount,offer,image,image_urls,status,created_at").eq("status", "approved").order("created_at", { ascending: false });
    if (error) { setBusinesses([]); setMessage(`Could not load businesses: ${error.message}`); return; }
    setBusinesses(data || []);
    setMessage((data || []).length ? `Showing ${(data || []).length} approved business(es).` : "No approved businesses found.");
  }

  async function loadUserContext(currentUser: any) {
    if (!currentUser) { setUserRole("general_public"); setBaseProfile(null); setUseProfilePoc(false); setForm((current) => ({ ...current, pocName: "", pocEmail: "", pocPhone: "" })); return; }
    const role = await resolveUserRole(supabase, currentUser);
    setUserRole(role);
    const { data: profile } = await supabase.from("user_profiles").select("full_name,preferred_name,email,phone").eq("user_id", currentUser.id).maybeSingle();
    setBaseProfile(profile || null);
    const contact = profileContact(profile, currentUser);
    const team = roleCanRequestCrew(role);
    setUseProfilePoc(!team);
    setForm((current) => team ? { ...current, pocName: "", pocEmail: "", pocPhone: "" } : { ...current, pocName: contact.name, pocEmail: contact.email, pocPhone: contact.phone });
  }

  async function signOut() { await supabase.auth.signOut(); setUser(null); }
  function toggleProfilePoc(checked: boolean) { setUseProfilePoc(checked); if (checked) { const contact = profileContact(baseProfile, user); setForm((current) => ({ ...current, pocName: contact.name, pocEmail: contact.email, pocPhone: contact.phone })); } else { setForm((current) => ({ ...current, pocName: "", pocEmail: "", pocPhone: "" })); } }
  function openAdminEmail(id: string, businessName: string, businessAddress: string) { const reviewLink = `${siteOrigin()}/studio/businesses`; const directLink = `${siteOrigin()}/studio/businesses/${id}`; setAdminReviewLink(reviewLink); const subject = `New SDTV business submitted: ${businessName}`; const body = ["A new business has been submitted for Seattle Desi TV review.", "", `Business: ${businessName}`, `Address: ${businessAddress}`, `Submitted by: ${user?.email || "unknown"}`, "", `Open business review page: ${reviewLink}`, `Direct edit link: ${directLink}`].join("\n"); window.open(`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank"); }
  async function notifyAdmin(id: string, businessName: string, businessAddress: string) { const reviewLink = `${siteOrigin()}/studio/businesses`; const directLink = `${siteOrigin()}/studio/businesses/${id}`; setAdminReviewLink(reviewLink); try { const response = await fetch("/api/notify-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "business", title: businessName, location: businessAddress, submittedBy: user?.email || "unknown", reviewUrl: reviewLink, directUrl: directLink }) }); const result = await response.json().catch(() => null); if (!response.ok || !result?.ok) throw new Error(result?.error || "Admin email API did not confirm success."); return true; } catch { openAdminEmail(id, businessName, businessAddress); return false; } }

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
      validateOptionalImageFile(imageFiles[0], "Business image / logo", 5)
    );
  }

  async function submitBusiness() {
    setSubmitMessage(""); setAdminReviewLink("");
    if (!user?.id) { setSubmitMessage("Please login before submitting a business."); return; }
    const validationError = validateBusinessForm();
    if (validationError) { setSubmitMessage(validationError); return; }
    setSaving(true);
    try {
      const imageUrl = imageFiles[0] ? await uploadFileToCloudinary(imageFiles[0]) : "";
      const businessPayload: any = { name: form.name.trim(), address: form.address.trim(), website: safeExternalUrl(form.website) || null, category: form.category.trim() || null, discount: form.discount.trim() || null, offer: form.offer.trim() || null, poc_name: form.pocName.trim(), poc_email: form.pocEmail.trim(), poc_phone: normalizePhone(form.pocPhone), image: imageUrl || null, created_by: user.id, status: "pending", approved: false };
      const { data, error } = await supabase.from("local_businesses").insert(businessPayload).select("id,name,address").single();
      if (error) throw error;
      const insertedBusiness = data as InsertedBusiness | null;
      const sent = insertedBusiness ? await notifyAdmin(insertedBusiness.id, insertedBusiness.name, insertedBusiness.address) : false;
      setForm({ name: "", address: "", website: "", category: "", discount: "", offer: "", pocName: "", pocEmail: "", pocPhone: "" });
      setImageFiles([]);
      setShowSubmitForm(false);
      setSubmitMessage(sent ? "Business submitted successfully. It will appear after admin approval. Admin notification email was sent." : "Business submitted successfully. It will appear after admin approval. Automatic email failed, so an admin email window was opened as backup.");
      await loadBusinesses();
    } catch (error: any) { setSubmitMessage(`Could not submit business: ${formatError(error)}`); } finally { setSaving(false); }
  }

  useEffect(() => { async function init() { const { data } = await supabase.auth.getUser(); const currentUser = data?.user || null; setUser(currentUser); await loadUserContext(currentUser); setAuthChecked(true); await loadBusinesses(); } init(); const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => { const nextUser = session?.user || null; setUser(nextUser); await loadUserContext(nextUser); }); return () => listener.subscription.unsubscribe(); }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-[#081024]"><SiteHeader /><section className="px-6 md:px-14 py-10"><div className="max-w-7xl mx-auto"><div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"><div><p className="text-pink-600 font-black uppercase tracking-wide">Seattle Desi Marketplace</p><h1 className="text-4xl md:text-5xl font-black mt-2">Local Business Directory</h1><p className="text-gray-500 mt-2">Approved Seattle Desi TV local business listings.</p><p className="text-sm text-gray-500 mt-2">{message}</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setShowSubmitForm((value) => !value)} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold">{showSubmitForm ? "Hide Add Business" : "Add Business"}</button><button type="button" onClick={loadBusinesses} className="border border-pink-600 text-pink-600 px-5 py-3 rounded-xl font-bold bg-white">Refresh Businesses</button></div></div>

      {submitMessage && <div className="mb-6 rounded-2xl border bg-white p-4 text-sm font-bold text-orange-700 whitespace-pre-line">{submitMessage}{adminReviewLink && <a href={adminReviewLink} target="_blank" rel="noreferrer" className="block text-pink-600 mt-2">Admin business review page</a>}</div>}

      {showSubmitForm && <section className="mb-8 border rounded-3xl p-6 shadow-sm bg-white"><div className="flex items-start justify-between gap-4 mb-5"><div><h2 className="text-2xl font-black">Add Business</h2><p className="text-sm text-gray-500 mt-1">This form is only for new submissions. Listings appear after admin approval.</p></div><button type="button" onClick={() => setShowSubmitForm(false)} className="text-sm font-black text-gray-500">Collapse</button></div>{!authChecked ? <p className="text-gray-500">Checking login...</p> : user ? <div><div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-5 text-sm">Logged in as <b>{user.email}</b><span className="ml-2 text-xs text-green-700">{userRole}</span><button type="button" onClick={signOut} className="block mt-2 text-red-600 font-bold">Logout</button></div><div className="grid md:grid-cols-2 gap-4"><Field label="Business name" required><input className="w-full border rounded-lg p-3 mt-1" placeholder="Example: Tanishq Seattle" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Business address" required><input className="w-full border rounded-lg p-3 mt-1" placeholder="Street, city, state" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field><Field label="Website" help="Optional. Include full website or social URL."><input className="w-full border rounded-lg p-3 mt-1" placeholder="https://example.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field><Field label="Category"><input className="w-full border rounded-lg p-3 mt-1" placeholder="Restaurant, beauty, legal, finance..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field><Field label="Discount / special offer"><input className="w-full border rounded-lg p-3 mt-1" placeholder="Example: 10% off for SDTV viewers" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field><div className="md:col-span-2 rounded-2xl border bg-slate-50 p-4"><label className="flex items-start gap-3 text-sm font-black"><input type="checkbox" checked={useProfilePoc} onChange={(e) => toggleProfilePoc(e.target.checked)} className="mt-1" /><span>{isTeamMember ? "Use my SDTV Base Profile as the Business POC" : "Use my contact information as the Business POC"}</span></label><p className="mt-2 text-xs text-slate-500">{useProfilePoc ? "✓ Using your SDTV Base Profile. You can edit below if needed." : "Using custom Business POC details. Team members are left blank by default so you can enter the actual business representative."}</p></div><Field label="Business contact name" required><input className="w-full border rounded-lg p-3 mt-1" placeholder="Point of contact" value={form.pocName} onChange={(e) => setForm({ ...form, pocName: e.target.value })} /></Field><Field label="Business contact email" required help="Used by SDTV if follow-up is needed."><input className="w-full border rounded-lg p-3 mt-1" placeholder="contact@example.com" type="email" value={form.pocEmail} onChange={(e) => setForm({ ...form, pocEmail: e.target.value })} /></Field><Field label="Business contact phone" required><input className="w-full border rounded-lg p-3 mt-1" placeholder="+14255551234" value={form.pocPhone} onBlur={() => setForm({ ...form, pocPhone: normalizePhone(form.pocPhone) })} onChange={(e) => setForm({ ...form, pocPhone: e.target.value })} /></Field><div className="md:col-span-2"><Field label="Offer / description"><textarea className="w-full border rounded-lg p-3 mt-1 min-h-24" placeholder="Tell viewers what this business offers." value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} /></Field></div><div className="md:col-span-2"><Field label="Upload business image / logo" help="Image must be JPG/PNG/WebP/GIF and 5MB or smaller."><input className="w-full border rounded-lg p-3 mt-1" type="file" accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} /></Field></div></div>{submitMessage && <p className="text-sm text-orange-600 my-4 whitespace-pre-line">{submitMessage}</p>}<button type="button" onClick={submitBusiness} disabled={saving} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full disabled:opacity-60 mt-5">{saving ? "Saving Business..." : "Submit Business for Approval"}</button></div> : <div><h3 className="text-xl font-black mb-3">Login to Add Business</h3><p className="text-sm text-gray-500 mb-4">You can browse businesses without login. Login is only required to submit a new business.</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold">Login to continue</a></div>}</section>}

      <section>{businesses.length === 0 ? <div className="border rounded-2xl p-8 text-gray-500 bg-white">{message}</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{businesses.map((business) => { const imgs = getImages(business); return <article key={business.id} className="border rounded-2xl overflow-hidden shadow-sm bg-white">{imgs.length > 0 ? <SafeImage src={imgs[0]} alt={business.name} className="w-full h-56 object-cover bg-gray-100" fallbackClassName="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black" fallbackLabel="Seattle Desi TV" widthHint={900} /> : <div className="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}<div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">{business.name}</h2><p className="text-gray-500 mt-1">{business.address}</p></div>{business.category && <span className="text-xs font-black bg-pink-50 text-pink-700 px-3 py-1 rounded-full">{business.category}</span>}</div>{business.discount && <p className="mt-3 text-sm font-black text-green-700">{business.discount}</p>}{business.offer && <p className="mt-3 text-sm text-gray-600 whitespace-pre-line">{business.offer}</p>}<div className="flex flex-wrap gap-3 mt-5">{business.website && <CheckedExternalLink href={business.website} notFoundMessage="Page not found. This business link is not available." className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">Website</CheckedExternalLink>}<a href={`https://www.google.com/maps?q=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">Map</a></div></div></article>; })}</div>}</section>
    </div></section><SiteFooter /></main>
  );
}
