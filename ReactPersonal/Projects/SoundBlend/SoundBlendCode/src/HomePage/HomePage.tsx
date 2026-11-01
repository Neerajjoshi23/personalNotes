import { Link } from "react-router-dom";
import { Layers, Search, SlidersHorizontal } from "lucide-react";
import { MAX_TRACK } from "../Store/useTracks";
import { t } from "../SearchPage/constants/messages";

const features = [
  { icon: Search, title: "home.f1.title", body: "home.f1.body" },
  { icon: Layers, title: "home.f2.title", body: "home.f2.body" },
  { icon: SlidersHorizontal, title: "home.f3.title", body: "home.f3.body" },
] as const;

export default function HomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-10">
      <div className="flex max-w-2xl flex-col items-center gap-5 text-center">
        <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
          {t("home.eyebrow")}
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {t("home.title")}
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-zinc-400">
          {t("home.subtitle", { max: MAX_TRACK })}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            to="/Search"
            className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            {t("home.cta")}
          </Link>
          <Link
            to="/Blend"
            className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
          >
            {t("home.blend")}
          </Link>
        </div>
      </div>

      <div className="mt-14 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl border border-white/5 bg-white/[0.03] p-5"
          >
            <Icon size={20} className="mb-3 text-indigo-400" />
            <h2 className="mb-1 text-sm font-semibold text-zinc-100">
              {t(title, { max: MAX_TRACK })}
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500">{t(body)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
