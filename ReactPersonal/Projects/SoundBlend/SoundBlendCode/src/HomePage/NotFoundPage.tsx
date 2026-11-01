import { Link } from "react-router-dom";
import { t } from "../SearchPage/constants/messages";

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold text-zinc-100">{t("notfound.title")}</h1>
      <Link
        to="/"
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
      >
        {t("notfound.back")}
      </Link>
    </div>
  );
}
