import Link from "next/link";

const PORTFOLIO_URL = "https://omotundeaanu-com.vercel.app";

export function OaMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="3 3 50 53"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="currentColor">
        <path d="M30 4C15.64 4 4 15.64 4 30s11.64 26 26 26c5.9 0 11.32-1.97 15.66-5.28l-3.52-4.28A19.9 19.9 0 0 1 30 49.5C19.23 49.5 10.5 40.77 10.5 30S19.23 10.5 30 10.5c4.35 0 8.36 1.4 11.58 3.75l3.4-4.55A25.8 25.8 0 0 0 30 4Z" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M36.5 9.5 51.2 54h-6.4L42.6 43.2H32.9L30.8 54h-6.2L36.5 9.5Zm-.2 24.6 3.7-10.6 3.7 10.6h-7.4Z"
        />
      </g>
      <g stroke="currentColor" fill="none">
        <path
          d="M27.4 35.1 46.2 28.3"
          strokeWidth="4.2"
          strokeLinecap="square"
        />
        <path
          d="M38.2 7.2 43.8 13"
          strokeWidth="1.85"
          strokeLinecap="square"
        />
      </g>
      <path
        d="M22.8 51.8c2.2 1.1 4.9 1.7 7.7 1.7h3.4v2.5H29.4c-3.4 0-6.5-.75-9.2-2.15l2.6-2.05Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Maker attribution for AnnyTrade — product brand stays primary. */
export function MakerCredit({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={PORTFOLIO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`atl-maker${compact ? " atl-maker--compact" : ""}`}
      aria-label="Built by Omotunde Aanu"
    >
      <OaMark className="atl-maker__mark" />
      <span>{compact ? "by Omotunde" : "by Omotunde Aanu"}</span>
    </a>
  );
}

/** Optional internal Next Link variant when already on the portfolio host. */
export function MakerCreditInternal({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={`atl-maker${compact ? " atl-maker--compact" : ""}`}
      aria-label="Built by Omotunde Aanu"
    >
      <OaMark className="atl-maker__mark" />
      <span>{compact ? "by Omotunde" : "by Omotunde Aanu"}</span>
    </Link>
  );
}
