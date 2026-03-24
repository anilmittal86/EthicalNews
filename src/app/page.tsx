"use client";

import { useState, useEffect } from "react";
import { StoryCluster } from "@/lib/types";

function StoryCard({ story }: { story: StoryCluster }) {
  const formatSources = (sources: string[]) => {
    if (sources.length <= 3) {
      return sources.join(" • ");
    }
    return `${sources.slice(0, 2).join(" • ")} • ${sources.length - 2} more`;
  };

  return (
    <article className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {story.title}
        </h2>

        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          {story.summary}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">
            Sources: {formatSources(story.sources)}
          </span>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-3">
          {story.articles.slice(0, 3).map((article, idx) => (
            <a
              key={idx}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span>{article.source}</span>
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ))}
          {story.articles.length > 3 && (
            <span className="text-sm text-gray-500 dark:text-gray-400 self-center px-2">
              +{story.articles.length - 3} more sources
            </span>
          )}
        </div>

        {story.showBiasNote && story.biasNote && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <details className="group">
              <summary className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer list-none">
                <svg
                  className="w-4 h-4"
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
                <span>Coverage note</span>
                <svg
                  className="w-4 h-4 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 pl-6">
                {story.biasNote}
              </p>
            </details>
          </div>
        )}
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse"
        >
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          </div>
          <div className="mt-4 h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="mt-4 flex gap-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
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
        Unable to load stories
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        Please check your API configuration and try again.
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

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
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
        No stories available
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        We couldn&apos;t fetch any stories at the moment. Please try again later.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}

export default function Home() {
  const [stories, setStories] = useState<StoryCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchStories = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/stories", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStories(data.stories);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
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
                  Finance & Markets
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
                onClick={fetchStories}
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Today&apos;s Briefing
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Top stories from trusted sources, curated for balanced coverage.
          </p>
        </div>

        {loading && <LoadingSkeleton />}

        {error && <ErrorState onRetry={fetchStories} />}

        {!loading && !error && stories.length === 0 && (
          <EmptyState onRetry={fetchStories} />
        )}

        {!loading && !error && stories.length > 0 && (
          <>
            <div className="space-y-6">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {stories.length} stories from {stories.reduce((acc, s) => acc + s.sourceCount, 0)} sources
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Curated from trusted financial news sources.
          </p>
        </div>
      </footer>
    </div>
  );
}
