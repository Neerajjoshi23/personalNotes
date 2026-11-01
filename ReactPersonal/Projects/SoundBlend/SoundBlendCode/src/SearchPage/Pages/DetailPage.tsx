import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ListSkeleton from "../Components/ListSkeleton";
import { decodeHtml } from "../utils/decodeHtml";
import useTracksInfiniteQuery from "../Hooks/useTracksInfiniteQuery";
import InfiniteScrollList from "../Components/InfiniteScrollList";
import { t } from "../constants/messages";
import type { FetchFilter } from "../types";

const KINDS = ["artists", "albums"] as const;
type Kind = (typeof KINDS)[number];

export default function DetailPage() {
  const { kind, id } = useParams<{ kind: string; id: string }>();
  const valid = KINDS.includes(kind as Kind) && !!id;

  const filters: FetchFilter = {
    query: "",
    genre: "all",
    mood: "all",
    order: "popularity_total",
    category: "tracks",
    artistId: kind === "artists" ? id : undefined,
    albumId: kind === "albums" ? id : undefined,
  };

  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useTracksInfiniteQuery(filters, valid);

  const tracks = data?.pages.flatMap((page) => page.data) ?? [];
  const first = tracks[0];
  const title =
    first && "artistName" in first
      ? kind === "albums" && "albumName" in first
        ? (first.albumName ?? first.artistName)
        : first.artistName
      : "";

  return (
    <div className="flex h-full flex-col p-4 text-white sm:p-6 lg:px-10">
      <div className="mb-4 flex flex-shrink-0 flex-col gap-3">
        <Link
          to="/Search"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          {t("detail.back")}
        </Link>
        <div className="flex items-center gap-4">
          {first?.artworkUrl && (
            <img
              src={first.artworkUrl}
              alt=""
              className="size-20 rounded-xl object-cover shadow-lg"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              {kind === "albums" ? t("category.albums") : t("category.artists")}
            </p>
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {decodeHtml(title ?? "")}
            </h1>
          </div>
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 border-t border-white/5 pt-2">
        {!valid || error ? (
          <div className="py-12 text-center text-sm text-red-400">
            {t("state.error")}
          </div>
        ) : isFetching && tracks.length === 0 ? (
          <ListSkeleton />
        ) : tracks.length > 0 ? (
          <InfiniteScrollList
            tracks={tracks}
            hasMore={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            category="tracks"
          />
        ) : (
          <div className="py-16 text-center text-sm text-zinc-500">
            {t("state.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
