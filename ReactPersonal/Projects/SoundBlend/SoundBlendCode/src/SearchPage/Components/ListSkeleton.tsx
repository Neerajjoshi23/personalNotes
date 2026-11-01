export default function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-3 pt-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex h-14 animate-pulse items-center gap-4 px-4">
          <div className="h-3 w-5 rounded bg-white/5" />
          <div className="size-10 rounded-lg bg-white/5" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-1/3 rounded bg-white/10" />
            <div className="h-2.5 w-1/5 rounded bg-white/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
