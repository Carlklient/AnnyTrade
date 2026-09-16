import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — OA monogram on charcoal plate. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#141210",
        borderRadius: 36,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 118,
          height: 118,
          position: "relative",
        }}
      >
        {/* Simplified OA for raster */}
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            border: "14px solid #F5F1EA",
            borderRightColor: "transparent",
            borderTopColor: "transparent",
            transform: "rotate(-35deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 48,
            top: 18,
            width: 14,
            height: 90,
            background: "#F5F1EA",
            transform: "rotate(18deg)",
            transformOrigin: "top center",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 52,
            width: 58,
            height: 12,
            background: "#C41E3A",
            transform: "rotate(-18deg)",
          }}
        />
      </div>
    </div>,
    { ...size },
  );
}
