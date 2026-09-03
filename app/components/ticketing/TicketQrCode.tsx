"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
export default function TicketQrCode({ code }: { code: string }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(code, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#020617", light: "#ffffff" },
    }).then((value) => {
      if (active) setSource(value);
    });
    return () => {
      active = false;
    };
  }, [code]);
  return source ? (
    <img
      src={source}
      alt={`Entry QR code for ticket ending ${code.slice(-4)}`}
      className="mx-auto h-56 w-56 rounded-xl border bg-white p-2"
    />
  ) : (
    <div className="mx-auto grid h-56 w-56 place-items-center rounded-xl bg-slate-100 text-sm font-bold">
      Creating secure QR…
    </div>
  );
}
