import { useEffect, useRef } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { decodeHtml } from "../../SearchPage/utils/decodeHtml";
import { useTracks } from "../../Store/useTracks";
import { t } from "../../SearchPage/constants/messages";

type Props = { id: string };

const FALLBACK_ART = "https://placehold.co/44x44/18181b/6366f1?text=%E2%99%AA";

export function BlendTrackRow({ id }: Props) {
  const track = useTracks((s) => s.tracks.find((t) => t.id === id));
  const isMasterPlaying = useTracks((s) => s.isMasterPlaying);
  const masterVolume = useTracks((s) => s.masterVolume);
  const toggleInclusion = useTracks((s) => s.toggleIndividualInclusion);
  const setVolume = useTracks((s) => s.setIndividualVolume);
  const deleteTrack = useTracks((s) => s.deleteTrack);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isIncluded = track?.isIncluded ?? false;
  const volume = track?.volume ?? 1;

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = masterVolume * volume;
  }, [masterVolume, volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isMasterPlaying && isIncluded) el.play().catch(() => {});
    else el.pause();
  }, [isMasterPlaying, isIncluded]);

  if (!track) return null;

  const mins = String(Math.floor(track.duration / 60)).padStart(2, "0");
  const secs = String(track.duration % 60).padStart(2, "0");
  const live = isMasterPlaying && isIncluded;

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl p-3 transition sm:flex-nowrap ${
        isIncluded
          ? "bg-white/[0.06] hover:bg-white/10"
          : "bg-white/[0.02] opacity-60"
      }`}
    >
      <audio ref={audioRef} src={track.audio} loop />
      <div className="relative size-11 flex-shrink-0 overflow-hidden rounded-lg">
        <img
          src={track.artworkUrl || FALLBACK_ART}
          alt=""
          className="h-full w-full object-cover"
        />
        {live && (
          <span className="absolute inset-0 flex items-end justify-center gap-0.5 bg-black/50 pb-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 animate-pulse rounded-sm bg-indigo-300"
                style={{
                  height: `${8 + ((i * 7) % 12)}px`,
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium text-zinc-100">
          {decodeHtml(track.name)}
        </p>
        <p className="truncate text-xs text-zinc-500">{track.artistName}</p>
      </div>
      <span className="font-mono text-xs tabular-nums text-zinc-500">
        {mins}:{secs}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        aria-label={t("blend.volume", { name: track.name })}
        onChange={(e) => setVolume(id, Number(e.target.value))}
        className="h-1.5 w-28 cursor-pointer accent-indigo-500"
      />
      <button
        type="button"
        aria-pressed={isIncluded}
        onClick={() => toggleInclusion(id)}
        className={`flex w-24 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
          isIncluded
            ? "bg-indigo-500 text-white hover:bg-indigo-400"
            : "border border-white/10 text-zinc-400 hover:text-white"
        }`}
      >
        {isIncluded ? <Volume2 size={14} /> : <VolumeX size={14} />}
        {isIncluded ? t("blend.include") : t("blend.muted")}
      </button>
      <button
        type="button"
        aria-label={t("blend.remove", { name: track.name })}
        onClick={() => deleteTrack(id)}
        className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
      >
        <X size={16} />
      </button>
    </li>
  );
}
