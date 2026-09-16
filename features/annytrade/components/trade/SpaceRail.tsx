"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { annytradeRoutes } from "../../lib/routes";
import { formatCompactTime, formatPrice } from "../../lib/format";
import { spaceIdeasForSymbol, type SpaceIdea } from "../../lib/space-ideas";
import { newsClient, type NewsArticleDto } from "../../services/news-client";

type Tab = "feed" | "ideas" | "education";

export type SpaceApplyPayload = {
  idea: SpaceIdea;
  /** If quote last is known, ideas without level can still open trade */
  preferLevel?: number | null;
};

export function SpaceRail({
  symbol,
  lastPrice,
  onApplyIdea,
}: {
  symbol: string;
  lastPrice?: number | null;
  onApplyIdea?: (payload: SpaceApplyPayload) => void;
}) {
  const [tab, setTab] = useState<Tab>("ideas");
  const [articles, setArticles] = useState<NewsArticleDto[]>([]);
  const ideas = useMemo(() => spaceIdeasForSymbol(symbol), [symbol]);

  useEffect(() => {
    void newsClient
      .list({ limit: 8, symbol })
      .then((res) => setArticles(res.articles))
      .catch(() => setArticles([]));
  }, [symbol]);

  function apply(idea: SpaceIdea) {
    const level =
      idea.level ??
      (lastPrice != null && Number.isFinite(lastPrice)
        ? Number((lastPrice * (idea.bias === "bearish" ? 1.004 : 0.996)).toFixed(6))
        : null);
    onApplyIdea?.({ idea, preferLevel: level });
  }

  return (
    <aside className="at-term-rail at-term-space" aria-label="Space">
      <div className="at-term-rail-head">
        <h2>Space</h2>
        <div className="at-term-space-tabs" role="tablist">
          {(
            [
              ["ideas", "Ideas"],
              ["feed", "News"],
              ["education", "Learn"],
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
        {tab === "ideas" ? (
          ideas.length === 0 ? (
            <p className="at-term-inst-empty">No ideas for this symbol.</p>
          ) : (
            ideas
              .filter((i) => i.kind !== "education")
              .map((idea) => (
                <article key={idea.id} className="at-term-post">
                  <div className="at-term-post-meta">
                    <span className="at-term-avatar">AT</span>
                    <span className="font-semibold">Desk ideas</span>
                    <span className="at-badge at-badge-demo">
                      {idea.bias ?? idea.kind}
                    </span>
                  </div>
                  <h3>{idea.title}</h3>
                  <p>{idea.body}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="at-btn at-btn-primary h-8 px-2.5 text-[0.7rem]"
                      onClick={() => apply(idea)}
                    >
                      Apply to chart
                    </button>
                    <Link
                      href={annytradeRoutes.trade(symbol)}
                      className="at-btn at-btn-ghost h-8 px-2.5 text-[0.7rem]"
                    >
                      Focus {symbol}
                    </Link>
                  </div>
                </article>
              ))
          )
        ) : null}

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
          <>
            {ideas
              .filter((i) => i.kind === "education")
              .map((idea) => (
                <div key={idea.id} className="at-term-post">
                  <h3>{idea.title}</h3>
                  <p>{idea.body}</p>
                </div>
              ))}
            <div className="at-term-post">
              <h3>Signals are educational</h3>
              <p>
                Rule-based biases are for practice — not financial advice. Pair
                them with your own chart levels
                {lastPrice != null ? ` (last ${formatPrice(lastPrice)})` : ""}.
              </p>
              <Link href={annytradeRoutes.signals}>Browse signals</Link>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
