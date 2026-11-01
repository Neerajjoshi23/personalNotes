import { useEffect, useState, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import useDebounce from "../Hooks/useDebounce";
import { Category, ViewMode } from "../constants/constant";
import {
  Genre,
  Mood,
  Order,
  Order as OrderType,
} from "../constants/constant";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import ListSkeleton from "../Components/ListSkeleton";
import useTracksInfiniteQuery from "../Hooks/useTracksInfiniteQuery";
import { fetchAutoComplete as fetchJamendoAutocomplete } from "../api/fetchSongs";
import InfiniteScrollList from "../Components/InfiniteScrollList";
import PaginatedList from "../Components/PaginatedList";
import { t } from "../constants/messages";
import type {
  AutoCompleteParams,
  AutoCompleteResponse,
  FetchFilter,
} from "../types";

// Accept only known values from the URL, otherwise fall back to the default
function pick<T extends string>(list: readonly T[], value: string | null): T {
  return list.find((item) => item === value) ?? list[0];
}

export default function SearchPage() {
  // Committed search state lives in the URL so Back / refresh / shared links restore it
  const [params, setParams] = useSearchParams();
  const activeSearch = params.get("q") ?? "";
  const genre = pick(Genre, params.get("genre"));
  const mood = pick(Mood, params.get("mood"));
  const order = pick(Order, params.get("order"));
  const category = pick(Category, params.get("category"));

  const setParam = (key: string, value: string, defaultValue = "") => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === defaultValue) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  // `search` is only the raw input text; it is written to the URL on debounce or submit
  const [search, setSearch] = useState<string>(activeSearch);
  const debouncedSearch = useDebounce(search, 500);
  useEffect(() => {
    setParam("q", debouncedSearch.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  const [open, setOpen] = useState(false);
  const autoCompleteSuggestions = useDebounce(search, 500).trim();
  const [viewMode, setViewMode] = useState<ViewMode>("infinite");

  const filters: FetchFilter = {
    query: activeSearch,
    genre,
    mood,
    order,
    category,
  };
  const AutoCompleteParams: AutoCompleteParams = {
    prefix: autoCompleteSuggestions,
    entity: category,
  };

  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useTracksInfiniteQuery(
    filters,
    activeSearch.trim() !== "" ||
      (category === "tracks" && (genre !== "all" || mood !== "all")),
  );
  const { data: autoCompleteOptions } =
    useQuery<
      AutoCompleteResponse,
      Error,
      AutoCompleteResponse,
      readonly [string, AutoCompleteParams]
    >({
      queryKey: ["autocomplete", AutoCompleteParams],
      queryFn: ({ signal }) =>
        fetchJamendoAutocomplete(AutoCompleteParams, signal),
      enabled: open && autoCompleteSuggestions.length >= 2,
      staleTime: 5 * 60 * 1000,
    });

  const suggestions =
    autoCompleteSuggestions.length >= 2
      ? (autoCompleteOptions?.results[category] ?? [])
      : [];
  const showSuggestions = open && suggestions.length > 0;
  const pages = data?.pages ?? [];
  const allTracks = pages?.flatMap((page) => page.data) ?? [];
  const hasMore = !!hasNextPage;
  const filtersKey = JSON.stringify([
    activeSearch,
    genre,
    mood,
    order,
    category,
  ]);
  const isTracks = category === "tracks";

  const selectClass =
    "cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 outline-none transition hover:bg-white/10 focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 [color-scheme:dark]";

  return (
    <div className="flex h-full flex-col px-4 pt-6 sm:px-8">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {t("search.title")}
        </h1>
        <p className="mb-5 mt-1 text-sm text-zinc-500">
          {t("search.subtitle")}
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
            <form
              className="relative flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setParam("q", search.trim());
                setOpen(false);
              }}
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-400 focus:bg-white/[0.07]"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                  }}
                  placeholder={t("search.placeholder")}
                  autoComplete="off"
                />
                <SearchIcon
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                {showSuggestions && (
                  <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-[#14141c] py-1 shadow-2xl">
                    {suggestions.map((s) => (
                      <li key={s}>
                        {/* mousedown fires before the input's blur closes the list */}
                        <button
                          type="button"
                          className="w-full truncate px-4 py-2 text-left text-sm text-zinc-300 hover:bg-white/10 hover:text-white"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearch(s);
                            setParam("q", s);
                            setOpen(false);
                          }}
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="submit"
                className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                {t("search.button")}
              </button>
            </form>

            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              {ViewMode.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition ${
                    viewMode === mode
                      ? "bg-white/15 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t(mode === "infinite" ? "view.infinite" : "view.paginated")}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              {Category.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setParam("category", c, Category[0])}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    category === c
                      ? "bg-indigo-500 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t(`category.${c}`)}
                </button>
              ))}
            </div>
            <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
            <select
              className={selectClass}
              value={genre}
              disabled={!isTracks}
              onChange={(e) => setParam("genre", e.target.value, Genre[0])}
            >
              <option value="all">{t("filter.allGenres")}</option>
              {Genre.filter((g) => g !== "all").map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              value={mood}
              disabled={!isTracks}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setParam("mood", e.target.value, Mood[0])
              }
            >
              <option value="all">{t("filter.allMoods")}</option>
              {Mood.filter((m) => m !== "all").map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              className={`${selectClass} ml-auto`}
              value={order}
              disabled={!isTracks}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setParam("order", e.target.value, Order[0])
              }
            >
              {Order.map((o: OrderType) => (
                <option key={o} value={o}>
                  {t("filter.sort", { value: o.replace("_", " ") })}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 w-full flex-1 pb-2">
          {error ? (
            <div className="py-12 text-center text-sm text-red-400">
              {t("state.error")}
            </div>
          ) : isFetching && allTracks.length === 0 ? (
            <ListSkeleton />
          ) : allTracks.length > 0 ? (
            viewMode === "infinite" ? (
              <InfiniteScrollList
                tracks={allTracks}
                hasMore={hasMore}
                isFetchingNextPage={isFetchingNextPage}
                category={category}
                fetchNextPage={fetchNextPage}
              />
            ) : (
              <PaginatedList
                key={filtersKey}
                pages={pages}
                hasMore={hasMore}
                category={category}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            )
          ) : isFetching || data ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              {t("state.empty")}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-zinc-600">
              {t("state.idle")}
            </div>
          )}
        </div>
    </div>
  );
}
