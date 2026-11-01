// components/VirtualRepositoryList.jsx
import { useState, useRef, useMemo, useEffect } from "react";
import RepositoryCard from "./RepositoryCard";
import { Loader2 } from "lucide-react";

function VirtualRepositoryList({
  repos,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}) {
  const viewportRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const itemHeight = 120;
  const gapHeight = 12;
  const totalItemHeight = itemHeight + gapHeight;
  const viewportHeight = 450;
  const bufferCards = 3;

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const { visibleItems, endIndex } = useMemo(() => {
    const totalItems = repos.length;
    if (totalItems === 0)
      return { visibleItems: [], startIndex: 0, endIndex: 0 };

    const rawStartIndex = Math.floor(scrollTop / totalItemHeight);
    const startIndex = Math.max(0, rawStartIndex - bufferCards);

    const itemsInViewport = Math.ceil(viewportHeight / totalItemHeight);
    const endIndex = Math.min(
      totalItems - 1,
      startIndex + itemsInViewport + bufferCards,
    );

    const renderedRange = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (repos[i]) {
        renderedRange.push({ index: i, data: repos[i] });
      }
    }

    return { visibleItems: renderedRange, startIndex, endIndex };
  }, [scrollTop, repos, totalItemHeight]);

  useEffect(() => {
    if (endIndex >= repos.length - 4 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [endIndex, repos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="w-full flex flex-col gap-3">
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        style={{ height: `${viewportHeight}px` }}
        className="w-full overflow-y-auto relative rounded-2xl border border-slate-900/60 bg-slate-950/20 shadow-inner px-2"
      >
        <div
          style={{ height: `${repos.length * totalItemHeight}px` }}
          className="w-full relative"
        >
          {visibleItems.map(({ index, data }) => (
            <div
              key={data.id || index}
              className="absolute left-0 right-0 px-2"
              style={{
                height: `${itemHeight}px`,
                top: `${index * totalItemHeight}px`,
              }}
            >
              <RepositoryCard repo={data} />
            </div>
          ))}
        </div>
      </div>

      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 bg-slate-950/30 border border-slate-900/60 rounded-xl">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
          <span>Querying next repositories segment...</span>
        </div>
      )}
    </div>
  );
}

export default VirtualRepositoryList;
