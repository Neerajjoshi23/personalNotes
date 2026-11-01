import { Link } from "react-router-dom";
import { Music2, Pause, Play, Volume2 } from "lucide-react";
import { MAX_TRACK, useTracks } from "../../Store/useTracks";
import { t } from "../../SearchPage/constants/messages";
import { BlendTrackRow } from "../Components/BlendTrackRow";

const BlendPage = () => {
  const ids = useTracks((s) => s.tracks.map((t) => t.id).join(","));
  const isMasterPlaying = useTracks((s) => s.isMasterPlaying);
  const masterVolume = useTracks((s) => s.masterVolume);
  const toggleMasterPlaying = useTracks((s) => s.toggleMasterPlaying);
  const setMasterVolume = useTracks((s) => s.setMasterVolume);
  const hasActive = useTracks((s) => s.tracks.some((t) => t.isIncluded));

  const trackIds = ids ? ids.split(",") : [];

  return (
    <div className="flex h-full flex-col p-4 text-white sm:p-6 lg:px-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("blend.title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("blend.subtitle", { count: trackIds.length, max: MAX_TRACK })}
          </p>
        </div>
      </div>

      {trackIds.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-white/5 text-zinc-500">
            <Music2 size={26} />
          </div>
          <p className="text-lg font-semibold text-zinc-200">
            {t("blend.emptyTitle")}
          </p>
          <p className="text-sm text-zinc-500">{t("blend.emptyBody")}</p>
          <Link
            to="/Search"
            className="mt-2 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-indigo-400"
          >
            {t("blend.emptyCta")}
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <aside className="flex flex-col gap-6 self-start rounded-2xl bg-gradient-to-b from-indigo-500/15 to-white/[0.03] p-6 max-lg:w-full lg:w-80 lg:flex-shrink-0">
            <button
              type="button"
              disabled={!hasActive}
              onClick={toggleMasterPlaying}
              aria-label={isMasterPlaying ? t("blend.pause") : t("blend.play")}
              className="mx-auto flex size-20 items-center justify-center rounded-full bg-indigo-500 shadow-xl shadow-indigo-500/30 transition hover:scale-105 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {isMasterPlaying ? (
                <Pause size={32} fill="currentColor" />
              ) : (
                <Play size={32} fill="currentColor" className="ml-1" />
              )}
            </button>
            <p className="text-center text-sm font-medium text-zinc-300">
              {isMasterPlaying ? t("blend.pause") : t("blend.play")}
            </p>
            <label className="flex flex-col gap-2 text-xs font-semibold text-zinc-400">
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Volume2 size={14} />
                  {t("blend.master")}
                </span>
                <span className="font-mono tabular-nums">
                  {Math.round(masterVolume * 100)}%
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer accent-indigo-500"
              />
            </label>
            {!hasActive && (
              <p className="text-center text-xs text-zinc-500">
                {t("blend.nothingActive")}
              </p>
            )}
          </aside>

          <ul className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {trackIds.map((id) => (
              <BlendTrackRow key={id} id={id} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
export default BlendPage;
