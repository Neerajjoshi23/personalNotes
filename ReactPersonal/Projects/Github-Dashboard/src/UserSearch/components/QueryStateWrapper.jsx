import React from "react";

export default function QueryStateWrapper({
  query,
  emptyMessage = "NO_DATA_AVAILABLE",
  isEmpty,
  children,
}) {
  const { isLoading, isFetching, isError, error } = query;

  // 1. Initial Hard Loading State
  if (isLoading) {
    return (
      <div className="w-full h-48 bg-slate-950/20 backdrop-blur-xl border border-slate-800/40 rounded-xl flex items-center justify-center p-6 animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
            Fetching Node Stream...
          </span>
        </div>
      </div>
    );
  }

  // 2. Error Fallback State
  if (isError) {
    return (
      <div className="w-full bg-red-950/10 backdrop-blur-xl border border-red-900/40 rounded-xl p-5 flex items-start gap-3">
        <div className="text-[10px] font-mono bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-800/30">
          ERR_STREAM
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-semibold text-red-300">
            Pipeline Handshake Failure
          </h4>
          <p className="text-[10px] font-mono text-red-400/70">
            {error?.message || "Internal network mismatch."}
          </p>
        </div>
      </div>
    );
  }

  // 3. Checked Empty State
  if (isEmpty) {
    return (
      <div className="w-full bg-slate-950/30 border border-slate-800/40 rounded-xl p-12 text-center border-dashed">
        <span className="text-[10px] font-mono text-slate-600 block mb-1">
          // NULL
        </span>
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {emptyMessage}
        </h4>
      </div>
    );
  }

  // 4. Live Hydrated Rendering
  return (
    <div className="relative w-full h-full">
      {/* Visual Live Update Anchor */}
      {isFetching && (
        <div className="absolute top-0 right-0 -mt-7 flex items-center gap-1.5 text-[10px] font-mono text-indigo-400 animate-pulse bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 z-20">
          <span className="h-1 w-1 rounded-full bg-indigo-400" />
          REVALIDATING
        </div>
      )}
      {children}
    </div>
  );
}
