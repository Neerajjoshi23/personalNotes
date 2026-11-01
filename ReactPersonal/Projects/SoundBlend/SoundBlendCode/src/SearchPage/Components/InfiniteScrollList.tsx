import { useEffect, useRef, useState, type UIEvent } from "react";
import { OVERSCAN, ROW_HEIGHT } from "../constants/constant";
import { t } from "../constants/messages";
import { Track } from "./Track";
import type { InfiniteQueryResponse } from "../types";
import type { CategoryType } from "../constants/constant";
interface InfiniteScrollListProps {
  tracks: InfiniteQueryResponse["data"];
  hasMore: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  category: CategoryType;
}

export default function InfiniteScrollList({
  tracks,
  hasMore,
  isFetchingNextPage,
  fetchNextPage,
  category,
}: InfiniteScrollListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => setViewportHeight(container.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) =>
    setScrollTop(e.currentTarget.scrollTop);

  // Only the rows in view (plus OVERSCAN above and below) are mounted.
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(
    tracks.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleTracks = tracks.slice(start, end);

  // Re-created after every page load, so a sentinel that is still visible
  // (content shorter than the container) immediately triggers the next page.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { root: containerRef.current, rootMargin: "100px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage, tracks.length]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto pr-1"
    >
      <ul
        className="relative w-full"
        style={{ height: `${tracks.length * ROW_HEIGHT}px` }}
      >
        {visibleTracks.map((track, i) => (
          <Track
            key={track.id}
            track={track}
            index={start + i}
            isPlaying={selectedTrackId === track.id}
            onPlay={() => setSelectedTrackId(track.id)}
            onPause={() =>
              setSelectedTrackId((id) => (id === track.id ? null : id))
            }
            style={{
              position: "absolute",
              top: `${(start + i) * ROW_HEIGHT}px`,
              left: 0,
              right: 0,
            }}
            category={category}
          />
        ))}
      </ul>

      <div
        ref={sentinelRef}
        className="py-4 text-center text-xs font-semibold text-zinc-500"
      >
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span>{t("state.loadingMore")}</span>
          </div>
        )}
        {!hasMore && <p className="text-zinc-600">{t("state.endOfList")}</p>}
      </div>
    </div>
  );
}
