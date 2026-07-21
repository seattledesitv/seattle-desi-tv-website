"use client";

import { useMemo, useState } from "react";
import StudioHeader from "../../../components/StudioHeader";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export default function CloudinaryDebugPage() {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const uploadUrl = useMemo(() => cloudName ? `https://api.cloudinary.com/v1_1/${cloudName}/image/upload` : "", []);

  async function runTest() {
    setTesting(true);
    setStatus("idle");
    setHttpStatus(null);
    setResult(null);

    if (!cloudName || !uploadPreset) {
      setStatus("error");
      setResult({ error: "Cloudinary environment variables are missing from this deployment." });
      setTesting(false);
      return;
    }

    try {
      // A valid 1×1 transparent PNG. This creates a very small diagnostic asset in Cloudinary.
      const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      const file = base64ToBlob(pngBase64, "image/png");
      const formData = new FormData();
      formData.append("file", file, `sdtv-cloudinary-test-${Date.now()}.png`);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "sdtv-diagnostics");
      formData.append("tags", "sdtv-diagnostics,environment-test");

      const response = await fetch(uploadUrl, { method: "POST", body: formData });
      const body = await response.json().catch(() => ({ error: { message: "Cloudinary returned a non-JSON response." } }));
      setHttpStatus(response.status);
      setResult(body);
      setStatus(response.ok ? "success" : "error");
    } catch (error: any) {
      setStatus("error");
      setResult({ error: { message: error?.message || "Failed to reach Cloudinary." } });
    } finally {
      setTesting(false);
    }
  }

  const errorMessage = result?.error?.message || result?.error || "";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-pink-300">Studio · System Diagnostics</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Cloudinary Diagnostics</h1>
          <p className="mt-3 max-w-3xl text-slate-300">Checks the public Cloudinary values embedded in this exact deployment and performs an isolated one-pixel test upload. It does not change the event form or any other website functionality.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Cloud Name</p>
            <p className="mt-2 break-all text-2xl font-black">{cloudName || "Missing"}</p>
            <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${cloudName ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{cloudName ? "Present in deployment" : "Not available"}</p>
          </section>

          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Upload Preset</p>
            <p className="mt-2 break-all text-2xl font-black">{uploadPreset || "Missing"}</p>
            <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${uploadPreset ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{uploadPreset ? "Present in deployment" : "Not available"}</p>
          </section>
        </div>

        <section className="mt-5 rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Resolved Upload URL</p>
          <p className="mt-2 break-all rounded-2xl bg-slate-100 p-4 font-mono text-sm">{uploadUrl || "Cannot build URL because the cloud name is missing."}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={runTest} disabled={testing || !cloudName || !uploadPreset} className="rounded-xl bg-pink-600 px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{testing ? "Testing Upload..." : "Run Test Upload"}</button>
            <p className="text-sm text-slate-500">Creates one tiny PNG in the <strong>sdtv-diagnostics</strong> folder.</p>
          </div>
        </section>

        {status !== "idle" && (
          <section className={`mt-5 rounded-3xl border-2 p-6 shadow-2xl ${status === "success" ? "border-green-300 bg-green-50 text-green-950" : "border-red-300 bg-red-50 text-red-950"}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide">Test Result</p>
                <h2 className="mt-1 text-3xl font-black">{status === "success" ? "Upload Successful" : "Upload Failed"}</h2>
              </div>
              {httpStatus !== null && <div className="rounded-full bg-white px-4 py-2 text-sm font-black">HTTP {httpStatus}</div>}
            </div>

            {status === "success" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Public ID</p><p className="mt-2 break-all font-bold">{result?.public_id || "—"}</p></div>
                <div className="rounded-2xl bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">Bytes</p><p className="mt-2 font-bold">{result?.bytes ?? "—"}</p></div>
                <div className="rounded-2xl bg-white p-4 md:col-span-2"><p className="text-xs font-black uppercase text-slate-500">Secure URL</p><p className="mt-2 break-all font-bold">{result?.secure_url || "—"}</p></div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-white p-5">
                <p className="text-xs font-black uppercase text-slate-500">Cloudinary / Browser Error</p>
                <p className="mt-2 break-words text-lg font-bold">{errorMessage || "No error message was returned."}</p>
              </div>
            )}

            <details className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
              <summary className="cursor-pointer font-black">Raw response</summary>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </section>
        )}
      </section>
    </main>
  );
}
