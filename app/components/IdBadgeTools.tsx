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

function drawRoundIcon(ctx: CanvasRenderingContext2D, x: number, y: number, symbol: string, fill: string, fontSize = 25) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, x, y + 1);
  ctx.restore();
}

function drawYouTube(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = "#ff0000";
  ctx.beginPath();
  ctx.roundRect(x, y, 72, 48, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(x + 29, y + 12);
  ctx.lineTo(x + 29, y + 36);
  ctx.lineTo(x + 50, y + 24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawInstagram(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  const gradient = ctx.createLinearGradient(x, y + 48, x + 48, y);
  gradient.addColorStop(0, "#f9ce34");
  gradient.addColorStop(0.35, "#ee2a7b");
  gradient.addColorStop(0.7, "#6228d7");
  gradient.addColorStop(1, "#4f5bd5");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(x, y, 50, 50, 12);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 10, 30, 30, 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 25, y + 25, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + 36, y + 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFacebook(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = "#1877f2";
  ctx.beginPath();
  ctx.arc(x + 25, y + 25, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 39px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("f", x + 27, y + 29);
  ctx.restore();
}

export default function IdBadgeTools({
  fullName,
  roleLabel,
  email: _email,
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
      const badgeTitle = safeText(roleLabel, "Team Member").toUpperCase();
      const memberRole = "Team Member";
      const website = "www.seattledesitv.com";

      const gold = "#f7b718";
      const dark = "#050816";
      const pink = "#e5006f";

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, canvas.width, 145);
      ctx.fillStyle = pink;
      ctx.fillRect(0, 145, canvas.width, 8);

      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(0, 650);
      ctx.bezierCurveTo(260, 575, 490, 640, 700, 545);
      ctx.bezierCurveTo(860, 474, 970, 505, 1050, 390);
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
      ctx.roundRect(55, 195, 345, 345, 34);
      ctx.clip();
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(55, 195, 345, 345);
      if (photo) {
        const scale = Math.max(345 / photo.width, 345 / photo.height);
        const w = photo.width * scale;
        const h = photo.height * scale;
        ctx.drawImage(photo, 55 + (345 - w) / 2, 195 + (345 - h) / 2, w, h);
      } else {
        ctx.fillStyle = pink;
        ctx.font = "900 130px Arial";
        ctx.textAlign = "center";
        ctx.fillText(name.slice(0, 1).toUpperCase(), 228, 415);
        ctx.textAlign = "left";
      }
      ctx.restore();

      ctx.strokeStyle = gold;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(55, 195, 345, 345, 34);
      ctx.stroke();

      ctx.fillStyle = dark;
      ctx.font = "900 54px Arial";
      ctx.fillText(name.slice(0, 27), 445, 270);
      ctx.fillStyle = pink;
      ctx.font = "900 30px Arial";
      ctx.fillText(badgeTitle.slice(0, 34), 448, 322);

      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(448, 345);
      ctx.lineTo(995, 345);
      ctx.stroke();

      drawRoundIcon(ctx, 472, 395, "●", pink, 18);
      ctx.fillStyle = dark;
      ctx.font = "900 25px Arial";
      ctx.fillText("Role:", 515, 404);
      ctx.font = "500 25px Arial";
      ctx.fillText(memberRole, 590, 404);

      drawRoundIcon(ctx, 472, 455, "▦", pink, 24);
      ctx.font = "900 24px Arial";
      ctx.fillText("Issued:", 515, 464);
      ctx.font = "500 24px Arial";
      ctx.fillText(new Date().toLocaleDateString(), 602, 464);

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(448, 492);
      ctx.lineTo(760, 492);
      ctx.stroke();

      drawRoundIcon(ctx, 472, 530, "◎", pink, 27);
      ctx.fillStyle = dark;
      ctx.font = "500 25px Arial";
      ctx.fillText(website, 515, 539);

      drawYouTube(ctx, 448, 558);
      drawInstagram(ctx, 550, 557);
      drawFacebook(ctx, 640, 557);

      ctx.fillStyle = dark;
      ctx.font = "900 27px Arial";
      ctx.fillText("SDTV", 58, 610);
      ctx.font = "700 18px Arial";
      ctx.fillText("Culture • Community • Stories", 135, 610);

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
