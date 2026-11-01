import { useState } from "react";
import { Limit } from "../constants/constant";
import { t } from "../constants/messages";
import { Track } from "./Track";
import { type InfiniteQueryResponse } from "../types";
import { type CategoryType } from "../constants/constant";
interface PaginatedListProps {
  pages: InfiniteQueryResponse[];
  hasMore: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  category: CategoryType;
}

const buttonClass =
  "rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

export default function PaginatedList({
  pages,
  hasMore,
  isFetchingNextPage,
  category,
  fetchNextPage,
}: PaginatedListProps) {
  const [page, setPage] = useState(0);
  const current = Math.min(page, pages.length - 1); // very good example why we avoided useEffect
  const isLastLoaded = current === pages.length - 1;
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const goNext = async () => {
    if (isFetchingNextPage) return;
    if (!isLastLoaded) {
      setPage(current + 1);
    } else if (hasMore) {
      const result = await fetchNextPage();
      const failed =
        typeof result === "object" &&
        result !== null &&
        "isError" in result &&
        result.isError;
      if (!failed) setPage(current + 1);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {pages[current].data.map((track, index) => (
          <Track
            key={track.id}
            track={track}
            index={current * Limit + index}
            isPlaying={selectedTrackId === track.id}
            onPlay={() => setSelectedTrackId(track.id)}
            onPause={() =>
              setSelectedTrackId((id) => (id === track.id ? null : id))
            }
            category={category}
          />
        ))}
      </ul>

      <div className="flex flex-shrink-0 items-center justify-center gap-4 pt-3">
        <button
          className={buttonClass}
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          {t("pagination.prev")}
        </button>
        <span className="font-mono text-xs font-bold text-zinc-400">
          {t("pagination.page", { page: current + 1 })}
        </span>
        <button
          className={buttonClass}
          disabled={isFetchingNextPage || (isLastLoaded && !hasMore)}
          onClick={goNext}
        >
          {t("pagination.next")}
        </button>
      </div>
    </div>
  );
}
