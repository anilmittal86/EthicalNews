"use client";

import { useState, useEffect } from "react";
import { NewsItem, BiasAnalysis } from "@/lib/types";

function BiasBadge({ level }: { level: "low" | "medium" | "high" }) {
  const colors = {
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  const labels = {
    low: "Low Bias",
    medium: "Medium Bias",
    high: "High Bias",
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[level]}`}>
      {labels[level]}
    </span>
  );
}

function SensationalBadge() {
  return (
    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
      Sensationalist
    </span>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const biasAnalysis = item.biasAnalysis as BiasAnalysis | undefined;

  return (
    <article className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
          >
            {item.title}
          </a>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {item.source}
            </span>
            <span>•</span>
            <time>{formatDate(item.pubDate)}</time>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0">
          {biasAnalysis && <BiasBadge level={biasAnalysis.biasLevel} />}
          {biasAnalysis?.isSensationalist && <SensationalBadge />}
        </div>
      </div>

      {biasAnalysis && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {biasAnalysis.biasNote}
            </p>
          </div>
          {biasAnalysis.indicators.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {biasAnalysis.indicators.map((indicator, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                >
                  {indicator}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5 animate-pulse"
        >
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
      <svg
        className="w-12 h-12 mx-auto text-red-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Unable to load news
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        There was an error loading the news. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/news-with-analysis", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNews(data.news);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  EthicalNews
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Unbiased Finance & Markets
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Updated {lastUpdated}
                </span>
              )}
              <button
                onClick={fetchNews}
                disabled={loading}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <svg
                  className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Finance & Stock Markets
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Top headlines from trusted sources, analyzed for bias and sensationalism.
          </p>
        </div>

        {loading && <LoadingSkeleton />}

        {error && <ErrorState onRetry={fetchNews} />}

        {!loading && !error && news.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No news available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We couldn&apos;t fetch any news at the moment. Please try again later.
            </p>
            <button
              onClick={fetchNews}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}

        {!loading && !error && news.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {news.length} articles
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-500 dark:text-gray-400">Low Bias</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-gray-500 dark:text-gray-400">Medium Bias</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-500 dark:text-gray-400">High Bias</span>
                </span>
              </div>
            </div>
            <div className="space-y-4">
              {news.map((item, index) => (
                <NewsCard key={`${item.link}-${index}`} item={item} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            EthicalNews uses AI to analyze news for bias. Always verify information from multiple sources.
          </p>
        </div>
      </footer>
    </div>
  );
}
