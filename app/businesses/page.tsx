"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
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

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [message, setMessage] = useState("Loading approved businesses...");

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

  useEffect(() => {
    loadBusinesses();
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#081024] px-6 md:px-14 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-sm font-bold text-pink-600">← Back to Seattle Desi TV</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Local Business Directory</h1>
            <p className="text-gray-500 mt-2">Approved Seattle Desi TV local business listings.</p>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
          </div>

          <button
            type="button"
            onClick={loadBusinesses}
            className="border border-pink-600 text-pink-600 px-5 py-3 rounded-xl font-bold bg-white"
          >
            Refresh Businesses
          </button>
        </div>

        {businesses.length === 0 ? (
          <div className="border rounded-2xl p-8 text-gray-500 bg-gray-50">{message}</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {businesses.map((business) => {
              const images = getImages(business);
              const website = business.website?.startsWith("http") ? business.website : business.website ? `https://${business.website}` : "";

              return (
                <article key={business.id} className="border rounded-2xl overflow-hidden shadow-sm bg-white">
                  {images.length > 0 ? (
                    <img src={images[0]} alt={business.name} className="w-full h-56 object-cover bg-gray-100" />
                  ) : (
                    <div className="w-full h-56 bg-pink-50 grid place-items-center text-pink-600 font-black">
                      Seattle Desi TV
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-xl font-black">{business.name}</h2>
                      {business.category && <span className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-bold uppercase">{business.category}</span>}
                    </div>
                    <p className="text-gray-500 mt-2">{business.address}</p>
                    {business.discount && <p className="mt-3 text-sm font-bold text-green-700">Discount: {business.discount}</p>}
                    {business.offer && <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">{business.offer}</p>}

                    <div className="flex flex-wrap gap-3 mt-5">
                      {website && (
                        <a href={website} target="_blank" rel="noreferrer" className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                          Visit Website
                        </a>
                      )}
                      {business.address && (
                        <a href={`https://www.google.com/maps?q=${encodeURIComponent(business.address)}`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-bold text-sm">
                          Map
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
