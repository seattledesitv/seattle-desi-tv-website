"use client";

/* eslint-disable @next/next/no-img-element -- previews administrator-selected public press release media */
import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import {
  buildPressReleaseInstagramCaption,
  publishPressReleaseToInstagram,
} from "../../lib/pressReleases/services/pressReleaseInstagramService";
import type { PressRelease } from "../../lib/pressReleases/types";

export default function PressReleaseInstagramPublisher({ release }: { release: PressRelease }) {
  const availableImages = useMemo(
    () => release.image_urls.filter((url) => /^https:\/\//i.test(url)),
    [release.image_urls],
  );
  const [selectedImages, setSelectedImages] = useState(() => availableImages.slice(0, 10));
  const [caption, setCaption] = useState(() => buildPressReleaseInstagramCaption(release));
  const [approvedSignature, setApprovedSignature] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const signature = `${selectedImages.join("|")}::${caption}`;
  const approved = Boolean(signature && approvedSignature === signature);

  function toggleImage(url: string) {
    setApprovedSignature("");
    setMessage("");
    setSelectedImages((current) => {
      if (current.includes(url)) return current.filter((item) => item !== url);
      if (current.length >= 10) return current;
      return [...current, url];
    });
  }

  async function publish() {
    setPublishing(true);
    setMessage("");
    try {
      const result = await publishPressReleaseToInstagram(
        getSupabaseBrowserClient(),
        release,
        selectedImages,
        caption,
      );
      setMessage(result.permalink ? `Published successfully: ${result.permalink}` : result.message);
      setApprovedSignature("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish this press release to Instagram.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <details className="mt-4 rounded-2xl border border-pink-200 bg-pink-50/50 p-4">
      <summary className="cursor-pointer font-black text-pink-800">Publish to Instagram</summary>
      {!availableImages.length ? (
        <p className="mt-4 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-900">
          Add at least one public press release image before publishing to Instagram.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black">Select up to 10 images</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {availableImages.map((url, index) => {
                const selected = selectedImages.includes(url);
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => toggleImage(url)}
                    className={`overflow-hidden rounded-xl border-2 text-left ${selected ? "border-pink-600" : "border-transparent opacity-60"}`}
                  >
                    <img src={url} alt={`${release.title} image ${index + 1}`} className="aspect-[4/5] w-full bg-slate-100 object-cover" />
                    <span className="block bg-white px-3 py-2 text-xs font-black">
                      {selected ? `Selected · Slide ${selectedImages.indexOf(url) + 1}` : "Not selected"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black">Final editable caption</p>
              <button
                type="button"
                onClick={() => {
                  setCaption(buildPressReleaseInstagramCaption(release));
                  setApprovedSignature("");
                }}
                className="rounded-lg border bg-white px-3 py-2 text-xs font-black"
              >
                Reset caption
              </button>
            </div>
            <textarea
              value={caption}
              maxLength={2200}
              rows={12}
              onChange={(event) => {
                setCaption(event.target.value);
                setApprovedSignature("");
                setMessage("");
              }}
              className="mt-3 w-full rounded-xl border bg-white p-3 text-sm"
            />
            <p className="mt-1 text-right text-xs font-bold text-slate-500">{caption.length} / 2,200</p>
            {!approved ? (
              <button
                type="button"
                disabled={!selectedImages.length || !caption.trim()}
                onClick={() => setApprovedSignature(signature)}
                className="mt-4 w-full rounded-xl border-2 border-emerald-700 bg-white px-5 py-3 font-black text-emerald-800 disabled:opacity-40"
              >
                Everything looks good
              </button>
            ) : (
              <p className="mt-4 rounded-xl bg-emerald-100 p-3 text-center font-black text-emerald-900">
                ✓ Images and caption approved
              </p>
            )}
            <button
              type="button"
              disabled={!approved || publishing}
              onClick={() => void publish()}
              className="mt-3 w-full rounded-xl bg-pink-700 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {publishing ? "Publishing to Instagram…" : "Publish press release to Instagram"}
            </button>
            {message && <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-700">{message}</p>}
          </div>
        </div>
      )}
    </details>
  );
}
