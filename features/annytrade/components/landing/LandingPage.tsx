import Link from "next/link";

import { annytradeRoutes } from "../../lib/routes";
import { BrandMark, LandingNav } from "./LandingNav";
import { MakerCredit } from "./MakerCredit";
import { RegisterQr } from "./RegisterQr";
import { TradeDeviceMock } from "./TradeDeviceMock";
import "../../styles/landing.css";

const EDGE = [
  {
    title: "Secure account access",
    body: "Session based auth with encrypted credentials and server side controls.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: "Paper trading first",
    body: "Practice with a dedicated paper ledger, no live money path on this demo.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8v8M9 10.5h6M9 13.5h6"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: "Desk support surfaces",
    body: "Account, notifications, and ops alerts keep you oriented while you trade paper.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8v5l3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Multi market instruments",
    body: "Equities, FX, and more in one desk with search, watchlists, and charts.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 16l4-5 4 3 5-7 3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

const GROW = [
  {
    title: "Shared desk language",
    body: "Signals, watchlists, and portfolio views stay consistent across the paper workspace.",
  },
  {
    title: "Daily market analysis",
    body: "Rule based signals and chart context without leaving the platform.",
  },
  {
    title: "Clear product notes",
    body: "Risk disclosures keep expectations honest: PAPER only, no live brokerage.",
  },
  {
    title: "Trading tools",
    body: "Orders, alerts, analytics, calendar, and news in one workspace.",
  },
  {
    title: "Market news",
    body: "Stay current with a dedicated news module alongside your paper book.",
  },
] as const;

const MILESTONES = [
  { year: "Phase 3", label: "Paper trading engine" },
  { year: "Phase 5", label: "Charts and signal desk" },
  { year: "Phase 7", label: "Broker sandbox architecture" },
  { year: "Phase 10", label: "Ops and admin readiness" },
] as const;

const INK = { color: "#000000", WebkitTextFillColor: "#000000", opacity: 1 } as const;

export function LandingPage() {
  return (
    <div data-at-landing data-theme="light" className="light">
      <style>{`
        [data-at-landing] h1,
        [data-at-landing] h2,
        [data-at-landing] h3,
        [data-at-landing] .atl-headline,
        [data-at-landing] .atl-section-title,
        [data-at-landing] .atl-stat strong,
        [data-at-landing] .atl-grow-list li strong,
        [data-at-landing] .atl-award p {
          color: #000 !important;
          -webkit-text-fill-color: #000 !important;
          opacity: 1 !important;
        }
        [data-at-landing] p,
        [data-at-landing] .atl-support,
        [data-at-landing] .atl-section-sub,
        [data-at-landing] .atl-edge-card p,
        [data-at-landing] .atl-analyse-card p,
        [data-at-landing] .atl-grow-list li span,
        [data-at-landing] .atl-stat span {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          opacity: 1 !important;
        }
        html.dark [data-at-landing],
        .dark [data-at-landing] {
          color-scheme: light !important;
        }
      `}</style>
      <div className="atl-wrap">
        <LandingNav />
      </div>

      <section className="atl-hero">
        <div className="atl-wrap atl-hero-grid">
          <div>
            <h1 className="atl-headline" style={INK}>
              Broker that empowers your growth
            </h1>
            <p className="atl-support" style={{ color: "#0f172a" }}>
              Trade with a focused multi market desk, paper capital, clear
              charts, and tools built to help you practise every decision.
            </p>
            <div className="atl-cta-row">
              <Link
                href={annytradeRoutes.auth.register}
                className="atl-btn atl-btn-primary atl-btn-lg"
              >
                Start trading
              </Link>
            </div>
            <div className="atl-stats">
              <div className="atl-stat">
                <strong style={INK}>Paper desk</strong>
                <span style={{ color: "#0f172a" }}>Simulated funds only</span>
              </div>
              <div className="atl-stat">
                <strong style={INK}>Charts + signals</strong>
                <span style={{ color: "#0f172a" }}>Rule based analysis</span>
              </div>
              <div className="atl-stat">
                <strong style={INK}>Sandbox ready</strong>
                <span style={{ color: "#0f172a" }}>Live trading disabled</span>
              </div>
            </div>
          </div>
          <TradeDeviceMock />
        </div>
      </section>

      <section className="atl-section">
        <div className="atl-wrap">
          <h2 className="atl-section-title" style={INK}>
            Trade with an edge
          </h2>
          <p className="atl-section-sub" style={{ color: "#0f172a" }}>
            Everything you need to practise with clarity, without the clutter of
            a noisy brokerage homepage.
          </p>
          <div className="atl-edge-grid">
            {EDGE.map((item) => (
              <article key={item.title} className="atl-edge-card">
                <div className="atl-icon">{item.icon}</div>
                <h3 style={INK}>{item.title}</h3>
                <p style={{ color: "#0f172a" }}>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="atl-section atl-section-soft">
        <div className="atl-wrap">
          <h2 className="atl-section-title" style={INK}>
            Analyse markets, trade, and learn without switching apps
          </h2>
          <div className="atl-analyse-grid">
            <article className="atl-analyse-card">
              <h3 style={INK}>Seamless trading across devices</h3>
              <p style={{ color: "#0f172a" }}>
                Responsive desk layout for desktop and mobile, same paper
                account, same watchlists.
              </p>
              <div className="atl-analyse-art" aria-hidden>
                <div className="atl-mini-laptop" />
                <div className="atl-mini-device atl-mini-device-overlap" />
              </div>
            </article>
            <article className="atl-analyse-card">
              <h3 style={INK}>Customizable trading feed</h3>
              <p style={{ color: "#0f172a" }}>
                Watchlists, news, and calendar modules so your desk reflects how
                you work.
              </p>
              <div className="atl-analyse-art" aria-hidden>
                <div className="atl-feed-panel" />
                <span className="atl-chip">Watchlist live</span>
              </div>
            </article>
            <article className="atl-analyse-card">
              <h3 style={INK}>Signal and risk support</h3>
              <p style={{ color: "#0f172a" }}>
                Educational rule based signals with clear disclosures, never
                presented as guaranteed outcomes.
              </p>
              <div className="atl-analyse-art" aria-hidden>
                <div className="atl-signal-panel" />
                <span className="atl-chip">Educational only</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="atl-section">
        <div className="atl-wrap atl-grow">
          <div className="atl-grow-visual" aria-hidden>
            <div className="atl-device atl-device-sm">
              <div className="atl-device-screen">
                <div className="atl-device-top">
                  <div>
                    <div className="atl-device-balance">EURUSD</div>
                    <div className="atl-device-pair">M15, PAPER</div>
                  </div>
                </div>
                <div className="atl-chart">
                  <svg viewBox="0 0 240 160" preserveAspectRatio="none">
                    <path
                      d="M8 110 C 40 100, 60 120, 90 90 C 120 60, 150 95, 180 70 C 200 55, 220 50, 232 40"
                      fill="none"
                      stroke="#2455f4"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="atl-trade-bar">
                  <div
                    className="atl-trade-btn atl-trade-sell"
                    style={{ textAlign: "center" }}
                  >
                    Sell
                  </div>
                  <div className="atl-volume">
                    <span>0.01</span>
                  </div>
                  <div
                    className="atl-trade-btn atl-trade-buy"
                    style={{ textAlign: "center" }}
                  >
                    Buy
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 style={INK}>
              Grow faster with expert tools and community backup
            </h2>
            <ul className="atl-grow-list">
              {GROW.map((item) => (
                <li key={item.title}>
                  <strong style={INK}>{item.title}</strong>
                  <span style={{ color: "#0f172a" }}>{item.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="atl-section atl-section-soft">
        <div className="atl-wrap">
          <h2 className="atl-section-title" style={INK}>
            Built as a serious trading platform
          </h2>
          <p className="atl-section-sub" style={{ color: "#0f172a" }}>
            Product milestones, not industry awards. AnnyTrade does not claim
            SEC, FCA, or FINRA approval.
          </p>
          <div className="atl-awards">
            {MILESTONES.map((m) => (
              <div key={m.year} className="atl-award">
                <div className="atl-trophy" aria-hidden>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8 4h8v3a4 4 0 01-8 0V4zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3M12 11v4M9 20h6M10 15h4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="year" style={{ color: "#0f172a" }}>
                  {m.year}
                </div>
                <p style={INK}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="atl-section">
        <div className="atl-wrap atl-app">
          <div className="atl-app-visual" aria-hidden>
            <span className="atl-coin" style={{ left: "14%", top: "22%" }} />
            <span
              className="atl-coin"
              style={{
                right: "16%",
                top: "30%",
                width: "2.4rem",
                height: "2.4rem",
              }}
            />
            <span
              className="atl-coin"
              style={{
                left: "22%",
                bottom: "18%",
                width: "2.8rem",
                height: "2.8rem",
              }}
            />
            <div className="atl-device atl-device-xs">
              <div className="atl-device-screen">
                <div className="atl-device-top">
                  <div>
                    <div className="atl-device-pair">Wallet</div>
                    <div className="atl-device-balance">$12,480.00</div>
                  </div>
                </div>
                <div className="atl-wallet-rows" aria-hidden>
                  <div>
                    <span>Cash</span>
                    <strong>$8,240</strong>
                  </div>
                  <div>
                    <span>Positions</span>
                    <strong>$4,240</strong>
                  </div>
                  <div>
                    <span>Today</span>
                    <strong className="atl-up">+$186</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 style={INK}>Trade on the go with the AnnyTrade desk</h2>
            <p style={{ color: "#0f172a" }}>
              Open the web desk on any device. Scan to jump straight into
              account creation, no app store install required for this demo.
            </p>
            <div className="atl-qr-row">
              <RegisterQr />
              <div>
                <div className="atl-qr-label">Scan to open account</div>
                <p className="atl-qr-hint">
                  Phone camera opens signup. Or tap the code or Enter desk.
                </p>
                <Link
                  href={annytradeRoutes.dashboard}
                  className="atl-btn atl-btn-primary"
                  style={{ marginTop: "0.85rem" }}
                >
                  Enter desk
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="atl-footer">
        <div className="atl-wrap">
          <div className="atl-footer-top">
            <div>
              <Link href={annytradeRoutes.root} className="atl-brand">
                <BrandMark />
                <span className="atl-brand-name">annytrade</span>
              </Link>
              <MakerCredit />
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li>
                  <Link href="/work/annytrade">Case study</Link>
                </li>
                <li>
                  <Link href={annytradeRoutes.dashboard}>Trading desk</Link>
                </li>
                <li>
                  <Link href={annytradeRoutes.account}>Account</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Legal</h4>
              <ul>
                <li>
                  <Link href={annytradeRoutes.auth.register}>Open account</Link>
                </li>
                <li>
                  <Link href={annytradeRoutes.auth.login}>Log in</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Markets</h4>
              <ul>
                <li>
                  <Link href={annytradeRoutes.markets}>Markets</Link>
                </li>
                <li>
                  <Link href={annytradeRoutes.signals}>Signals</Link>
                </li>
                <li>
                  <Link href={annytradeRoutes.news}>News</Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="atl-legal">
            AnnyTrade is a product demonstration and paper trading platform. It is
            not a licensed broker dealer and does not provide investment advice.
            Trading involves risk of loss. Signals are educational and do not
            guarantee outcomes. Broker Live execution remains disabled. This
            software does not constitute SEC, FCA, FINRA, or other regulatory
            approval, membership, or licensing. Past and simulated performance
            do not predict future results.
          </p>
        </div>
      </footer>

      <Link
        href={annytradeRoutes.auth.login}
        className="atl-chat"
        aria-label="Get help"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 6.5A3.5 3.5 0 018.5 3h7A3.5 3.5 0 0119 6.5v5A3.5 3.5 0 0115.5 15H10l-4 4v-4.2A3.5 3.5 0 015 11.5v-5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="9" r="1" fill="currentColor" />
          <circle cx="12" cy="9" r="1" fill="currentColor" />
          <circle cx="15" cy="9" r="1" fill="currentColor" />
        </svg>
      </Link>
    </div>
  );
}
