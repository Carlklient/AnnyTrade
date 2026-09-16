"use client";

/** In-hero product preview , AnnyTrade paper desk mock, not a third-party screenshot. */
export function TradeDeviceMock() {
  return (
    <div className="atl-visual" aria-hidden>
      <div className="atl-device-stand" />
      <div className="atl-device">
        <div className="atl-device-screen">
          <div className="atl-device-top">
            <div>
              <div className="atl-device-balance">$12,480.00</div>
              <div className="atl-device-pair">EURUSD, M5, PAPER</div>
            </div>
            <div className="atl-device-pair">AnnyTrade</div>
          </div>

          <div className="atl-chart">
            <svg viewBox="0 0 240 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="atlChartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1557ff" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#1557ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="atl-chart-fill"
                d="M8 118 C 28 112, 40 98, 55 102 C 78 108, 88 78, 110 72 C 132 66, 148 88, 168 70 C 188 52, 204 58, 232 34 L 232 160 L 8 160 Z"
              />
              <path
                className="atl-chart-line"
                d="M8 118 C 28 112, 40 98, 55 102 C 78 108, 88 78, 110 72 C 132 66, 148 88, 168 70 C 188 52, 204 58, 232 34"
              />
            </svg>
          </div>

          <div className="atl-trade-bar">
            <button
              type="button"
              className="atl-trade-btn atl-trade-sell"
              tabIndex={-1}
            >
              Sell
              <small>1.08421</small>
            </button>
            <div className="atl-volume">
              <span>Volume</span>
              <div className="atl-volume-ctrl">
                <span>-</span>
                <span>0.01</span>
                <span>+</span>
              </div>
            </div>
            <button
              type="button"
              className="atl-trade-btn atl-trade-buy"
              tabIndex={-1}
            >
              Buy
              <small>1.08434</small>
            </button>
          </div>

          <div className="atl-device-nav">
            <span>⌂</span>
            <span>◎</span>
            <span>▣</span>
          </div>
        </div>
      </div>
    </div>
  );
}
