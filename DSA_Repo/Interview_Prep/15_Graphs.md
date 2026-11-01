# Chapter 15 — Graphs

> **Revision target:** 1.5 days  
> **Goal:** After reading this file, you need nothing else for graphs — no YouTube, no code files, no tutorials. Every template, every algorithm, every trap is here.

---

## Table of Contents

1. [Graph Fundamentals](#1-graph-fundamentals)
2. [BFS — Breadth First Search](#2-bfs--breadth-first-search)
3. [DFS — Depth First Search](#3-dfs--depth-first-search)
4. [Cycle Detection](#4-cycle-detection)
5. [Topological Sort — DFS approach](#5-topological-sort--dfs-approach)
6. [Topological Sort — Kahn's BFS](#6-topological-sorts-bhss-kahns-algorithm)
7. [Shortest Paths — Unit Weight (BFS)](#7-shortest-paths--unit-weight-bfs)
8. [Shortest Path in DAG (Topo + Relax)](#8-shortest-path-in-dag)
9. [Dijkstra's Algorithm](#9-dijkstras-algorithm)
10. [Bellman-Ford Algorithm](#10-bellman-ford-algorithm)
11. [Floyd-Warshall Algorithm](#11-floyd-warshall-algorithm)
12. [Disjoint Set Union (DSU)](#12-disjoint-set-union-dsu)
13. [Kruskal's MST Algorithm](#13-kruskals-mst-algorithm)
14. [Prim's MST Algorithm](#14-prims-mst-algorithm)
15. [Bridges — Tarjan's Algorithm](#15-bridges--tarjans-algorithm)
16. [Articulation Points — Tarjan's Algorithm](#16-articulation-points--tarjans-algorithm)
17. [Kosaraju's SCC Algorithm](#17-kosarajus-scc-algorithm)
18. [Multi-source BFS Patterns](#18-multi-source-bfs-patterns)
19. [Things Most People Forget](#19-things-most-people-forget)
20. [Practice Problems](#20-practice-problems)
21. [Final Revision Sheet](#21-final-revision-sheet)

---

## 1. Graph Fundamentals

### What is a Graph

A graph is G = (V, E) where V = vertices (nodes) and E = edges (connections).

| Property | Undirected | Directed (Digraph) |
|----------|-----------|---------------------|
| Edge direction | Both ways | One way |
| Degree | Degree of node | In-degree + out-degree |
| Cycle detection | Easier — just track parent | Harder — need path tracking |
| BFS/DFS | Same template | Same template |

### Adjacency List — the standard representation

**Use this for sparse graphs (most interview problems).**

```cpp
// Unweighted undirected
vector<int> adj[V];
adj[u].push_back(v);
adj[v].push_back(u);  // both directions for undirected

// Weighted undirected
vector<pair<int,int>> adj[V];  // {neighbor, weight}
adj[u].push_back({v, w});
adj[v].push_back({u, w});

// Weighted directed
vector<vector<int>> adj[V];  // adj[u] = {{v, w}, {v2, w2}}
adj[u].push_back({v, w});    // only one direction
```

**From your code (BFS.cpp, DFS.cpp):** Both use `vector<int> adj[V]` — fixed-size array of vectors. The `addEdge` function adds both `adj[u].push_back(v)` and `adj[v].push_back(u)` for undirected. For directed, only add one direction.

### Adjacency Matrix — for dense graphs

```cpp
int mat[V][V] = {0};
mat[u][v] = 1;     // directed
mat[v][u] = 1;     // also add for undirected
// Weighted: mat[u][v] = weight
```

| | Adjacency List | Adjacency Matrix |
|--|---------------|-----------------|
| Space | O(V + E) | O(V²) |
| Edge lookup | O(degree) | O(1) |
| Iteration over neighbors | O(degree) | O(V) — scans whole row |
| When to use | Sparse graphs (E << V²) | Dense graphs, Floyd-Warshall |

### Connected Components

For disconnected graphs, a single BFS/DFS won't visit all nodes. Always loop:

```cpp
for (int i = 0; i < V; i++) {
    if (!vis[i]) {
        // start BFS/DFS from i — this is a new component
        bfs(i, adj, vis);
    }
}
```

**Interview pattern:** "How many islands/provinces/components?" — always uses this outer loop.

---

## 2. BFS — Breadth First Search

### The Pattern — memorize this cold

```cpp
vector<int> bfs(int start, vector<int> adj[], int V) {
    vector<int> vis(V, 0);
    vis[start] = 1;
    queue<int> q;
    q.push(start);
    vector<int> result;

    while (!q.empty()) {
        int node = q.front();
        q.pop();
        result.push_back(node);

        for (auto neighbor : adj[node]) {
            if (!vis[neighbor]) {
                vis[neighbor] = 1;
                q.push(neighbor);
            }
        }
    }
    return result;
}
```

**Output from your code:** `0 1 4 2 3` — BFS explores level by level. Node 0 → its neighbors {1, 4} → their neighbors {2, 3}.

**Why mark visited BEFORE pushing into queue (not after popping)?**
If you mark visited after popping, the same node can be pushed multiple times before it's processed — causing duplicate work and wrong results. Mark it as visited **the moment you decide to visit it**.

### Time and Space Complexity

- **Time:** O(V + E) — every node visited once (O(V)), every edge checked once (O(E) for directed, O(2E) for undirected)
- **Space:** O(V) — visited array + queue

### BFS gives shortest path in UNWEIGHTED graphs

BFS naturally explores level by level — nodes at distance 1 first, then distance 2, etc. This is why BFS = shortest path for unit-weight graphs.

### When to use BFS

- Shortest path in unweighted/unit-weight graph
- Level-order traversal
- Multi-source shortest path (start queue with multiple sources)
- Checking if graph is bipartite (2-coloring)
- Cycle detection in undirected graph

---

## 3. DFS — Depth First Search

### The Pattern — memorize this cold

```cpp
void dfs(int node, vector<int> adj[], int vis[], vector<int> &result) {
    vis[node] = 1;
    result.push_back(node);

    for (auto neighbor : adj[node]) {
        if (!vis[neighbor]) {
            dfs(neighbor, adj, vis, result);
        }
    }
}

// Caller
vector<int> dfsOfGraph(int V, vector<int> adj[]) {
    int vis[V] = {0};
    vector<int> result;
    dfs(0, adj, vis, result);
    return result;
}
```

**Output from your code:** `0 2 4 1 3` — DFS goes as deep as possible before backtracking. From 0, goes to 2, then 4 (can't go further), backtracks to 2 (no more neighbors), backtracks to 0, goes to 1, then 3.

### Time and Space Complexity

- **Time:** O(V + E)
- **Space:** O(V) — visited array + recursion stack (depth can be V in worst case for linear graph → stack overflow risk!)

### DFS vs BFS — when to choose

| BFS | DFS |
|-----|-----|
| Shortest path (unweighted) | Topological sort |
| Level-order problems | Cycle detection in directed graph |
| Multi-source spread | Connected components |
| Closest target | Path existence |
| Rotten Oranges, 01-Matrix | Maze problems, backtracking |

**The key insight:** BFS uses a queue (FIFO), explores level by level. DFS uses a stack (recursion = implicit stack), explores depth first. Both visit every node once = same time complexity.

### Iterative DFS (to avoid stack overflow)

```cpp
void dfsIterative(int start, vector<int> adj[], int V) {
    vector<int> vis(V, 0);
    stack<int> st;
    st.push(start);

    while (!st.empty()) {
        int node = st.top();
        st.pop();
        if (vis[node]) continue;
        vis[node] = 1;
        // process node
        for (auto neighbor : adj[node]) {
            if (!vis[neighbor]) st.push(neighbor);
        }
    }
}
```

**Note:** Iterative DFS with a stack visits in a different order than recursive DFS (neighbors pushed in reverse). For most problems this doesn't matter, but for topological sort you need the recursive version or careful handling.

---

## 4. Cycle Detection

### Cycle in Undirected Graph — BFS approach

**Key idea:** In undirected graph, a cycle exists if we reach a node that's already visited AND it's not the direct parent we came from.

```cpp
bool detectCycleUndirectedBFS(int src, vector<int> adj[], int vis[]) {
    vis[src] = 1;
    queue<pair<int,int>> q;  // {node, parent}
    q.push({src, -1});

    while (!q.empty()) {
        int node = q.front().first;
        int parent = q.front().second;
        q.pop();

        for (auto neighbor : adj[node]) {
            if (!vis[neighbor]) {
                vis[neighbor] = 1;
                q.push({neighbor, node});
            }
            else if (neighbor != parent) {
                return true;  // visited + not parent = cycle
            }
        }
    }
    return false;
}
```

**Why store parent in queue?** In undirected graph, if 0-1 are connected, when we process 1, we'll see neighbor 0 (already visited). But that's just the edge we came from — NOT a cycle. The parent check filters this out.

### Cycle in Undirected Graph — DFS approach

```cpp
bool detectCycleUndirectedDFS(int node, int parent, int vis[], vector<int> adj[]) {
    vis[node] = 1;
    for (auto neighbor : adj[node]) {
        if (!vis[neighbor]) {
            if (detectCycleUndirectedDFS(neighbor, node, vis, adj))
                return true;
        }
        else if (neighbor != parent) {
            return true;  // visited + not parent = cycle
        }
    }
    return false;
}
```

### Cycle in Directed Graph — DFS approach (CRITICAL difference)

**Why can't we just use `vis[]`?** In a directed graph, just because a node is visited doesn't mean there's a cycle. Node A→B→C and separately D→B — when processing D's path and we visit B (already visited), that's NOT a cycle. B was visited via A's path, which is a different path.

**The insight:** A cycle in a directed graph means a node is visited AGAIN **in the current DFS path** (same call stack). We need TWO arrays:
- `vis[]` — ever visited
- `pathVis[]` — visited in current DFS path

```cpp
bool dfsCheckDirected(int node, vector<int> adj[], int vis[], int pathVis[]) {
    vis[node] = 1;
    pathVis[node] = 1;

    for (auto neighbor : adj[node]) {
        if (!vis[neighbor]) {
            if (dfsCheckDirected(neighbor, adj, vis, pathVis))
                return true;
        }
        else if (pathVis[neighbor]) {
            return true;  // back edge = cycle in directed graph
        }
    }

    pathVis[node] = 0;  // CRITICAL: backtrack — unmark from current path
    return false;
}
```

**The critical line:** `pathVis[node] = 0` at the end. When we backtrack (return from recursion), the node is no longer in the "current path". This is what makes it work.

**From your code (cycleInDirectedGraphUsingDfs.cpp):** The test graph has nodes 8→9→10→8 forming a cycle. The output is `True`. Notice how `pathVis` is set to 0 on every return — without this, it would give false positives.

**Alternative: Kahn's Algorithm for cycle detection**
A directed graph has a cycle if and only if topological sort via Kahn's algorithm doesn't produce all V nodes. If the output has fewer than V nodes, there's a cycle (nodes with remaining in-degree were in a cycle).

```cpp
bool hasCycle(int V, vector<int> adj[]) {
    // Run Kahn's algorithm — if result.size() < V, there's a cycle
    vector<int> topoResult = kahnsAlgorithm(V, adj);
    return topoResult.size() != V;
}
```

---

## 5. Topological Sort — DFS approach

### What is Topological Sort

A linear ordering of vertices such that for every directed edge u→v, u comes before v. **Only defined for DAGs (Directed Acyclic Graphs).**

**Intuition:** Finish a task before starting the next one. Course prerequisites.

### How DFS-based Topo Sort works

**The key insight:** In DFS, a node is added to the stack AFTER all its dependent nodes are processed. So when we pop the stack, we get topological order.

```cpp
void dfsTopoSort(int node, int vis[], stack<int> &st, vector<int> adj[]) {
    vis[node] = 1;
    for (auto neighbor : adj[node]) {
        if (!vis[neighbor]) {
            dfsTopoSort(neighbor, adj, vis, st);
        }
    }
    st.push(node);  // push AFTER all neighbors are done
}

vector<int> topoSort(int V, vector<int> adj[]) {
    int vis[V] = {0};
    stack<int> st;

    for (int i = 0; i < V; i++) {
        if (!vis[i]) dfsTopoSort(i, vis, st, adj);
    }

    vector<int> result;
    while (!st.empty()) {
        result.push_back(st.top());
        st.pop();
    }
    return result;
}
```

**From your code (TopoSort.cpp):** Graph `{{},{},{3},{1},{0,1},{0,2}}` → output `5 4 2 3 1 0`. Node 5 has edges to {0,2}, so it finishes last in DFS and goes to top of stack (= appears first in result).

**Time:** O(V + E) + O(V) for stack operations  
**Space:** O(V) for visited array + stack

---

## 6. Topological Sort — Kahn's BFS (Khan's Algorithm)

### The Approach

**Intuition:** Start with nodes that have no prerequisites (in-degree = 0). Process them, reduce in-degrees of their neighbors. When a neighbor's in-degree hits 0, it becomes ready.

```cpp
vector<int> kahnsTopoSort(int V, vector<int> adj[]) {
    // Step 1: Calculate in-degrees for all nodes
    vector<int> indegree(V, 0);
    for (int i = 0; i < V; i++) {
        for (auto neighbor : adj[i]) {
            indegree[neighbor]++;
        }
    }

    // Step 2: Push all nodes with in-degree 0 into queue
    queue<int> q;
    for (int i = 0; i < V; i++) {
        if (indegree[i] == 0) q.push(i);
    }

    // Step 3: BFS
    vector<int> result;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        result.push_back(node);

        for (auto neighbor : adj[node]) {
            indegree[neighbor]--;          // "remove" this edge
            if (indegree[neighbor] == 0)  // now this node has no prerequisites
                q.push(neighbor);
        }
    }

    return result;  // if result.size() < V, there's a cycle
}
```

**From your code (KhanAlgorithm.cpp):** Same test graph gives `4 5 0 2 3 1` — a different valid topological ordering (multiple valid orderings exist).

### DFS Topo vs Kahn's — when to use which

| DFS Topo Sort | Kahn's (BFS) |
|--------------|--------------|
| Uses explicit stack | Uses queue |
| Harder to detect cycle | Cycle detection is natural (result.size() < V) |
| Harder to understand | More intuitive |
| Good for "alien dictionary" type problems | Good for "course schedule" type problems |

**Kahn's is preferred in interviews** because cycle detection comes for free.

**Cycle detection bonus:** After Kahn's, if `result.size() < V` → the graph has a cycle. The nodes not in result are part of cycle(s) — they never got in-degree 0.

---

## 7. Shortest Paths — Unit Weight (BFS)

When all edges have weight 1, BFS gives shortest paths automatically. **Never use Dijkstra for unit-weight graphs — BFS is simpler and equally optimal.**

```cpp
vector<int> shortestPathUnitWeight(int src, vector<int> adj[], int V) {
    vector<int> dist(V, 1e9);
    dist[src] = 0;
    queue<int> q;
    q.push(src);

    while (!q.empty()) {
        int node = q.front();
        q.pop();

        for (auto neighbor : adj[node]) {
            if (dist[node] + 1 < dist[neighbor]) {
                dist[neighbor] = dist[node] + 1;
                q.push(neighbor);
            }
        }
    }

    // Mark unreachable nodes as -1
    for (int i = 0; i < V; i++)
        if (dist[i] == 1e9) dist[i] = -1;

    return dist;
}
```

**From your code (ShortestPathInunitweightundirectedgraph.cpp):** Output for graph with 9 nodes: `0 1 2 1 2 3 3 4 4`. Source is 0. The BFS guarantees minimum hops.

**Variations:**
- **Multi-source BFS:** Initialize queue with ALL sources at distance 0. The BFS naturally computes shortest distance from any source.

---

## 7.5 0-1 BFS

### When to use

Edge weights are **only 0 or 1**. Use a **deque** instead of a queue or priority queue.

- Push 0-weight neighbors to the **front** (free move — don't increase distance)
- Push 1-weight neighbors to the **back** (costs 1 — like normal BFS next level)

**Time: O(V + E)** — same as plain BFS, faster than Dijkstra's O(E log V).

**Why not Dijkstra?** Dijkstra works but uses a heap → O(E log V). For 0-1 weights the deque trick achieves the same result in O(V+E) because the deque always stays "almost sorted" — front elements have distance d, back elements have distance d+1.

### Template

```cpp
vector<int> bfs01(int src, int V, vector<pair<int,int>> adj[]) {
    // adj[u] = {v, weight}  where weight is 0 or 1
    vector<int> dist(V, INT_MAX);
    dist[src] = 0;
    deque<int> dq;
    dq.push_front(src);

    while (!dq.empty()) {
        int node = dq.front();
        dq.pop_front();

        for (auto [v, w] : adj[node]) {
            if (dist[node] + w < dist[v]) {
                dist[v] = dist[node] + w;
                if (w == 0) dq.push_front(v);   // free — goes to front
                else        dq.push_back(v);     // costs 1 — goes to back
            }
        }
    }
    return dist;
}
```

### Why this is correct

The deque invariant: at any moment, the deque contains nodes at distance `d` (in the front part) and distance `d+1` (in the back part). When you pop from the front and find a 0-weight neighbor, it also has distance `d` — it belongs at the front. A 1-weight neighbor has distance `d+1` — it belongs at the back. This preserves the invariant without a heap.

### Classic problems that use 0-1 BFS

| Problem | How 0-1 BFS applies |
|---------|---------------------|
| Minimum obstacles to remove to reach destination | Moving through empty cell = cost 0, through obstacle = cost 1 |
| Shortest path in grid where you can remove k walls | Each wall removal = cost 1 |
| Minimum number of flips to get path | Correct direction = 0, wrong direction (flip) = 1 |
| Minimum cost path where some edges are free | Free edges → 0, normal edges → 1 |

**Pattern recognition:** If the problem says "you can do some operations for free but others cost 1" and asks for minimum total cost → 0-1 BFS.

### Comparison with related algorithms

```
Edge weights all 0 or 1  → 0-1 BFS   O(V+E)
Edge weights all equal   → BFS        O(V+E)
Edge weights positive    → Dijkstra   O(E log V)
Edge weights any sign    → Bellman-Ford O(VE)
```

---

## 8. Shortest Path in DAG

**Why a special algorithm?** In a DAG (no cycles), we can use topological sort to process nodes in the guaranteed right order — before relaxing their edges. This gives O(V+E) vs Dijkstra's O(E log V).

**Doesn't work for graphs with cycles** — topological sort requires DAG.

```cpp
vector<int> shortestPathDAG(int N, int M, vector<vector<int>> &edges) {
    // Build weighted adjacency list
    vector<pair<int,int>> adj[N];
    for (auto &e : edges) {
        adj[e[0]].push_back({e[1], e[2]});  // directed: u→v with weight w
    }

    // Step 1: Topological sort using DFS
    int vis[N] = {0};
    stack<int> st;
    for (int i = 0; i < N; i++) {
        if (!vis[i]) topoSort(i, adj, vis, st);
    }

    // Step 2: Initialize distances
    vector<int> dist(N, 1e9);
    dist[0] = 0;  // source = node 0

    // Step 3: Relax edges in topological order
    while (!st.empty()) {
        int node = st.top();
        st.pop();

        if (dist[node] != 1e9) {
            for (auto [v, w] : adj[node]) {
                if (dist[node] + w < dist[v]) {
                    dist[v] = dist[node] + w;
                }
            }
        }
    }

    // Mark unreachable as -1
    for (int i = 0; i < N; i++)
        if (dist[i] == 1e9) dist[i] = -1;

    return dist;
}
```

**From your code (ShortestPathInDAG.cpp):** Output for 6-node DAG: `0 2 3 6 1 5`. The topological order ensures when we process a node, we've already settled its minimum incoming distance.

---

## 9. Dijkstra's Algorithm

### When to use

- **Positive weighted** graph (directed or undirected)
- Find shortest path from single source to all nodes
- **Fails with negative edges** — use Bellman-Ford instead

### Priority Queue version (preferred in interviews)

```cpp
vector<int> dijkstra(int V, vector<vector<int>> adj[], int src) {
    // Min-heap: {distance, node}
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;

    vector<int> dist(V, INT_MAX);
    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        int d = pq.top().first;
        int node = pq.top().second;
        pq.pop();

        // Key optimization: skip stale entries
        // (if we've already found a better path, skip)
        // Not strictly needed but speeds things up

        for (auto &it : adj[node]) {
            int v = it[0], w = it[1];
            if (d + w < dist[v]) {
                dist[v] = d + w;
                pq.push({dist[v], v});  // push NEW entry — don't update old one
            }
        }
    }
    return dist;
}
```

**From your code (DijkstraPriority_queue.cpp):** 3-node graph, source 2, output: `4 3 0`.

### Set version (alternative — supports lazy deletion)

```cpp
// Set version — use when you need decrease-key behavior
set<pair<int,int>> st;  // {dist, node} — ordered by distance
st.insert({0, src});
dist[src] = 0;

while (!st.empty()) {
    auto [d, node] = *st.begin();
    st.erase(st.begin());

    for (auto &it : adj[node]) {
        int v = it[0], w = it[1];
        if (d + w < dist[v]) {
            if (dist[v] != INT_MAX)
                st.erase({dist[v], v});  // remove old entry (decrease-key)
            dist[v] = d + w;
            st.insert({dist[v], v});
        }
    }
}
```

**From your code (DijkstraAlgo.cpp):** The set version. Key difference: set supports `erase({dist[v], v})` to remove the old entry when a better path is found. Priority queue can't do this, so it stores duplicates — but the algorithm still works correctly because we process the best distance first.

### Critical insight — why Dijkstra fails with negative edges

Dijkstra assumes: once a node is popped from the priority queue (with its minimum distance), that distance is final. If there are negative edges, a later path (going through a negative edge) could give a shorter distance to an already-processed node. Dijkstra can't "go back" and fix this.

**Time:** O(E log V) with priority queue  
**Space:** O(V + E)

### Complexity Comparison

| Algorithm | Time | Negative Edges | Multiple Queries |
|-----------|------|----------------|-----------------|
| BFS | O(V+E) | Only unit weights | No |
| Dijkstra | O(E log V) | No | Run once per source |
| Bellman-Ford | O(VE) | Yes | Run once per source |
| Floyd-Warshall | O(V³) | Yes | All pairs at once |

---

## 10. Bellman-Ford Algorithm

### When to use over Dijkstra

- Graph has **negative weight edges**
- Need to **detect negative cycles**
- Directed graph (works on undirected too)

### The Algorithm

**Insight:** The shortest path from source to any node has at most V-1 edges (in a V-node graph with no negative cycles). So we relax ALL edges V-1 times. After V-1 iterations, all shortest paths are found.

```cpp
vector<int> bellmanFord(int V, vector<vector<int>> &edges, int src) {
    vector<int> dist(V, 1e8);
    dist[src] = 0;

    // V-1 relaxation passes
    for (int i = 0; i < V - 1; i++) {
        for (auto &e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != 1e8 && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }

    // V-th pass: check for negative cycles
    for (auto &e : edges) {
        int u = e[0], v = e[1], w = e[2];
        if (dist[u] != 1e8 && dist[u] + w < dist[v]) {
            return {-1};  // negative cycle detected!
        }
    }

    return dist;
}
```

**From your code (BellmanFord.cpp):** Edges include negative weight (-3, -2). Source = 0, output: `0 5 3 3 1 2`. The `dist[u] != 1e8` guard prevents relaxing from unreachable nodes (which would give wrong results).

**Why V-1 iterations?** Shortest path in graph with V nodes has at most V-1 edges. Each iteration relaxes at least one more edge correctly.

**Negative cycle detection:** If we can still relax in the V-th pass, there's a negative cycle (we can keep reducing distances forever).

**Time:** O(V × E)  
**Space:** O(V)

### Edge list format (different from Dijkstra)

Bellman-Ford uses **edge list** `vector<vector<int>> edges` where each edge is `{u, v, w}`. Not adjacency list. This is important — it iterates over all edges directly.

---

## 11. Floyd-Warshall Algorithm

### When to use

- **All-pairs shortest path** (shortest path between EVERY pair of nodes)
- Small V (V ≤ 500, because O(V³))
- Handles negative edges (but not negative cycles)

### The Algorithm

**Insight:** For each "intermediate node" k, check if going through k gives a shorter path between every pair (i, j).

```cpp
void floydWarshall(vector<vector<int>> &matrix) {
    int n = matrix.size();

    // Initialize: -1 means no edge (convert to INF)
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (matrix[i][j] == -1) matrix[i][j] = 1e9;
            if (i == j) matrix[i][j] = 0;  // distance to self = 0
        }
    }

    // Try each node as intermediate
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (matrix[i][k] != 1e9 && matrix[k][j] != 1e9)
                    matrix[i][j] = min(matrix[i][j], matrix[i][k] + matrix[k][j]);
            }
        }
    }

    // Restore: INF back to -1 (unreachable)
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (matrix[i][j] == 1e9) matrix[i][j] = -1;
}
```

**From your code (FloydWarshall.cpp):** 4-node graph, only some edges filled. Output shows all-pairs distances — `-1` for unreachable pairs (like 2→0, 2→3).

**Negative cycle detection:** After Floyd-Warshall, if `matrix[i][i] < 0` for any node i, there's a negative cycle.

**Time:** O(V³)  
**Space:** O(V²) — modifies the input matrix in place

---

## 12. Disjoint Set Union (DSU)

DSU is THE data structure for:
- Detecting cycles in undirected graphs (Kruskal's)
- Merging components
- Finding which component a node belongs to

### The Three Operations

1. **Find:** Which component does this node belong to? (Returns root)
2. **Union:** Merge two components
3. **Path Compression:** Optimization — make all nodes point directly to root

### Complete DSU Implementation (union by size — preferred)

```cpp
class DisjointSet {
    vector<int> parent, size;
public:
    DisjointSet(int n) {
        parent.resize(n + 1);
        size.resize(n + 1, 1);
        iota(parent.begin(), parent.end(), 0);  // parent[i] = i
    }

    // Find with path compression
    int findUPar(int node) {
        if (node == parent[node]) return node;
        return parent[node] = findUPar(parent[node]);  // path compression
    }

    // Union by size
    void unionBySize(int u, int v) {
        int rootU = findUPar(u);
        int rootV = findUPar(v);
        if (rootU == rootV) return;  // already in same component

        // Attach smaller tree under larger tree
        if (size[rootU] < size[rootV]) {
            parent[rootU] = rootV;
            size[rootV] += size[rootU];
        } else {
            parent[rootV] = rootU;
            size[rootU] += size[rootV];
        }
    }

    bool connected(int u, int v) {
        return findUPar(u) == findUPar(v);
    }
};
```

### Union by Rank (alternative)

```cpp
void unionByRank(int u, int v) {
    int rootU = findUPar(u), rootV = findUPar(v);
    if (rootU == rootV) return;

    if (rank[rootU] < rank[rootV])      parent[rootU] = rootV;
    else if (rank[rootV] < rank[rootU]) parent[rootV] = rootU;
    else {
        parent[rootV] = rootU;
        rank[rootU]++;  // only increase rank when both ranks are equal
    }
}
```

**From your code (DSU_BY_SIZE.CPP):** Contains both `unionByRank` and `unionBySize` in same class. Test: nodes 1-7, several unions, then check if 3 and 7 are in same component. Before `unionBySize(3,7)`: Not same. After: Same.

### Path Compression — why it makes DSU nearly O(1)

Without path compression:
```
1 → 2 → 3 → 4 → 5 (root)
findUPar(1) traverses 4 edges
```

With path compression:
```
After findUPar(1), parent[1] = parent[2] = parent[3] = parent[4] = 5
Next findUPar(1): direct jump to root in 1 step
```

**Amortized time per operation: O(α(n)) ≈ O(1)** where α is the inverse Ackermann function (essentially constant).

### Cycle detection using DSU

```cpp
bool hasCycle(int V, vector<vector<int>> &edges) {
    DisjointSet ds(V);
    for (auto &e : edges) {
        int u = e[0], v = e[1];
        if (ds.findUPar(u) == ds.findUPar(v)) return true;  // cycle!
        ds.unionBySize(u, v);
    }
    return false;
}
```

**The logic:** If both endpoints of an edge are already in the same component, adding this edge creates a cycle.

---

## 13. Kruskal's MST Algorithm

### Minimum Spanning Tree (MST)

MST: Spanning tree of a connected weighted undirected graph with minimum total edge weight. V nodes → V-1 edges in MST.

### Kruskal's Approach

**Intuition:** Sort all edges by weight. Add the cheapest edge that doesn't form a cycle. Repeat until V-1 edges added.

```cpp
int kruskalMST(int V, vector<vector<int>> adj[]) {
    // Step 1: Collect all edges as {weight, {u, v}}
    vector<pair<int, pair<int,int>>> edges;
    for (int i = 0; i < V; i++) {
        for (auto &it : adj[i]) {
            int v = it[0], w = it[1];
            edges.push_back({w, {i, v}});
        }
    }

    // Step 2: Sort by weight
    sort(edges.begin(), edges.end());

    // Step 3: Pick edges greedily using DSU
    DisjointSet ds(V);
    int mstWeight = 0;
    for (auto &[w, uv] : edges) {
        auto [u, v] = uv;
        if (ds.findUPar(u) != ds.findUPar(v)) {  // won't form cycle
            mstWeight += w;
            ds.unionBySize(u, v);
        }
    }
    return mstWeight;
}
```

**From your code (KruskalAlgo.cpp):** 5-node graph with 6 edges, MST weight = 5. The edge list is built from adjacency list — note edges are added twice (undirected) but since we check DSU, duplicates don't matter (second occurrence will find same component).

**Time:** O(E log E) for sorting + O(E × α(V)) for DSU operations ≈ O(E log E)  
**Space:** O(E + V)

---

## 14. Prim's MST Algorithm

### Approach — greedy, grows MST one node at a time

**Intuition:** Start from any node. At each step, add the cheapest edge connecting the current MST to a node not yet in MST.

```cpp
int primsMST(int V, vector<vector<int>> adj[]) {
    // Min-heap: {weight, node}
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;

    vector<int> inMST(V, 0);
    pq.push({0, 0});  // start from node 0 with weight 0
    int mstWeight = 0;

    while (!pq.empty()) {
        auto [w, node] = pq.top();
        pq.pop();

        if (inMST[node]) continue;  // already in MST
        inMST[node] = 1;
        mstWeight += w;

        for (auto &it : adj[node]) {
            int v = it[0], wt = it[1];
            if (!inMST[v]) {
                pq.push({wt, v});
            }
        }
    }
    return mstWeight;
}
```

**From your code (PrismAlgo.cpp):** Uses `key[]` array (min edge to add each node) and `parent[]` array to track actual MST edges. The simpler version above just computes the weight.

**Time:** O(E log V) with priority queue  
**Space:** O(V + E)

### Kruskal vs Prim

| | Kruskal's | Prim's |
|--|----------|--------|
| Approach | Edge-based | Node-based |
| Data structure | DSU + sorted edge list | Priority queue |
| Best for | Sparse graphs | Dense graphs |
| Works on | Any connected undirected | Any connected undirected |
| Implementation | Sort edges then DSU | Similar to Dijkstra |

---

## 15. Bridges — Tarjan's Algorithm

**A bridge is an edge whose removal increases the number of connected components.**

This is the section that fades most. Read carefully.

### The Discovery Time and Low Time Arrays

This is the core of Tarjan's algorithm. Understanding these two arrays is everything.

- **`tin[node]`** (time-in / discovery time): When was this node first visited? A global timer is incremented at each visit.
- **`low[node]`**: The minimum discovery time reachable from the subtree rooted at `node` (including `node` itself) via **at most one back edge**.

**Intuition for `low[]`:** `low[node]` tells you: "How early back in the DFS tree can I reach from this subtree?" If `low[node]` is small, it means there's a back edge connecting deep nodes to shallow (early) ancestors.

### When is an edge (u → v) a bridge?

**An edge u→v is a bridge if `low[v] > tin[u]`.**

Why? If `low[v] > tin[u]`, it means the subtree rooted at `v` cannot reach `u` or any ancestor of `u` via any back edge. So the only way to get to `v`'s subtree is through the edge u→v itself. Remove it, and the subtree disconnects.

If `low[v] <= tin[u]`, then there's a back edge from v's subtree going to u or an ancestor of u — meaning the subtree of v is still connected to u's part even without the edge u→v.

```cpp
class Solution {
private:
    int timer = 1;

    void dfs(int node, int parent, vector<int> &vis,
             vector<int> adj[], int tin[], int low[],
             vector<vector<int>> &bridges) {
        vis[node] = 1;
        tin[node] = low[node] = timer++;

        for (auto neighbor : adj[node]) {
            if (neighbor == parent) continue;  // skip parent edge

            if (!vis[neighbor]) {
                dfs(neighbor, node, vis, adj, tin, low, bridges);
                // After DFS returns, update low[node]
                low[node] = min(low[node], low[neighbor]);

                // Check bridge condition
                if (low[neighbor] > tin[node]) {
                    bridges.push_back({node, neighbor});
                }
            } else {
                // Back edge — update low with neighbor's DISCOVERY TIME
                low[node] = min(low[node], tin[neighbor]);
                // NOT low[neighbor] — because we want discovery time of ancestor
            }
        }
    }

public:
    vector<vector<int>> criticalConnections(int n, vector<vector<int>> &connections) {
        vector<int> adj[n];
        for (auto &it : connections) {
            adj[it[0]].push_back(it[1]);
            adj[it[1]].push_back(it[0]);
        }
        vector<int> vis(n, 0);
        int tin[n], low[n];
        vector<vector<int>> bridges;
        dfs(0, -1, vis, adj, tin, low, bridges);
        return bridges;
    }
};
```

**From your code (Bridge.cpp):** Graph: 0-1-2-0 (triangle) + 1-3. Output: `[3, 1]`. The edge 1-3 is a bridge because `low[3] = 4 > tin[1] = 2`. The triangle 0-1-2 has no bridges because each node can reach back to the root via alternative path.

### The back edge trap

```cpp
// For back edges (to visited nodes that aren't parent):
low[node] = min(low[node], tin[neighbor]);  // use tin, NOT low[neighbor]
```

Why `tin` and not `low` for back edges? Because `low[neighbor]` might have been updated with information from the subtree of `neighbor` that we haven't fully explored yet. Using `tin[neighbor]` gives the conservative "discovery time of the ancestor we can reach directly."

**Time:** O(V + E)  
**Space:** O(V + E) for adj list + O(3V) for vis, tin, low arrays

---

## 16. Articulation Points — Tarjan's Algorithm

**An articulation point (cut vertex) is a node whose removal increases the number of connected components.**

### Similar to bridges, but with one key difference

For bridges: `low[neighbor] > tin[node]`  
For articulation points: `low[neighbor] >= tin[node]` (note: ≥ not >)

**Why ≥?** For bridges, we needed strictly greater (the neighbor can't reach node OR its ancestors). For articulation points, we just need the subtree to be "stuck at or below" the current node — meaning even if the subtree can reach `node` via back edge, `node` is still the bottleneck (removing `node` disconnects the subtree from `node`'s ancestors).

### Special case: Root node

The root of the DFS tree is an articulation point if and only if it has **more than one child** in the DFS tree.

```cpp
void dfs(int node, int parent, vector<int> &vis, int tin[], int low[],
         vector<int> &mark, vector<int> adj[]) {
    vis[node] = 1;
    tin[node] = low[node] = timer++;
    int childCount = 0;

    for (auto neighbor : adj[node]) {
        if (neighbor == parent) continue;

        if (!vis[neighbor]) {
            childCount++;
            dfs(neighbor, node, vis, tin, low, mark, adj);
            low[node] = min(low[node], low[neighbor]);

            // Articulation point condition (non-root)
            if (low[neighbor] >= tin[node] && parent != -1) {
                mark[node] = 1;
            }
        } else {
            // Back edge
            low[node] = min(low[node], tin[neighbor]);
        }
    }

    // Special case: root with multiple children
    if (childCount > 1 && parent == -1) {
        mark[node] = 1;
    }
}
```

**From your code (ArticulationPoint.cpp):** Graph: 0-1, 1-4, 2-4, 2-3, 3-4. Output: `1 4`. 
- Node 4 is articulation point: removing 4 disconnects {3} and {2} from {0,1}.
- Node 1 is articulation point: removing 1 disconnects {0} from the rest.

**Bridges vs Articulation Points — the connection:**
- Bridges → edge removal increases components
- Articulation points → vertex removal increases components
- Every bridge contributes to at least one articulation point (one of its endpoints)

---

## 17. Kosaraju's SCC Algorithm

### Strongly Connected Components (SCC)

In a directed graph, an SCC is a maximal set of nodes where every node is reachable from every other node.

Example: A→B→C→A forms an SCC. D→A means D can reach A,B,C but they can't reach D, so D is a separate SCC.

### Kosaraju's Two-Pass Algorithm

**This is what fades. Learn the WHY, not just the steps.**

**Pass 1:** DFS on original graph, push nodes to stack in **finish order** (same as topo sort DFS).

**Pass 2:** Reverse all edges. Process nodes from stack (in reverse finish order). Each DFS on the reversed graph discovers exactly one SCC.

**Why does this work?**

Intuition: In the original graph, the node that finishes LAST in DFS is in the "source SCC" (the SCC with no incoming edges from outside). In the reversed graph, this node can only reach nodes within its own SCC.

By reversing the graph, edges between SCCs point backwards. So when we do DFS on the reversed graph starting from our stack order, each DFS run stays within one SCC.

```cpp
class Solution {
    // Pass 1 DFS: builds finish order
    void dfs1(int node, vector<int> &vis, vector<int> adj[], stack<int> &st) {
        vis[node] = 1;
        for (auto neighbor : adj[node]) {
            if (!vis[neighbor]) dfs1(neighbor, vis, adj, st);
        }
        st.push(node);  // push after all descendants are done
    }

    // Pass 2 DFS: explores one SCC in reversed graph
    void dfs2(int node, vector<int> &vis, vector<int> adjT[]) {
        vis[node] = 1;
        for (auto neighbor : adjT[node]) {
            if (!vis[neighbor]) dfs2(neighbor, vis, adjT);
        }
    }

public:
    int kosaraju(int V, vector<int> adj[]) {
        // Pass 1: get finish order
        vector<int> vis(V, 0);
        stack<int> st;
        for (int i = 0; i < V; i++) {
            if (!vis[i]) dfs1(i, vis, adj, st);
        }

        // Build reversed graph
        vector<int> adjT[V];
        for (int i = 0; i < V; i++) {
            vis[i] = 0;  // reset visited
            for (auto neighbor : adj[i]) {
                adjT[neighbor].push_back(i);  // reverse the edge
            }
        }

        // Pass 2: count SCCs
        int sccCount = 0;
        while (!st.empty()) {
            int node = st.top();
            st.pop();
            if (!vis[node]) {
                sccCount++;
                dfs2(node, vis, adjT);
            }
        }
        return sccCount;
    }
};
```

**From your code (KojsarajuAlgo.cpp):** 5-node graph with edges forming cycles 1→0→2→1 (one SCC), 0→3→4 (two more SCCs). Output: `3 SCCs`.

**Time:** O(V+E) + O(V+E) + O(V+E) = O(V+E) — three passes  
**Space:** O(V+E) for reversed graph + O(V) for stack

---

## 18. Multi-source BFS Patterns

### Pattern: Multiple starting points

```cpp
// Classic multi-source BFS
queue<pair<int,int>> q;
vector<vector<int>> dist(m, vector<int>(n, INT_MAX));

// Push ALL sources at distance 0
for (int i = 0; i < m; i++) {
    for (int j = 0; j < n; j++) {
        if (grid[i][j] == source_marker) {
            q.push({i, j});
            dist[i][j] = 0;
        }
    }
}

// Standard BFS from all sources simultaneously
while (!q.empty()) {
    auto [r, c] = q.front();
    q.pop();
    for (auto [dr, dc] : directions) {
        int nr = r + dr, nc = c + dc;
        if (valid and dist[nr][nc] == INT_MAX) {
            dist[nr][nc] = dist[r][c] + 1;
            q.push({nr, nc});
        }
    }
}
```

**Why multi-source works:** BFS from multiple sources simultaneously is equivalent to adding a "super source" node connected to all actual sources with weight 0. The BFS computes shortest distance from any source.

### Applications

- **Rotten Oranges:** All rotten oranges are sources. BFS spreads rot.
- **01-Matrix:** All 0s are sources. Find distance to nearest 0.
- **Pacific Atlantic:** Run BFS from Pacific coast and Atlantic coast separately.

### Grid BFS template

```cpp
int dx[] = {0, 0, 1, -1};  // 4-directional movement
int dy[] = {1, -1, 0, 0};

// Bounds check
auto valid = [&](int r, int c) {
    return r >= 0 && r < m && c >= 0 && c < n;
};
```

---

## 19. Things Most People Forget

### 1. Directed graph cycle detection needs TWO vis arrays

```cpp
// WRONG for directed graphs:
if (vis[neighbor]) return true;  // gives false positives

// CORRECT: need pathVis to know if in current DFS path
if (vis[neighbor] && pathVis[neighbor]) return true;
```

### 2. Tarjan's back edge uses `tin[]`, not `low[]`

```cpp
// Back edge to already-visited node:
low[node] = min(low[node], tin[neighbor]);  // NOT low[neighbor]
```

### 3. Articulation point condition is ≥ (not >) bridge condition

```cpp
// Bridge: low[neighbor] > tin[node]
// Articulation point: low[neighbor] >= tin[node] AND parent != -1
// + Root with 2+ DFS children is also articulation point
```

### 4. DSU — always compare roots, not nodes

```cpp
// WRONG
if (u == v) return;  // nodes might be in same component via different roots

// CORRECT
if (findUPar(u) == findUPar(v)) return;
```

### 5. Kosaraju's two resets

```cpp
// Reset vis BETWEEN the two passes
for (int i = 0; i < V; i++) vis[i] = 0;  // between pass 1 and pass 2
```

### 6. Dijkstra uses {dist, node} pairs (dist first for min-heap ordering)

```cpp
pq.push({dist[v], v});   // {dist, node} — distance first for min-heap
// NOT pq.push({v, dist[v]});  — this would sort by node index
```

### 7. Bellman-Ford uses edge list, not adjacency list

```cpp
// Bellman-Ford iterates over ALL edges directly
for (auto &e : edges) {  // edge list: {u, v, w}
    // relax edge
}
```

### 8. Floyd-Warshall: initialize diagonal to 0 and -1 edges to INF

```cpp
if (matrix[i][j] == -1) matrix[i][j] = 1e9;
if (i == j) matrix[i][j] = 0;
```

### 9. Kahn's algorithm: If result.size() < V, there's a cycle

```cpp
// After running Kahn's
if (result.size() != V) {
    // Directed cycle exists — course schedule problem returns false here
}
```

### 10. In Prim's/Dijkstra: skip if already in MST/already settled

```cpp
if (inMST[node]) continue;  // Prim's: node already added to MST
// In Dijkstra, old entries in PQ with stale distances don't cause bugs
// because the correct (smaller) distance was already processed
```

### 11. Multi-source BFS: push ALL sources before starting

```cpp
// Push all sources first, THEN start BFS
// Wrong: run separate BFS from each source and take minimum
// Correct: push all into one queue at distance 0
```

---

## 21. Final Revision Sheet

### Must-Know Templates

```cpp
// 1. BFS template
vector<int> vis(V, 0);
vis[src] = 1;
queue<int> q;
q.push(src);
while (!q.empty()) {
    int node = q.front(); q.pop();
    for (auto nb : adj[node])
        if (!vis[nb]) { vis[nb] = 1; q.push(nb); }
}

// 2. DFS template
void dfs(int node, vector<int> adj[], int vis[]) {
    vis[node] = 1;
    for (auto nb : adj[node])
        if (!vis[nb]) dfs(nb, adj, vis);
}

// 3. Kahn's topo sort + cycle detection
vector<int> indegree(V, 0);
for (int i = 0; i < V; i++)
    for (auto nb : adj[i]) indegree[nb]++;
queue<int> q;
for (int i = 0; i < V; i++) if (!indegree[i]) q.push(i);
vector<int> topo;
while (!q.empty()) {
    int node = q.front(); q.pop();
    topo.push_back(node);
    for (auto nb : adj[node])
        if (--indegree[nb] == 0) q.push(nb);
}
// if topo.size() < V → cycle exists

// 4. Dijkstra
priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
vector<int> dist(V, INT_MAX);
dist[src] = 0; pq.push({0, src});
while (!pq.empty()) {
    auto [d, node] = pq.top(); pq.pop();
    for (auto [v, w] : adj[node])
        if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
}

// 5. Bellman-Ford
vector<int> dist(V, 1e8);
dist[src] = 0;
for (int i = 0; i < V-1; i++)
    for (auto &[u, v, w] : edges)
        if (dist[u] != 1e8 && dist[u]+w < dist[v]) dist[v] = dist[u]+w;
// Check for negative cycle: one more pass

// 6. DSU
int findUPar(int node) {
    if (node == parent[node]) return node;
    return parent[node] = findUPar(parent[node]);
}
void unionBySize(int u, int v) {
    int ru = findUPar(u), rv = findUPar(v);
    if (ru == rv) return;
    if (size[ru] < size[rv]) { parent[ru] = rv; size[rv] += size[ru]; }
    else { parent[rv] = ru; size[ru] += size[rv]; }
}

// 7. Bridges: low[v] > tin[u] → bridge
// 8. Articulation: low[v] >= tin[u] && parent != -1 → AP; root with 2+ DFS children → AP

// 9. Kosaraju SCC
// Pass1: DFS on original → push to stack in finish order
// Build reversed graph
// Pass2: DFS on reversed in stack order → each run = 1 SCC

// 10. Bipartite check (BFS 2-coloring)
bool isBipartite(int V, vector<int> adj[]) {
    vector<int> color(V, -1);
    for (int start = 0; start < V; start++) {
        if (color[start] != -1) continue;
        queue<int> q;
        color[start] = 0;
        q.push(start);
        while (!q.empty()) {
            int node = q.front(); q.pop();
            for (int nb : adj[node]) {
                if (color[nb] == -1) {
                    color[nb] = 1 - color[node];  // flip color
                    q.push(nb);
                } else if (color[nb] == color[node]) {
                    return false;  // same color adjacent → not bipartite
                }
            }
        }
    }
    return true;
}
// A graph is bipartite if and only if it has NO odd-length cycles.
// Equivalently: you can 2-color it so no two adjacent nodes share a color.
// BFS assigns alternating colors. Conflict = odd cycle = not bipartite.
```

### Complexity Table

| Algorithm | Time | Space | Notes |
|-----------|------|-------|-------|
| BFS | O(V+E) | O(V) | Shortest path in unit graph |
| DFS | O(V+E) | O(V) | Recursion stack can overflow |
| Topo Sort (both) | O(V+E) | O(V) | Only for DAGs |
| Dijkstra (PQ) | O(E log V) | O(V+E) | No negative edges |
| Bellman-Ford | O(VE) | O(V) | Negative edges OK; detects neg cycles |
| Floyd-Warshall | O(V³) | O(V²) | All-pairs; handles negative edges |
| DSU find/union | O(α(n)) | O(V) | Nearly O(1) per operation |
| Kruskal | O(E log E) | O(E+V) | Uses DSU |
| Prim's | O(E log V) | O(V+E) | Uses priority queue |
| Bridges / AP | O(V+E) | O(V) | Tarjan's |
| Kosaraju SCC | O(V+E) | O(V+E) | Two DFS passes |

### Interview Checklist

- [ ] Can I write BFS with visited marking BEFORE pushing to queue?
- [ ] Can I write directed graph cycle detection with two vis arrays (vis + pathVis)?
- [ ] Can I explain why Kahn's result.size() < V implies a cycle?
- [ ] Can I write Dijkstra with min-heap from memory (pair format: {dist, node})?
- [ ] Can I explain when Bellman-Ford is needed over Dijkstra?
- [ ] Can I code DSU with path compression + union by size?
- [ ] Can I explain the difference between bridge condition (>) and articulation point condition (>=)?
- [ ] Can I explain the WHY behind Kosaraju's two-pass idea?
- [ ] Can I write multi-source BFS template?
- [ ] Do I loop over all nodes for disconnected graph components?
- [ ] Can I write bipartite BFS (color array, `1 - color[node]` to flip, conflict = not bipartite)?
- [ ] Do I know bipartite ↔ no odd-length cycles ↔ 2-colorable (all three are equivalent)?
- [ ] Can I write 0-1 BFS with a deque (0-weight → push_front, 1-weight → push_back)?
- [ ] Do I know when to use 0-1 BFS vs Dijkstra vs plain BFS (key: are weights 0/1, all equal, or arbitrary positive)?

### Pattern Recognition Guide

| Problem says... | Algorithm |
|----------------|-----------|
| "Shortest path", unit weights | BFS |
| "Shortest path", weights 0 or 1 only | 0-1 BFS (deque) |
| "Shortest path", weighted, positive | Dijkstra |
| "Shortest path", negative edges | Bellman-Ford |
| "Shortest path between ALL pairs" | Floyd-Warshall |
| "MST", "minimum cost to connect all" | Kruskal or Prim |
| "Cycle in directed graph" | DFS with pathVis, or Kahn's |
| "Task ordering / prerequisites" | Topological sort (Kahn's) |
| "Number of components / provinces" | BFS/DFS outer loop, or DSU |
| "Critical connections / bridges" | Tarjan's bridges |
| "Strongly connected components" | Kosaraju |
| "Two groups / bipartite" | BFS with 2-coloring |
| "Minimum to connect components" | Kruskal / DSU |

---

*Chapter 15 — Graphs | Part of DSA Interview Prep series*

---

## Practice Problems

> Track your progress — check off each problem when solved.
> Striver A2Z Sheet: https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z

- [ ] BFS Traversal — https://www.geeksforgeeks.org/problems/bfs-traversal-of-graph/1
- [ ] DFS Traversal — https://www.geeksforgeeks.org/problems/depth-first-traversal-for-a-graph/1
- [ ] Number of provinces — https://leetcode.com/problems/number-of-provinces/
- [ ] Rotten Oranges — https://leetcode.com/problems/rotting-oranges/
- [ ] Flood fill algorithm — https://leetcode.com/problems/flood-fill/
- [ ] Cycle Detection in Undirected Graph — https://www.geeksforgeeks.org/problems/detect-cycle-in-an-undirected-graph/1
- [ ] Distance of nearest cell having 1 (01 Matrix) — https://leetcode.com/problems/01-matrix/
- [ ] Surrounded Regions — https://leetcode.com/problems/surrounded-regions/
- [ ] Number of enclaves — https://leetcode.com/problems/number-of-enclaves/
- [ ] Word Ladder I — https://leetcode.com/problems/word-ladder/
- [ ] Word Ladder II — https://leetcode.com/problems/word-ladder-ii/
- [ ] Number of islands — https://leetcode.com/problems/number-of-islands/
- [ ] Number of distinct islands — https://www.geeksforgeeks.org/problems/number-of-distinct-islands/1
- [ ] Bipartite Graph — https://leetcode.com/problems/is-graph-bipartite/
- [ ] Topological Sort (DFS) — https://www.geeksforgeeks.org/problems/topological-sort/1
- [ ] Topological Sort (Kahn's BFS) — https://www.geeksforgeeks.org/problems/topological-sort/1
- [ ] Detect cycle in Directed Graph — https://leetcode.com/problems/course-schedule/
- [ ] Course Schedule I — https://leetcode.com/problems/course-schedule/
- [ ] Course Schedule II — https://leetcode.com/problems/course-schedule-ii/
- [ ] Find eventual safe states — https://leetcode.com/problems/find-eventual-safe-states/
- [ ] Alien Dictionary — https://leetcode.com/problems/alien-dictionary/
- [ ] Shortest path in undirected graph with unit weights — https://www.geeksforgeeks.org/problems/shortest-source-to-destination-path3050/1
- [ ] Shortest path in DAG — https://www.geeksforgeeks.org/problems/shortest-path-in-undirected-graph/1
- [ ] Dijkstra's Algorithm — https://www.geeksforgeeks.org/problems/implementing-dijkstra-set-1-adjacency-matrix/1
- [ ] Shortest Path in Binary Matrix — https://leetcode.com/problems/shortest-path-in-binary-matrix/
- [ ] Path with minimum effort — https://leetcode.com/problems/path-with-minimum-effort/
- [ ] Cheapest flights within K stops — https://leetcode.com/problems/cheapest-flights-within-k-stops/
- [ ] Network Delay Time — https://leetcode.com/problems/network-delay-time/
- [ ] Number of ways to arrive at destination — https://leetcode.com/problems/number-of-ways-to-arrive-at-destination/
- [ ] Minimum multiplications to reach end — https://www.geeksforgeeks.org/problems/minimum-multiplications-to-reach-end/1
- [ ] Bellman Ford Algorithm — https://www.geeksforgeeks.org/problems/bellman-ford-algorithm/1
- [ ] Floyd Warshall Algorithm — https://www.geeksforgeeks.org/problems/implementing-floyd-warshall2042/1
- [ ] Find the city with the smallest number of neighbors — https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/
- [ ] Prim's Algorithm (MST) — https://www.geeksforgeeks.org/problems/minimum-spanning-tree/1
- [ ] Kruskal's Algorithm (MST) — https://www.geeksforgeeks.org/problems/minimum-spanning-tree/1
- [ ] Disjoint Set Union (DSU) — https://www.geeksforgeeks.org/problems/disjoint-set-union/1
- [ ] Number of operations to make network connected — https://leetcode.com/problems/number-of-operations-to-make-network-connected/
- [ ] Most stones removed with same row or column — https://leetcode.com/problems/most-stones-removed-with-same-row-or-column/
- [ ] Accounts merge — https://leetcode.com/problems/accounts-merge/
- [ ] Number of islands II — https://leetcode.com/problems/number-of-islands-ii/
- [ ] Making a large island — https://leetcode.com/problems/making-a-large-island/
- [ ] Swim in Rising Water — https://leetcode.com/problems/swim-in-rising-water/
- [ ] Bridges in graph — https://leetcode.com/problems/critical-connections-in-a-network/
- [ ] Articulation points in graph — https://www.geeksforgeeks.org/problems/articulation-point/1
- [ ] Kosaraju's algorithm (SCC) — https://www.geeksforgeeks.org/problems/strongly-connected-components-kosarajus-algo/1

