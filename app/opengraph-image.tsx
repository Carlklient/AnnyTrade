import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AnnyTrade — paper trading desk demo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B1220",
          color: "#F8FAFC",
          padding: "64px 72px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
          ANNYTRADE
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>
            Paper trading desk
          </div>
          <div style={{ fontSize: 28, opacity: 0.75, maxWidth: 780 }}>
            Markets, signals, charts, and portfolio tools. Simulated data only.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
