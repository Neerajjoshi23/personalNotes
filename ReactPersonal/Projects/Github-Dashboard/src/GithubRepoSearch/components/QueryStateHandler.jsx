// components/QueryStateHandler.jsx
import { Loader2, AlertTriangle, Inbox } from "lucide-react";

export default function QueryStateHandler({
  query,
  loadingText = "Loading...",
  errorText = "Unable to load data.",
  emptyText = "No data found.",
  children,
}) {
  // 1. Premium Animated Loading State (Blends with dark mesh)
  if (query.isLoading) {
    return (
      <div className="w-full p-6 flex flex-col items-center justify-center gap-2 text-sm font-medium text-slate-400 bg-slate-950/20 border border-slate-800/60 rounded-xl shadow-inner animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
        <span>{loadingText}</span>
      </div>
    );
  }

  // 2. Premium Frosted Error Alert State
  if (query.isError) {
    return (
      <div className="w-full p-5 flex items-start gap-3 text-sm font-medium text-rose-300 bg-rose-950/20 border border-rose-900/40 rounded-xl shadow-sm">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-rose-200">
            Data Fetching Failed
          </span>
          <span className="text-xs text-rose-400/90">{errorText}</span>
        </div>
      </div>
    );
  }

  // 3. Premium Frosted Empty/Blank Data State
  if (!query.data || (Array.isArray(query.data) && query.data.length === 0)) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center text-center gap-3 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl shadow-xs">
        <div className="p-2.5 bg-slate-950/60 text-slate-500 rounded-xl border border-slate-800/60">
          <Inbox className="w-5 h-5 text-slate-400" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-semibold text-slate-200">
            No Information Available
          </h4>
          <p className="text-xs text-slate-500 max-w-xs">{emptyText}</p>
        </div>
      </div>
    );
  }

  return children(query.data);
}
