import { useEffect, useRef, type CSSProperties } from "react";
import { MAX_TRACK, useTracks } from "../../Store/useTracks";
import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { decodeHtml } from "../utils/decodeHtml";
import type { InfiniteQueryResponse } from "../types";
import type { CategoryType } from "../constants/constant";
import { t } from "../constants/messages";

interface TrackProps {
  track: InfiniteQueryResponse["data"][number];
  index: number;
  style?: CSSProperties;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  category: CategoryType;
}

const FALLBACK_ART = "https://placehold.co/40x40/18181b/6366f1?text=%E2%99%AA";

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export function Track({
  track,
  index,
  style,
  isPlaying,
  onPlay,
  onPause,
  category,
}: TrackProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const addTrack = useTracks((state) => state.addTrack);
  const inBlend = useTracks((state) =>
    state.tracks.some((t) => t.id === track.id),
  );
  const blendFull = useTracks(
    (state) => state.tracks.length >= MAX_TRACK && !inBlend,
  );
  const deleteTrack = useTracks((state) => state.deleteTrack);
  useEffect(() => {
    if (!isPlaying) audioRef.current?.pause();
  }, [isPlaying]);

  const imageUrl = track.artworkUrl;
  const displayName = decodeHtml(track.name);

  // Tracks and albums show the artist, artists show their website or join date
  const subTitle =
    "artistName" in track
      ? track.artistName
      : (track.website ?? track.joinDate ?? t("track.artistProfile"));

  return (
    <li
      style={style}
      className="group flex h-14 w-full items-center justify-between gap-3 rounded-lg px-3 transition-colors hover:bg-white/5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <span className="hidden w-6 text-center text-xs tabular-nums text-zinc-600 sm:block">
          {index + 1}
        </span>

        <img
          src={imageUrl || FALLBACK_ART}
          alt={t("track.artworkAlt", { name: displayName })}
          className="size-10 flex-shrink-0 rounded-md object-cover"
        />

        <div className="flex min-w-0 flex-col">
          {category === "tracks" ? (
            <span className="truncate text-sm font-medium text-zinc-100">
              {displayName}
            </span>
          ) : (
            <Link
              to={`/Search/${category}/${track.id}`}
              className="truncate text-sm font-medium text-zinc-100 hover:text-indigo-300 hover:underline"
            >
              {displayName}
            </Link>
          )}
          <span className="truncate text-xs text-zinc-500">{subTitle}</span>
        </div>
      </div>

      {/* "audio" in track checks if the current data contains track credentials */}
      {category === "tracks" && "audio" in track && "duration" in track && (
        <div className="flex flex-shrink-0 items-center gap-3 sm:gap-4">
          <audio
            ref={audioRef}
            controls
            className="hidden h-8 w-56 opacity-70 invert-[0.88] hue-rotate-[190deg] transition-opacity group-hover:opacity-100 md:block xl:w-72"
            onPlay={onPlay}
            onPause={onPause}
          >
            <source src={track.audio} type="audio/mpeg" />
            {t("track.noAudio")}
          </audio>

          <span className="hidden w-11 text-right font-mono text-xs tabular-nums text-zinc-500 sm:inline">
            {formatDuration(track.duration)}
          </span>
          <button
            type="button"
            disabled={blendFull}
            aria-pressed={inBlend}
            title={
              blendFull ? t("track.blendFull", { max: MAX_TRACK }) : undefined
            }
            onClick={() => (inBlend ? deleteTrack(track.id) : addTrack(track))}
            className={`flex w-24 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              inBlend
                ? "bg-indigo-500 text-white hover:bg-indigo-400"
                : "border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {inBlend ? <Check size={14} /> : <Plus size={14} />}
            {inBlend ? t("track.added") : t("track.add")}
          </button>
        </div>
      )}
    </li>
  );
}
