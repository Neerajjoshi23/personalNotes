import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { fetchJamendoSongs } from "../api/fetchSongs";
import { Limit } from "../constants/constant";
import type { FetchFilter, InfiniteQueryResponse } from "../types";

export default function useTracksInfiniteQuery(
  filters: FetchFilter,
  enabled: boolean = true,
) {
  return useInfiniteQuery<
    InfiniteQueryResponse,
    Error,
    InfiniteData<InfiniteQueryResponse>,
    readonly [string, FetchFilter],
    number
  >({
    queryKey: ["search-songs", filters],
    queryFn: ({ pageParam, signal }) =>
      fetchJamendoSongs({ ...filters, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.length * Limit;
      const total = Number(lastPage.totalItems);
      if (lastPage.data.length < Limit) return undefined;
      if (Number.isFinite(total) && loaded >= total) return undefined;
      return loaded;
    },
    staleTime: Infinity,
    enabled,
  });
}
