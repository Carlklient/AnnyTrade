import { cnAt } from "../../lib/format";

type AnnyTradeLogoProps = {
  compact?: boolean;
  className?: string;
};

export function AnnyTradeLogo({
  compact = false,
  className,
}: AnnyTradeLogoProps) {
  return (
    <div className={cnAt("flex items-center gap-2.5", className)}>
      <span
        className="relative flex size-8 items-center justify-center rounded-[9px]"
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--at-accent) 85%, #fff), var(--at-accent))",
          boxShadow: "inset 0 1px 0 color-mix(in srgb, #fff 25%, transparent)",
        }}
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2.5 11.5L6 6.5L9 9.5L13.5 3.5"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 3.5H13.5V6.5"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact ? (
        <div className="flex flex-col leading-none">
          <span
            className="text-[0.95rem] font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            AnnyTrade
          </span>
          <span className="at-label mt-0.5 text-[0.58rem]">
            Multi-market desk
          </span>
        </div>
      ) : null}
    </div>
  );
}
