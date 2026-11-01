// components/SearchBar.jsx
import React, { useRef, useEffect } from "react";
import { Search } from "lucide-react";

export default function SearchBar({ setQueryParam, queryParam, title }) {
  const inputRef = useRef(null);

  // Automatically focus input when pressing Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="w-full max-w-md">
      <label htmlFor="search" className="sr-only">
        Search {title}
      </label>

      {/* Frosted glass search wrapper containing premium focus layout mechanics */}
      <div className="relative group rounded-xl border border-slate-800/60 bg-slate-950/40 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-slate-700/80 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10">
        {/* Decorative Internal Input Search Accent Light */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Search className="h-4 w-4 text-slate-500 transition-colors duration-200 group-focus-within:text-blue-400" />
        </div>

        <input
          ref={inputRef}
          id="search"
          type="text"
          autoComplete="off"
          placeholder={`Search GitHub ${title}...`}
          className="block w-full rounded-xl bg-transparent py-3 pl-10 pr-16 text-sm font-medium text-slate-200 placeholder-slate-500 focus:outline-none"
          value={queryParam}
          onChange={(e) => setQueryParam(e.target.value)}
        />

        {/* Technical Keycap Indicator Block */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 select-none pointer-events-none">
          <kbd className="inline-flex items-center gap-0.5 rounded border border-slate-800 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400 shadow-sm group-hover:border-slate-700 transition-all duration-300 group-focus-within:text-slate-200 group-focus-within:border-slate-700">
            <span className="text-[11px] font-sans">⌘</span>K
          </kbd>
        </div>
      </div>
    </div>
  );
}
