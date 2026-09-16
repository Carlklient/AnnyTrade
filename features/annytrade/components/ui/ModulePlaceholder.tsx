import Link from "next/link";

import { annytradeRoutes } from "../../lib/routes";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  bullets?: string[];
};

export function ModulePlaceholder({
  title,
  description,
  bullets = [],
}: ModulePlaceholderProps) {
  return (
    <div className="at-card mx-auto max-w-2xl">
      <div className="at-card-header">
        <div>
          <p className="at-label">Module foundation</p>
          <h1
            className="mt-1 text-xl font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            {title}
          </h1>
        </div>
        <span className="at-badge">Next</span>
      </div>
      <div className="at-card-body space-y-4">
        <p className="text-[0.875rem] leading-relaxed font-bold text-[#020617]">
          {description}
        </p>
        {bullets.length > 0 ? (
          <ul className="space-y-2 text-[0.8125rem] font-bold text-[#020617]">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span style={{ color: "var(--at-accent)" }}>â, ¸</span>
                {b}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={annytradeRoutes.dashboard}
            className="at-btn at-btn-primary"
          >
            Back to dashboard
          </Link>
          <Link href={annytradeRoutes.trade()} className="at-btn at-btn-ghost">
            Open trading screen
          </Link>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-[0.9375rem] font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-[0.8125rem] font-bold text-[#020617]">
        {description}
      </p>
    </div>
  );
}
