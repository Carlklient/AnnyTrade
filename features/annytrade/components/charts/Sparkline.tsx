"use client";

import { cnAt } from "../../lib/format";

type SparklineProps = {
  data: number[];
  positive?: boolean;
  className?: string;
  width?: number;
  height?: number;
};

export function Sparkline({
  data,
  positive = true,
  className,
  width = 72,
  height = 28,
}: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cnAt(className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={positive ? "var(--at-buy)" : "var(--at-sell)"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        opacity={0.9}
      />
    </svg>
  );
}
