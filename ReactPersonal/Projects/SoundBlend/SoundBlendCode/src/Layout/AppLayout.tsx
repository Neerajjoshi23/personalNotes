import { NavLink, Outlet } from "react-router-dom";
import { AudioLines, Home, Layers, Search } from "lucide-react";
import { useTracks } from "../Store/useTracks";
import { t } from "../SearchPage/constants/messages";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-white/10 text-white"
      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
  }`;

export default function AppLayout() {
  const count = useTracks((s) => s.tracks.length);

  const nav = (
    <>
      <NavLink to="/" end className={linkClass}>
        <Home size={18} />
        {t("nav.home")}
      </NavLink>
      <NavLink to="/Search" className={linkClass}>
        <Search size={18} />
        {t("nav.search")}
      </NavLink>
      <NavLink to="/Blend" className={linkClass}>
        <Layers size={18} />
        {t("nav.blend")}
        {count > 0 && (
          <span className="ml-auto min-w-5 rounded-full bg-indigo-500 px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
            {count}
          </span>
        )}
      </NavLink>
    </>
  );

  const logo = (
    <NavLink to="/" className="flex items-center gap-2 text-white">
      <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500">
        <AudioLines size={18} />
      </span>
      <span className="text-base font-bold tracking-tight">
        {t("app.name")}
      </span>
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-[#09090d] text-zinc-100 antialiased">
      <aside className="hidden w-60 flex-shrink-0 flex-col gap-6 border-r border-white/5 p-4 lg:flex">
        <div className="px-1 pt-1">{logo}</div>
        <nav className="flex flex-col gap-1">{nav}</nav>
        <p className="mt-auto px-3 text-xs text-zinc-600">{t("app.credit")}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 px-4 lg:hidden">
          {logo}
          <nav className="flex items-center gap-1">{nav}</nav>
        </header>
        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
