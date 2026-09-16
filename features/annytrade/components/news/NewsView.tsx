"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { formatCompactTime } from "../../lib/format";
import { annytradeRoutes } from "../../lib/routes";
import { newsClient, type NewsArticleDto } from "../../services/news-client";

export function NewsView({ symbolFilter }: { symbolFilter?: string }) {
  const [articles, setArticles] = useState<NewsArticleDto[]>([]);
  const [category, setCategory] = useState("all");
  const [metaLabel, setMetaLabel] = useState("");
  const [disclosure, setDisclosure] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await newsClient.list({
        symbol: symbolFilter,
        category: category === "all" ? undefined : category,
        limit: 40,
      });
      setArticles(res.articles);
      setMetaLabel(
        `${res.meta.providerLabel ?? res.meta.providerId}, ${res.meta.mode}`,
      );
      setDisclosure(res.disclosure);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load news");
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [category, symbolFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const list = useMemo(() => articles, [articles]);

  return (
    <div className="space-y-4">
      {!symbolFilter ? (
        <div>
          <p className="at-label">Coverage, {metaLabel || "…"}</p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            Market news
          </h1>
          <p className="mt-2 text-[0.8125rem] font-bold text-[#020617]">
            Provider-backed headlines with links to original sources. Full
            articles are not republished here.
          </p>
        </div>
      ) : (
        <p className="at-label">News, {symbolFilter}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {["all", "general", "forex", "equities", "commodities", "crypto"].map(
          (c) => (
            <button
              key={c}
              type="button"
              className="at-btn capitalize"
              style={
                category === c
                  ? { background: "var(--at-accent-muted)" }
                  : {
                      border: "1px solid var(--at-border)",
                      background: "transparent",
                    }
              }
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ),
        )}
        <button
          type="button"
          className="at-btn at-btn-ghost ml-auto"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-[0.8125rem] text-[var(--at-sell)]">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-[0.8125rem] font-bold text-[#020617]">Loading…</p>
      ) : null}

      <div className="space-y-3">
        {list.map((n) => (
          <article key={n.id} className="at-card">
            <div className="at-card-body space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {(n.relatedSymbols.length ? n.relatedSymbols : [])
                  .slice(0, 4)
                  .map((t) => (
                    <Link
                      key={t}
                      href={annytradeRoutes.trade(t)}
                      className="at-badge hover:text-[var(--at-accent)]"
                    >
                      {t}
                    </Link>
                  ))}
                {n.category ? (
                  <span className="at-badge capitalize">{n.category}</span>
                ) : null}
                <span className="at-badge">{n.freshness}</span>
              </div>
              <h2 className="text-base font-semibold">
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--at-accent)]"
                >
                  {n.headline}
                </a>
              </h2>
              {n.summary ? (
                <p className="text-[0.8125rem] font-bold text-[#020617]">
                  {n.summary}
                </p>
              ) : null}
              <p className="text-[0.7rem] font-bold text-[#020617]">
                {n.source}, {formatCompactTime(n.publishedAt)}{" "}
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--at-accent)]"
                >
                  Open source
                </a>
              </p>
            </div>
          </article>
        ))}
      </div>

      {!loading && list.length === 0 ? (
        <p className="text-[0.8125rem] font-bold text-[#020617]">
          No headlines for this filter.
        </p>
      ) : null}

      {disclosure ? (
        <p className="text-[0.7rem] font-bold text-[#020617]">{disclosure}</p>
      ) : null}
    </div>
  );
}
