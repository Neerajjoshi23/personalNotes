import useDebounce from "../Hooks/useDebounce";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchBar from "../../Shared/components/SearchBar";
import UserCard from "../components/UserCard";
import { fetchSearchedUsers } from "../api/user";

export default function UserSearchPage() {
  const [queryParam, setQueryParam] = useState("");
  const [page, setPage] = useState(1);
  const debounceValue = useDebounce(queryParam, 500);

  // Reset page position to page 1 whenever a brand new query token is entered
  useEffect(() => {
    setPage(1);
  }, [debounceValue]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["searchUsers", debounceValue, page],
    queryFn: () => fetchSearchedUsers(debounceValue, page),
    enabled: !!debounceValue,
  });

  const users = data?.items || [];
  const totalCount = data?.total_count || 0;

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="relative min-h-screen w-full bg-slate-900 text-slate-100 overflow-hidden px-6 py-8">
      {/* Mesh Canvas Background Blur Vectors */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Application Header Panel with Operational Info */}
        <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-slate-950/50 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
              <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
                Ecosystem Registry Explorer
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Query global developer nodes across the network indices to parse
              identity profiles, access rights, and public profile metrics.
            </p>
          </div>

          {/* Wrapper for your un-modified white layout SearchBar */}
          <div className="w-full md:w-auto flex flex-col items-end gap-2">
            <SearchBar
              queryParam={queryParam}
              setQueryParam={setQueryParam}
              title="Users"
            />

            {/* Live Synchronizer Context Feedback */}
            {isFetching && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400 animate-pulse self-start md:self-auto">
                <span className="h-1 w-1 rounded-full bg-indigo-400" />
                Querying downstream registry endpoints...
              </div>
            )}
          </div>
        </div>

        {/* --- DYNAMIC CONDITIONAL CONDITIONAL HANDLERS --- */}

        {/* CONDITION 1: Initial Empty Idle State (Awaiting query parameter) */}
        {!queryParam && !debounceValue && !isLoading && (
          <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-20 text-center border-dashed">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400 font-mono text-sm">
              //
            </div>
            <h3 className="text-sm font-medium text-slate-200">
              Awaiting Search Input
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Use the module interface control above or invoke{" "}
              <kbd className="bg-slate-900 px-1 py-0.5 rounded text-slate-400 text-[10px] border border-slate-800">
                ⌘K
              </kbd>{" "}
              to initiate a remote node cluster filter request.
            </p>
          </div>
        )}

        {/* CONDITION 2: Active User Query Typing / Network Handshaking State */}
        {(queryParam !== debounceValue || isLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-xl p-5 animate-pulse flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-slate-800/80 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-800/80 rounded w-1/2" />
                  <div className="h-3 bg-slate-800/40 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONDITION 3: Global Network Query Failure Frame */}
        {isError && !isLoading && (
          <div className="bg-red-950/10 backdrop-blur-xl border border-red-900/40 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-900/20 text-red-400 font-mono text-xs border border-red-800/30">
              FATAL_ERR
            </div>
            <div>
              <h3 className="text-xs font-semibold text-red-300">
                Handshake Interrupted
              </h3>
              <p className="text-[11px] text-red-400/70 mt-1">
                {error?.message ||
                  "The requested developer sequence index has dropped packets or timed out."}
              </p>
            </div>
          </div>
        )}

        {/* CONDITION 4: No Match Found State (Search performed, zero hits parsed) */}
        {debounceValue &&
          queryParam === debounceValue &&
          !isLoading &&
          !isError &&
          users.length === 0 && (
            <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-amber-500/80 font-mono text-xs">
                0x0
              </div>
              <h3 className="text-sm font-medium text-slate-200">
                No Matching Matrix Results
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                We parsed the registry logs for{" "}
                <span className="text-slate-300 font-mono">
                  &ldquo;{debounceValue}&rdquo;
                </span>{" "}
                but zero identity hashes match your query sequence.
              </p>
            </div>
          )}

        {/* CONDITION 5: Successful Pipeline Fetch Data Output */}
        {debounceValue &&
          queryParam === debounceValue &&
          !isLoading &&
          !isError &&
          users.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>

              {/* Pagination Controls Footer Shield */}
              <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-xl px-6 py-4 flex items-center justify-between shadow-2xl">
                <div className="text-xs font-mono text-slate-400">
                  Records index:{" "}
                  <span className="text-indigo-400 font-bold">{page}</span> /{" "}
                  <span className="text-slate-300">{totalPages || 1}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1 || isFetching}
                    className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800/60 hover:-translate-y-0.5 disabled:hover:transform-none transition-all duration-200"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() =>
                      setPage((prev) =>
                        users.length === ITEMS_PER_PAGE ? prev + 1 : prev,
                      )
                    }
                    disabled={
                      users.length < ITEMS_PER_PAGE ||
                      page === totalPages ||
                      isFetching
                    }
                    className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800/60 hover:-translate-y-0.5 disabled:hover:transform-none transition-all duration-200"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
