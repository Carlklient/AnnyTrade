import QRCode from "qrcode";
import Link from "next/link";

import { annytradeRoutes } from "../../lib/routes";

function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://annytrade.onrender.com";
  return raw.replace(/\/$/, "");
}

/** Real QR encoding the absolute register URL (scannable by phone cameras). */
export async function RegisterQr() {
  const target = `${appBaseUrl()}${annytradeRoutes.auth.register}`;
  const dataUrl = await QRCode.toDataURL(target, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 224,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  return (
    <Link
      href={annytradeRoutes.auth.register}
      className="atl-qr atl-qr-live"
      aria-label="Scan or tap to open account"
      title={target}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL from server QR encode */}
      <img src={dataUrl} alt={`QR code for ${target}`} width={112} height={112} />
    </Link>
  );
}
