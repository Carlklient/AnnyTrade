"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { annytradeRoutes } from "../../lib/routes";
import { formatCompactTime } from "../../lib/format";
import { newsClient, type NewsArticleDto } from "../../services/news-client";

type Tab = "feed" | "education" | "channels";

export function SpaceRail({ symbol }: { symbol: string }) {
  const [tab, setTab] = useState<Tab>("feed");
  const [articles, setArticles] = useState<NewsArticleDto[]>([]);

  useEffect(() => {
    void newsClient
      .list({ limit: 8, symbol })
      .then((res) => setArticles(res.articles))
      .catch(() => setArticles([]));
  }, [symbol]);

  return (
    <aside className="at-term-rail at-term-space" aria-label="Space">
      <div className="at-term-rail-head">
        <h2>Space</h2>
        <div className="at-term-space-tabs" role="tablist">
          {(
            [
              ["feed", "Feed"],
              ["education", "Education"],
              ["channels", "Channels"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-active={tab === id ? "true" : "false"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="at-term-space-body">
        {tab === "feed" ? (
          articles.length === 0 ? (
            <p className="at-term-inst-empty">
              No posts yet. <Link href={annytradeRoutes.news}>Open news</Link>
            </p>
          ) : (
            articles.map((a) => (
              <article key={a.id} className="at-term-post">
                <div className="at-term-post-meta">
                  <span className="at-term-avatar">AT</span>
                  <span className="font-semibold">AnnyTrade</span>
                  <time dateTime={a.publishedAt}>
                    {formatCompactTime(a.publishedAt)}
                  </time>
                </div>
                <h3>{a.headline}</h3>
                <p>
                  {a.summary?.slice(0, 120) ||
                    "Market note for paper desk context."}
                  {(a.summary?.length ?? 0) > 120 ? "…" : ""}
                </p>
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    Read more
                  </a>
                ) : (
                  <Link href={annytradeRoutes.news}>Read more</Link>
                )}
              </article>
            ))
          )
        ) : null}

        {tab === "education" ? (
          <div className="at-term-post">
            <h3>Paper trading basics</h3>
            <p>
              Practice entries with simulated cash. Live brokerage stays hard
              blocked , marks and fills are for discipline, not real money.
            </p>
            <Link href={annytradeRoutes.signals}>Browse signals</Link>
          </div>
        ) : null}

        {tab === "channels" ? (
          <div className="at-term-post">
            <h3>Channels</h3>
            <p>
              Community channels are not live yet. Use News and Signals for desk
              context while you practice.
            </p>
            <Link href={annytradeRoutes.news}>News desk</Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
