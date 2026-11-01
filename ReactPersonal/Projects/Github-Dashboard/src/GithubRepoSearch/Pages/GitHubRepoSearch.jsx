import { Link } from "react-router-dom";
import RepositoryList from "../components/RepositoryList";
import VirtualRepositoryList from "../components/VirtualRepositoryList";
import { useState, useEffect } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { fetchSearchedRepostory } from "../api/repository";
import SearchBar from "../../Shared/components/SearchBar";
import useDebounce from "../Hooks/useDebounce";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Layers,
  Infinity,
} from "lucide-react";

function GitHubRepoSearch() {
  const [queryParam, setQueryParam] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("");
  // View Toggle State: true = Infinite Virtual Scroll, false = Standard Pagination
  const [isInfiniteMode, setIsInfiniteMode] = useState(false);

  const debounceValue = useDebounce(queryParam, 500);

  // Sync back to defaults if input parameter structures shift
  useEffect(() => {
    setPage(1);
  }, [debounceValue, sortBy]);

  // HOOK 1: Standard Pagination Engine Mode
  const paginationQuery = useQuery({
    queryKey: ["searchRepos", debounceValue, page, sortBy],
    queryFn: () => fetchSearchedRepostory(debounceValue, page, sortBy),
    enabled: !!debounceValue && !isInfiniteMode,
  });

  // HOOK 2: Infinite Dynamic Segment Streaming Engine Mode
  const infiniteQuery = useInfiniteQuery({
    queryKey: ["infiniteRepos", debounceValue, sortBy],
    queryFn: ({ pageParam = 1 }) =>
      fetchSearchedRepostory(debounceValue, pageParam, sortBy),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalCount = lastPage?.total_count || 0;
      const totalPages = Math.ceil(totalCount / 10);
      const nextPage = allPages.length + 1;
      return nextPage <= totalPages ? nextPage : undefined;
    },
    enabled: !!debounceValue && isInfiniteMode,
  });

  // Normalize data outputs context mappings
  const paginationRepos =
    paginationQuery.data?.items || paginationQuery.data || [];
  const infiniteRepos =
    infiniteQuery.data?.pages.flatMap((p) => p.items || p) || [];

  const currentRepos = isInfiniteMode ? infiniteRepos : paginationRepos;
  const isLoading = isInfiniteMode
    ? infiniteQuery.isLoading
    : paginationQuery.isLoading;
  const isError = isInfiniteMode
    ? infiniteQuery.isError
    : paginationQuery.isError;
  const error = isInfiniteMode ? infiniteQuery.error : paginationQuery.error;

  const totalCount = isInfiniteMode
    ? infiniteQuery.data?.pages[0]?.total_count || 0
    : paginationQuery.data?.total_count || 0;

  const hasNextPage = page * 10 < totalCount;
  return (
    <div className="w-full flex justify-center py-4">
      <div className="w-full max-w-4xl bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col gap-6">
        <div>
          <Link
            to="/"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-all duration-200 hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back Home</span>
          </Link>
        </div>

        {/* Premium Header Layout with Integrated View Selection Toggle Switch */}
        <div className="border-b border-slate-900/80 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              GitHub Repository Search
            </h1>
            <p className="mt-1.5 text-sm text-slate-400/90 leading-relaxed">
              Search across millions of public repositories in real-time.
            </p>
          </div>

          {/* Premium Selector Display Pill Toggle Switch */}
          {
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start md:self-center">
              <button
                onClick={() => setIsInfiniteMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isInfiniteMode
                    ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Pagination</span>
              </button>
              <button
                onClick={() => setIsInfiniteMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isInfiniteMode
                    ? "bg-slate-800 text-white shadow-md border border-slate-700/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Infinity className="w-3.5 h-3.5" />
                <span>Infinite Virtual</span>
              </button>
            </div>
          }
        </div>

        <div className="w-full flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <SearchBar
              queryParam={queryParam}
              setQueryParam={setQueryParam}
              title="Repositories"
            />
          </div>

          {
            <div className="flex flex-col gap-1.5 w-full sm:w-48">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1 px-1">
                <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                <span>SORT REPOSITORIES</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-xs font-semibold text-slate-200 shadow-sm focus:outline-none focus:border-slate-700 transition-all duration-200 cursor-pointer"
              >
                <option value="">Best Match</option>
                <option value="stars">Most Stars</option>
                <option value="forks">Most Forks</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>
          }
        </div>

        {!debounceValue && (
          <div className="mt-4 border border-slate-900/60 bg-slate-950/20 backdrop-blur-md rounded-2xl p-8 text-center shadow-inner max-w-xl mx-auto flex flex-col items-center justify-center gap-4 w-full">
            <div className="p-3 bg-slate-950/60 border border-slate-800/60 text-slate-400 rounded-2xl">
              <Search className="w-6 h-6 text-slate-300" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-200">
                Begin Your Search
              </h2>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Type a repository name, project theme, or developer keyword
                above to query GitHub.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mr-1">
                Try searching:
              </span>
              {["react", "tailwindcss", "nextjs", "shadcn"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQueryParam(tag)}
                  className="text-xs font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Display Rendering Engine Area Switching Block */}
        {debounceValue && (
          <div className="w-full">
            {isInfiniteMode ? (
              <VirtualRepositoryList
                repos={currentRepos}
                fetchNextPage={infiniteQuery.fetchNextPage}
                hasNextPage={infiniteQuery.hasNextPage}
                isFetchingNextPage={infiniteQuery.isFetchingNextPage}
                isLoading={isLoading}
                isError={isError}
                error={error}
              />
            ) : (
              <RepositoryList
                repos={currentRepos}
                isLoading={isLoading}
                isFetching={paginationQuery.isFetching}
                isError={isError}
                error={error}
                debounceValue={debounceValue}
              />
            )}
          </div>
        )}

        {/* STANDARD PAGINATION BAR */}
        {!isInfiniteMode &&
          !isLoading &&
          !isError &&
          debounceValue &&
          currentRepos.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-900/80 pt-5">
              <div className="text-xs text-slate-400 font-medium text-center sm:text-left">
                Showing page{" "}
                <span className="font-mono font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800/40">
                  {page}
                </span>{" "}
                of{" "}
                <span className="font-mono font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800/40">
                  {Math.ceil(totalCount / 10).toLocaleString()}
                </span>{" "}
                <span className="mx-1 text-slate-800">|</span>{" "}
                {totalCount.toLocaleString()} total results
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-slate-300 shadow-xs hover:bg-slate-800 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!hasNextPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-slate-300 shadow-xs hover:bg-slate-800 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

export default GitHubRepoSearch;
