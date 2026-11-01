import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUsers } from "../API/api";
import { useState } from "react";

export const InfiniteScroll = () => {
  const [scrollTop, setScrollTop] = useState(0);

  const { data, hasNextPage, fetchNextPage, status, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["users"],
      queryFn: fetchUsers,
      initialPageParam: 1, // Mandatory property in TanStack Query v5!
      getNextPageParam: (lastPage, allPages) => {
        // Assuming lastPage is a flat array of users returned by fetchUsers
        return lastPage.length === 10 ? allPages.length + 1 : undefined;
      },
    });

  // Guard status screens up top before accessing data array structures
  if (status === "pending") return <div>Loading initial records...</div>;
  if (status === "error") return <div>Error fetching data</div>;
  console.log(data);
  // 1. FIXED: Flatten nested page structures into a single continuous array map
  const allUsers = data ? data.pages.flatMap((page) => page) : [];

  // Configuration Metrics (Keep them as real numbers, not string data)
  const buffer = 3;
  const itemHeight = 100;

  function handleScroll(e) {
    const target = e.currentTarget;
    const currentScrollPosition = target.scrollTop;
    setScrollTop(currentScrollPosition);

    const remaining =
      target.scrollHeight - target.clientHeight - currentScrollPosition;

    if (remaining < 500 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }

  // 2. Bound Calculations
  const visibleCount = Math.ceil(window.innerHeight / itemHeight);
  const currentVisibleStart = Math.floor(scrollTop / itemHeight);

  const finalStart = Math.max(0, currentVisibleStart - buffer);
  const finalEnd = Math.min(
    allUsers.length,
    currentVisibleStart + visibleCount + buffer,
  );

  // 3. FIXED: Slice directly from the flattened data array structure
  const visibleUsers = allUsers.slice(finalStart, finalEnd);

  return (
    // Outer frame container handling overflow
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflowY: "auto",
        position: "relative",
        backgroundColor: "#f9f9f9",
      }}
      onScroll={handleScroll}
    >
      {/* FIXED: Massive invisible canvas calculating height dynamically using JS math */}
      <div
        style={{
          height: `${allUsers.length * itemHeight}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {/* FIXED: Loop over individual elements so each card anchors cleanly */}
        {visibleUsers.map((user, index) => {
          // Reconstruct global location coordinates index
          const globalIndex = finalStart + index;
          const topPosition = globalIndex * itemHeight;

          return (
            <div
              key={user.id}
              style={{
                position: "absolute",
                top: `${topPosition}px`,
                height: `${itemHeight}px`,
                width: "100%",
                boxSizing: "border-box",
                borderBottom: "1px solid #ccc",
                display: "flex",
                alignItems: "center",
                padding: "10px",
                backgroundColor: "white",
              }}
            >
              <img
                src={user.avatar_url}
                alt={user.login}
                width={50}
                height={50}
                style={{ borderRadius: "50%", marginRight: "15px" }}
              />
              <p style={{ fontWeight: "bold" }}>{user.login}</p>
            </div>
          );
        })}

        {/* Loading status indicator tracking element row positioning at baseline */}
        {isFetchingNextPage && (
          <div
            style={{
              position: "absolute",
              top: `${allUsers.length * itemHeight}px`,
              height: "50px",
              width: "100%",
              textAlign: "center",
              lineHeight: "50px",
              background: "#eee",
            }}
          >
            Loading more entries...
          </div>
        )}
      </div>
    </div>
  );
};
