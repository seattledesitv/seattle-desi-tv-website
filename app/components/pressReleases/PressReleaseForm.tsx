"use client";
/* eslint-disable @next/next/no-img-element -- local upload previews use generated public URLs */
import { useState } from "react";
import DirectoryImageCropper, {
  type DirectoryImageCrop,
} from "../DirectoryImageCropper";
import type {
  PressRelease,
  PressReleaseDocument,
  PressReleaseInput,
  PressReleaseStatus,
} from "../../lib/pressReleases/types";
import { useCurrentSite } from "../../lib/sites/SiteContext";

const blank = (city: string): PressReleaseInput => ({
  title: "",
  summary: "",
  body: "",
  organization_name: "",
  location: `${city} Area`,
  release_date: new Date().toISOString().slice(0, 10),
  image_urls: [],
  image_position_x: 50,
  image_position_y: 50,
  image_zoom: 1,
  image_display_mode: "cover",
  documents: [],
  contact_name: "",
  contact_email: "",
  source_url: "",
});

function inputFromRelease(
  release: PressRelease | null | undefined,
  city: string,
): PressReleaseInput {
  if (!release) return blank(city);
  return {
    title: release.title,
    summary: release.summary,
    body: release.body,
    organization_name: release.organization_name,
    location: release.location,
    release_date: release.release_date,
    image_urls: [...release.image_urls],
    image_position_x: release.image_position_x ?? 50,
    image_position_y: release.image_position_y ?? 50,
    image_zoom: release.image_zoom ?? 1,
    image_display_mode: release.image_display_mode ?? "cover",
    documents: [...(release.documents || [])],
    contact_name: release.contact_name,
    contact_email: release.contact_email,
    source_url: release.source_url,
  };
}

