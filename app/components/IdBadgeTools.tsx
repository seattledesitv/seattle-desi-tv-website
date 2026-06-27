"use client";

import { useState } from "react";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function safeText(value?: string | null, fallback = "SDTV Team") {
  return String(value || fallback).trim() || fallback;
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function download(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function printImage(url: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html><head><title>SDTV ID Badge</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#f8fafc}img{max-width:95vw;max-height:95vh}</style></head><body><img src="${url}" /></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export default function IdBadgeTools({
  fullName,
  roleLabel,
  email,
  profilePhotoUrl,
  idBadgeUrl,
  onGenerated,
  compact = false,
}: {
  fullName?: string | null;
  roleLabel?: string | null;
  email?: string | null;
  profilePhotoUrl?: string | null;
  idBadgeUrl?: string | null;
  onGenerated: (url: string) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generateBadge() {
    setBusy(true);
    setMessage("Generating ID badge...");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1050;
      canvas.height = 650;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available.");

      const name = safeText(fullName, "SDTV Team Member");
      const role = safeText(roleLabel, "Team Member").toUpperCase();
      const mail = safeText(email, "seattledesitv.com");

      const gold = "#f6c453";
      const dark = "#050816";
      const pink = "#db2777";

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, canvas.width, 145);
      ctx.fillStyle = pink;
      ctx.fillRect(0, 145, canvas.width, 8);
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(0, 650);
      ctx.bezierCurveTo(240, 540, 380, 610, 590, 520);
      ctx.bezierCurveTo(770, 440, 910, 525, 1050, 420);
      ctx.lineTo(1050, 650);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 54px Arial";
      ctx.fillText("Seattle Desi TV", 54, 88);
      ctx.font = "800 22px Arial";
      ctx.fillText("OFFICIAL SDTV ID BADGE", 58, 123);

      const photo = await loadImage(profilePhotoUrl || "");
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(70, 205, 300, 300, 34);
      ctx.clip();
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(70, 205, 300, 300);
      if (photo) {
        const scale = Math.max(300 / photo.width, 300 / photo.height);
        const w = photo.width * scale;
        const h = photo.height * scale;
        ctx.drawImage(photo, 70 + (300 - w) / 2, 205 + (300 - h) / 2, w, h);
      } else {
        ctx.fillStyle = pink;
        ctx.font = "900 112px Arial";
        ctx.textAlign = "center";
        ctx.fillText(name.slice(0, 1).toUpperCase(), 220, 395);
        ctx.textAlign = "left";
      }
      ctx.restore();

      ctx.strokeStyle = gold;
      ctx.lineWidth = 8;
      ctx.roundRect(70, 205, 300, 300, 34);
      ctx.stroke();

      ctx.fillStyle = dark;
      ctx.font = "900 58px Arial";
      ctx.fillText(name.slice(0, 28), 420, 285);
      ctx.fillStyle = pink;
      ctx.font = "900 30px Arial";
      ctx.fillText(role.slice(0, 34), 424, 335);
      ctx.fillStyle = "#334155";
      ctx.font = "700 24px Arial";
      ctx.fillText(mail.slice(0, 42), 424, 382);
      ctx.font = "700 22px Arial";
      ctx.fillText(`Issued: ${new Date().toLocaleDateString()}`, 424, 435);
      ctx.fillText("Verify with Seattle Desi TV Studio", 424, 472);

      ctx.fillStyle = dark;
      ctx.font = "900 24px Arial";
      ctx.fillText("SDTV", 72, 580);
      ctx.font = "700 18px Arial";
      ctx.fillText("Culture • Community • Stories", 145, 580);

      const dataUrl = canvas.toDataURL("image/png");
      let finalUrl = dataUrl;

      if (cloudName && uploadPreset) {
        const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Could not create badge image.")), "image/png"));
        const body = new FormData();
        body.append("file", blob, "sdtv-id-badge.png");
        body.append("upload_preset", uploadPreset);
        body.append("folder", "sdtv/id-badges");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
        const out = await res.json();
        if (!res.ok || !out.secure_url) throw new Error(out.error?.message || "Badge upload failed.");
        finalUrl = out.secure_url;
      }

      onGenerated(finalUrl);
      setMessage(cloudName && uploadPreset ? "ID badge generated. Save the profile to keep it." : "ID badge generated as a browser image. Save the profile to keep it.");
    } catch (error: any) {
      setMessage(error?.message || "Could not generate ID badge.");
    } finally {
      setBusy(false);
    }
  }

  const fileName = `sdtv-id-badge-${safeText(fullName, "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;

  return <div className={compact ? "grid gap-3" : "mt-4 rounded-2xl border bg-slate-50 p-4"}>
    {!compact && <p className="font-black">ID Badge Tools</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={generateBadge} disabled={busy} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? "Generating..." : "Generate ID Badge"}</button>
      {idBadgeUrl && <button type="button" onClick={() => download(idBadgeUrl, fileName)} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">Download Badge</button>}
      {idBadgeUrl && <button type="button" onClick={() => printImage(idBadgeUrl)} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 border">Print Badge</button>}
    </div>
    {message && <p className="text-xs font-bold text-slate-500">{message}</p>}
  </div>;
}
