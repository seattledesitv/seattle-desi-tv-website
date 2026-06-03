"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "seattledesitv@gmail.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

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
};

function getImages(business: BusinessRow) {
  if (Array.isArray(business.image_urls) && business.image_urls.length > 0) return business.image_urls;
  return business.image ? [business.image] : [];
}

function formatError(error: any) {
  if (!error) return "Unknown error.";
  const parts = [error.message, error.details, error.hint, error.code].filter(Boolean);
  return parts.join(" | ") || String(error);
}

async function uploadFileToCloudinary(file: File) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in Vercel Environment Variables.");
  }

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
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [discount, setDiscount] = useState("");
  const [offer, setOffer] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitMessage, setSubmitMessage] = useState("");
  const [adminReviewLink, setAdminReviewLink] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadBusinesses() {
    setMessage("Loading approved businesses...");
    const { data, error } = await supabase
      .from("local_businesses")
      .select("id,name,address,website,category,discount,offer,image,image_urls,status,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Businesses load error", error);
      setBusinesses([]);
      setMessage(`Could not load businesses: ${error.message}`);
      return;
    }

    setBusinesses(data || []);
    setMessage((data || []).length ? `Showing ${(data || []).length} approved business(es).` : "No approved businesses found.");
  }

  async function signIn() {
    setAuthMessage("");
    if (!email || !password) {
      setAuthMessage("Please enter email and password.");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(formatError(error));
      return;
    }
    setUser(data.user || null);
    setPassword("");
    setAuthMessage("Logged in successfully.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setAuthMessage("Logged out.");
  }

  function siteOrigin() {
    return typeof window !== "undefined" ? window.location.origin : "https://seattledesitv.com";
  }

  function buildAdminReviewLink() {
    return `${siteOrigin()}/studio/businesses`;
  }

  function buildDirectBusinessLink(id: string) {
    return `${siteOrigin()}/studio/businesses/${id}`;
  }

  function openAdminEmail(id: string, businessName: string, businessAddress: string) {
    const reviewLink = buildAdminReviewLink();
    const directLink = buildDirectBusinessLink(id);
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

    const mailtoUrl = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
  }

  async function notifyAdmin(id: string, businessName: string, businessAddress: string) {
    const reviewLink = buildAdminReviewLink();
    const directLink = buildDirectBusinessLink(id);
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
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Admin email API did not confirm success.");
      return true;
    } catch (error) {
      console.warn("Business admin notification failed, opening email fallback.", error);
      openAdminEmail(id, businessName, businessAddress);
      return false;
    }
  }

  async function submitBusiness() {
    setSubmitMessage("");
    setAdminReviewLink("");

    if (!user?.id) {
      setSubmitMessage("Please login before submitting a business.");
      return;
    }
    if (!name || !address) {
      setSubmitMessage("Please enter business name and address.");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = "";
      if (imageFiles.length > 0) imageUrl = await uploadFileToCloudinary(imageFiles[0]);

      const businessPayload = {
        name,
        address,
        website: website || null,
        category: category || null,
        discount: discount || null,
        offer: offer || null,
        poc_name: pocName || null,
        poc_email: pocEmail || user.email || null,
        poc_phone: pocPhone || null,
        image: imageUrl || null,
        created_by: user.id,
        status: "pending",
        approved: false,
      };

      const { data, error: insertError } = await supabase
        .from("local_businesses")
        .insert(businessPayload)
        .select("id,name,address")
        .single();

      if (insertError) throw insertError;

      setName("");
      setAddress("");
      setWebsite("");
      setCategory("");
      setDiscount("");
      setOffer("");
      setPocName("");
      setPocEmail("");
      setPocPhone("");
      setImageFiles([]);

      let notificationSent = false;
      if (data?.id) notificationSent = await notifyAdmin(data.id, data.name, data.address);

      setSubmitMessage(notificationSent
        ? "Business submitted successfully. It will appear after admin approval. Admin notification email was sent."
        : "Business submitted successfully. It will appear after admin approval. Automatic email failed, so an admin email window was opened as backup."
      );
      await loadBusinesses();
    } catch (error: any) {
      console.error("Business submit error", error);
      setSubmitMessage(`Could not submit business: ${formatError(error)}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setAuthChecked(true);
      await loadBusinesses();
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#081024] px-6 md:px-14 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-sm font-bold text-pink-600">← Back to Seattle Desi TV</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Local Business Directory</h1>
            <p className="text-gray-500 mt-2">Approved Seattle Desi TV local business listings. Login to submit a business.</p>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
          </div>
          <button type="button" onClick={loadBusinesses} className="border border-pink-600 text-pink-600 px-5 py-3 rounded-xl font-bold bg-white">Refresh Businesses</button>
        </div>

        <section className="grid lg:grid-cols-[420px_1fr] gap-8 items-start">
          <aside className="border rounded-2xl p-6 shadow-sm bg-white">
            {!authChecked ? <p className="text-gray-500">Checking login...</p> : user ? (
              <div>
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-5 text-sm">
                  Logged in as <b>{user.email}</b>
                  <button type="button" onClick={signOut} className="block mt-2 text-red-600 font-bold">Logout</button>
                </div>
                <h2 className="text-2xl font-black mb-4">Add New Business</h2>
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Business name" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Discount" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                <textarea className="w-full border rounded-lg p-3 mb-3 min-h-24" placeholder="Offer / description" value={offer} onChange={(e) => setOffer(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC name" value={pocName} onChange={(e) => setPocName(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC email" type="email" value={pocEmail} onChange={(e) => setPocEmail(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="POC phone" value={pocPhone} onChange={(e) => setPocPhone(e.target.value)} />
                <label className="block text-sm font-bold mb-2">Upload business image / logo</label>
                <input className="w-full border rounded-lg p-3 mb-3" type="file" accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} />
                {submitMessage && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{submitMessage}</p>}
                {adminReviewLink && <a href={adminReviewLink} target="_blank" rel="noreferrer" className="block text-sm text-pink-600 font-bold mb-3">Admin business review page</a>}
                <button type="button" onClick={submitBusiness} disabled={saving} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full disabled:opacity-60">{saving ? "Saving Business..." : "Submit Business for Approval"}</button>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-black mb-3">Login to Add Business</h2>
                <p className="text-sm text-gray-500 mb-4">You can browse businesses without login. Login is only required to submit a new business.</p>
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="w-full border rounded-lg p-3 mb-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {authMessage && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{authMessage}</p>}
                <button type="button" onClick={signIn} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold w-full">Login</button>
              </div>
            )}
          </aside>

          <section>
            {businesses.length === 0 ? <div className="border rounded-2xl p-8 text-gray-500 bg-gray-50">{message}</div> : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {businesses.map((business) => {
                  const images = getImages(business);
                  const businessWebsite = business.website?.startsWith("http") ? business.website : business.website ? `https://${business.website}` : "";
                  return (
                    <article key={business.id} className="border rounded-2xl overflow-hidden shadow-sm bg-white">
                      {images.length > 0 ? <img src={images[0]} alt={business.name} className="w-full h-56 object-cover bg-gray-100" /> : <div className="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black">Seattle Desi TV</div>}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-black">{business.name}</h2>{business.category && <span className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-bold uppercase">{business.category}</span>}</div>
                        <p className="text-gray-500 mt-2">{business.address}</p>
                        {business.discount && <p className="mt-3 text-sm font-bold text-green-700">Discount: {business.discount}</p>}
                        {business.offer && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{business.offer}</p>}
                        <div className="flex flex-wrap gap-3 mt-5">
                          {businessWebsite && <a href={businessWebsite} target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Visit Website</a>}
                          {business.address && <a href={`https://www.google.com/maps?q=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">Map</a>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