export default function PressReleaseForm({
  saving,
  error,
  admin = false,
  initialRelease,
  onCreate,
  onUpdate,
  onUpload,
  onCancel,
}: {
  saving: boolean;
  error: string;
  admin?: boolean;
  initialRelease?: PressRelease | null;
  onCreate: (
    input: PressReleaseInput,
    status?: PressReleaseStatus,
  ) => Promise<unknown>;
  onUpdate?: (id: string, input: PressReleaseInput) => Promise<unknown>;
  onUpload: (file: File) => Promise<string>;
  onCancel?: () => void;
}) {
  const site = useCurrentSite();
  const [form, setForm] = useState(() =>
    inputFromRelease(initialRelease, site.city),
  );
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [publishNow, setPublishNow] = useState(admin);
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const editing = Boolean(initialRelease);
  const set = (field: keyof PressReleaseInput, value: unknown) =>
    setForm((current) => ({ ...current, [field]: value }));
  const crop: DirectoryImageCrop = {
    x: form.image_position_x,
    y: form.image_position_y,
    zoom: form.image_zoom,
    mode: form.image_display_mode,
  };
  const setCrop = (value: DirectoryImageCrop) =>
    setForm((current) => ({
      ...current,
      image_position_x: value.x,
      image_position_y: value.y,
      image_zoom: value.zoom,
      image_display_mode: value.mode || "cover",
    }));
  async function files(selected: FileList | null) {
    if (!selected) return;
    setUploading(true);
    setMessage("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(selected).slice(
        0,
        12 - form.image_urls.length,
      ))
        urls.push(await onUpload(file));
      set("image_urls", [...form.image_urls, ...urls]);
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Images could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function documents(selected: FileList | null) {
    if (!selected) return;
    setUploading(true);
    setMessage("");
    try {
      const uploaded: PressReleaseDocument[] = [];
      for (const file of Array.from(selected).slice(
        0,
        6 - form.documents.length,
      )) {
        uploaded.push({
          url: await onUpload(file),
          name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        });
      }
      set("documents", [...form.documents, ...uploaded]);
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Documents could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function submit() {
    setMessage("");
    try {
      let payload = form;
      if (primaryFile) {
        setUploading(true);
        const url = await onUpload(primaryFile);
        payload = {
          ...payload,
          image_urls: [
            url,
            ...payload.image_urls.filter((item) => item !== url),
          ],
        };
      }
      if (initialRelease && onUpdate) {
        await onUpdate(initialRelease.id, payload);
        setMessage(
          admin
            ? "Press release changes saved."
            : "Changes saved and returned to SDTV for review.",
        );
      } else {
        await onCreate(payload, admin && publishNow ? "approved" : "pending");
        setForm(blank(site.city));
        setMessage(
          admin && publishNow
            ? "Press release published."
            : `Press release submitted for ${site.shortName} review.`,
        );
      }
      setPrimaryFile(null);
    } catch {
    } finally {
      setUploading(false);
    }
  }
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-1 font-bold md:col-span-2">
          Title *
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="grid gap-1 font-bold md:col-span-2">
          Short summary *
          <textarea
            value={form.summary}
            maxLength={600}
            onChange={(e) => set("summary", e.target.value)}
            className="min-h-24 rounded-xl border p-3 font-normal"
          />
          <span className="text-xs font-normal text-slate-500">
            {form.summary.length}/600 characters
          </span>
        </label>
        <label className="grid gap-1 font-bold md:col-span-2">
          Full press release *
          <textarea
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            className="min-h-80 rounded-xl border p-4 font-normal leading-7"
            placeholder="Paste or write the complete press release here..."
          />
        </label>
        <label className="grid gap-1 font-bold">
          Organization
          <input
            value={form.organization_name || ""}
            onChange={(e) => set("organization_name", e.target.value)}
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="grid gap-1 font-bold">
          Release date
          <input
            type="date"
            value={form.release_date}
            onChange={(e) => set("release_date", e.target.value)}
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="grid gap-1 font-bold">
          Location
          <input
            value={form.location || ""}
            onChange={(e) => set("location", e.target.value)}
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="grid gap-1 font-bold">
          Source URL
          <input
            type="url"
            value={form.source_url || ""}
            onChange={(e) => set("source_url", e.target.value)}
            placeholder="https://..."
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="grid gap-1 font-bold">
          Media contact
          <input
            value={form.contact_name || ""}
            onChange={(e) => set("contact_name", e.target.value)}
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="grid gap-1 font-bold">
          Contact email
          <input
            type="email"
            value={form.contact_email || ""}
            onChange={(e) => set("contact_email", e.target.value)}
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="grid gap-2 font-bold md:col-span-2">
          Images (up to 12)
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => void files(e.target.files)}
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        {form.image_urls.length > 0 && (
          <div className="md:col-span-2">
            <p className="mb-3 text-sm font-bold text-slate-600">
              The first image is used on cards. Select any image as primary,
              remove it, or adjust the visible area below.
            </p>
            <div className="flex flex-wrap gap-3">
              {form.image_urls.map((url, index) => (
                <div
                  key={url}
                  className={`relative rounded-xl border-2 p-1 ${index === 0 ? "border-pink-600" : "border-transparent"}`}
                >
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="h-24 w-32 rounded-lg object-cover"
                  />
                  <div className="mt-1 flex gap-1">
                    {index === 0 ? (
                      <span className="rounded-md bg-pink-50 px-2 py-1 text-xs font-black text-pink-700">
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          set("image_urls", [
                            url,
                            ...form.image_urls.filter((item) => item !== url),
                          ])
                        }
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black"
                      >
                        Make primary
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove image ${index + 1}`}
                      onClick={() =>
                        set(
                          "image_urls",
                          form.image_urls.filter((item) => item !== url),
                        )
                      }
                      className="rounded-md bg-slate-950 px-2 py-1 text-xs font-black text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="md:col-span-2">
          <DirectoryImageCropper
            src={form.image_urls[0]}
            value={crop}
            onChange={setCrop}
            onFileChange={setPrimaryFile}
            label={
              form.image_urls[0]
                ? "Replace primary image and choose its visible card area"
                : "Upload primary image and choose its visible card area"
            }
          />
        </div>
        <label className="grid gap-2 font-bold md:col-span-2">
          Documents (up to 6 PDFs or Word files, 20 MB each)
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => void documents(e.target.files)}
            className="rounded-xl border p-3 font-normal"
          />
        </label>
        {form.documents.length > 0 && (
          <div className="grid gap-2 md:col-span-2">
            {form.documents.map((document, index) => (
              <div
                key={document.url}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{document.name}</p>
                  <p className="text-xs text-slate-500">
                    {(document.size_bytes / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove document ${index + 1}`}
                  onClick={() =>
                    set(
                      "documents",
                      form.documents.filter(
                        (item) => item.url !== document.url,
                      ),
                    )
                  }
                  className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {admin && !editing && (
          <label className="flex items-center gap-3 rounded-xl bg-pink-50 p-4 font-bold md:col-span-2">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            Publish immediately (otherwise send to moderation queue)
          </label>
        )}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={saving || uploading}
          onClick={() => void submit()}
          className="flex-1 rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:opacity-60"
        >
          {uploading
            ? "Uploading files..."
            : saving
              ? "Saving..."
              : editing
                ? admin
                  ? "Save Press Release"
                  : "Save Changes for Review"
                : admin && publishNow
                  ? "Publish Press Release"
                  : "Submit for Review"}
        </button>
        {editing && onCancel && (
          <button
            type="button"
            disabled={saving || uploading}
            onClick={onCancel}
            className="rounded-xl border px-6 py-4 font-black"
          >
            Cancel Editing
          </button>
        )}
      </div>
      {(error || message) && (
        <p
          className={`mt-4 rounded-xl p-4 font-bold ${error ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"}`}
        >
          {error || message}
        </p>
      )}
    </section>
  );
}
