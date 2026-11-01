# I5 · Microservices Boundaries: splitting systems without creating a distributed monolith

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** architecture discussions, API gateway / BFF follow-ups, chat (#3), news feed (#4), e-commerce / flash sale (#18), payment (#16), ChatGPT-style LLM app (#24).

---

## Why this topic matters

"Use microservices" is not a design. It is a trade-off. Microservices can let teams ship independently and scale parts separately, but they also add network calls, data consistency problems, deployments, observability, and operational burden.

| Architecture | Best when | Main risk |
|---|---|---|
| Monolith | Small team, evolving domain, simple deployment | Can become tangled and slow to change |
| Modular monolith | Strong boundaries without distributed-systems cost | Boundaries can be ignored inside one codebase |
| Microservices | Independent teams, scaling profiles, data ownership | Distributed monolith: chatty calls + shared data + hard debugging |

For Neeraj as a frontend engineer, BFFs are especially relevant. A web app often wants a UI-shaped API that composes downstream services, hides backend topology, and reduces frontend round trips.

**Interview line:** "I would start as a modular monolith unless there is a clear reason to split: independent ownership, scaling profile, data boundary, deployment cadence, or regulatory isolation. Microservices are a boundary decision, not a default."

---

## Part 1: monolith, modular monolith, microservices

A **monolith** is one deployable application. It can still have clean modules and good design.

```
One deployable
┌────────────────────────────┐
│ API                         │
│  ├─ users module            │
│  ├─ orders module           │
│  ├─ payments module         │
│  └─ notifications module    │
└───────────────┬────────────┘
                ▼
              Database
```

Pros: simple local calls, easy transactions, one deployment pipeline, and easier debugging while the domain is changing. Cons: one scaling unit and one release cadence if the codebase becomes tangled.

A **modular monolith** is one deployable with strict internal boundaries:

- modules own their tables or schemas;
- no random imports across module internals;
- modules communicate through public interfaces or events;
- tests enforce boundaries;
- each module could later become a service.

A **microservice** is independently deployable and owns a business capability.

```
Web/Mobile
   │
API Gateway / BFF
   ├─ User service       owns user DB
   ├─ Catalog service    owns catalog DB
   ├─ Order service      owns order DB
   ├─ Payment service    owns ledger/payment DB
   └─ Notification svc   owns notification prefs/logs
```

Good microservices own data and APIs. Bad microservices share a database and synchronously call each other for every small decision.

---

## Part 2: monolith-first and when to split

Martin Fowler's "Monolith First" idea: starting with microservices often fails because you do not yet know the right boundaries. Early boundaries are usually wrong.

Start with a monolith/modular monolith when:

- one small team owns the system;
- domain rules are changing quickly;
- scale is modest;
- you need strong transactions across features;
- operational maturity is low;
- deployment complexity would slow learning.

Split only when the pain is real and localized:

| Pain | Possible split |
|---|---|
| Search indexing has separate scale and technology | Search service + Elasticsearch |
| Video transcoding needs CPU/GPU worker fleet | Media pipeline service |
| Payments need audit and stronger isolation | Payment / ledger service |
| Notifications integrate providers and retries | Notification service |
| Feed fan-out has huge read/write scale | Feed or timeline service |
| Meeting recordings are owned by another team | Recording service |

Do not split because "microservices scale". A stateless monolith behind a load balancer can scale horizontally; the database, cache, and queues are usually the harder bottlenecks.

**Interview line:** "I split along stable business capabilities with different scaling or ownership needs. I avoid creating a service per table just because the diagram looks modern."

---

## Part 3: service boundaries and bounded contexts

A service boundary should align with a **bounded context**: a part of the domain where terms and rules have a consistent meaning.

"User" can mean different things:

| Context | Meaning of user |
|---|---|
| Identity | login, sessions, account recovery |
| Billing | payer, invoice address, tax information |
| Meeting | participant, role, permissions in room |
| Analytics | anonymized actor in an event stream |

If one `UserService` owns every meaning, it becomes a god service. Better: identity owns login/session data, billing owns payer data, and meeting service owns participant roles.

### Data ownership per service

A strong microservice rule: **a service owns its database**. Other services access data through APIs or events, not direct table joins.

```
Order service owns orders DB
Payment service owns ledger DB

Bad: Order service reads payment tables directly
Good: Order service calls Payment API or consumes PaymentSucceeded event
```

Why this matters:

- schema can evolve independently;
- invariants live with the owner;
- database load is controlled;
- failures become explicit API/event failures, not hidden coupling.

The cost is that cross-service joins and transactions become harder. You may need denormalized read models, async events, sagas, or CQRS.
### Avoid chatty boundaries

If one user request requires 15 sequential service calls, you probably split too finely.

```
Bad checkout path:
API -> Cart -> Pricing -> Coupon -> Inventory -> Order -> Payment -> Email
       sequential, fragile, high latency
```

Keep strongly consistent operations together, use async events for side effects, and let a BFF/API gateway aggregate read-only data.

---

## Part 4: API gateway and BFF

An **API gateway** is the front door for backend services. It commonly handles routing, auth checks, rate limiting, TLS termination, request transformation, protocol translation, tracing, and sometimes lightweight aggregation.

Do not put all business logic in the gateway. A gateway that knows every domain rule becomes a distributed god class.

A **BFF** (backend for frontend) is a backend tailored to one frontend experience: web, mobile, admin console, TV app, etc.

Why it matters for a frontend engineer:

- the web UI wants screen-shaped data, not 12 generic service calls;
- mobile may need smaller payloads and different caching;
- admin tools may need privileged workflows;
- the BFF hides microservice topology from React.

```
React Web ──► Web BFF ──┬─ User service
                         ├─ Feed service
                         └─ Notification service

Mobile ────► Mobile BFF ─┬─ User service
                          └─ Compact feed endpoint
```

In Adobe Connect, a meeting web client may call `GET /meeting/:id/bootstrap` on a web BFF to receive meeting metadata, user role, feature flags, and media endpoints in one response. That is better than making the browser orchestrate many internal services.

**Interview line:** "I use an API gateway for shared edge concerns and a BFF when different clients need different shapes of data or workflows. I keep domain logic in services."

---

## Part 5: service discovery and communication

Once services are separate, callers need to find healthy instances.

| Discovery model | How it works | Example |
|---|---|---|
| Client-side discovery | Client asks registry and picks an instance | Consul/Eureka/etcd-style registry |
| Server-side discovery | Client calls stable endpoint; proxy/LB routes | Kubernetes Service, cloud load balancer |

Communication choices:

| Need | Choice |
|---|---|
| User waits for response | HTTP/REST or gRPC with deadlines |
| High-throughput internal RPC | gRPC / Protobuf |
| Async side effects | Kafka/SQS/Pub/Sub events |
| Long-running workflow | Queue + saga/orchestrator |
| Browser realtime | SSE or WebSocket |

Avoid synchronous chains for non-critical side effects. After an order is placed, send confirmation email asynchronously. Do not block checkout on email provider latency.

---

## Part 6: CQRS and event sourcing at concept level

**CQRS** = Command Query Responsibility Segregation. Separate the write model from read models.

```
Command side: validate and change state
  PlaceOrder -> Order aggregate -> orders DB

Query side: optimized read view
  order_summary_view, search index, feed timeline cache
```

Use CQRS when reads and writes have very different shapes or scale. A feed write model stores posts/follows; the read model stores precomputed timelines. A meeting analytics dashboard may use a denormalized read model while writes remain normalized events.

Do not use CQRS for a simple CRUD admin page. It adds synchronization and eventual consistency.

**Event sourcing** stores state changes as an append-only event log and derives current state by replaying events.

```
AccountOpened
MoneyDeposited(1000)
MoneyWithdrawn(200)
Current balance = replay events = 800
```

Useful when audit trail, temporal queries, or rebuilding projections are central. Costs include event schema evolution, projection lag, privacy/deletion complexity, and harder debugging. Payment ledgers often use append-only entries, but not every microservice needs full event sourcing.

---

## Part 7: when NOT to split

Do not split when:

- the team is too small to own many deployables;
- the boundary is not stable;
- two modules need strong transactions on every request;
- the service would be a thin CRUD wrapper over one table;
- you cannot observe, deploy, and roll back services independently;
- every request would become a long synchronous chain.

A useful test: if two proposed services must deploy together, share data storage, and constantly call each other, they are one service wearing two names.

Safe migration path:

1. Create a module boundary inside the monolith.
2. Give the module a clear API and owned tables.
3. Stop other modules from direct imports/table access.
4. Publish events for side effects.
5. Extract to a service only when operational benefit is clear.
6. Keep rollback and data migration plans.
---

## Part 8: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| New product / small team | Modular monolith | Learn domain; cheaper transactions/deployments. |
| Mature app with separate teams | Microservices around bounded contexts | Ownership and deployment independence. |
| Web + mobile need different payloads | BFF per client family | Frontend gets UI-shaped APIs. |
| Shared auth/rate limit/routing | API gateway | Central edge concerns. |
| Feed read model very different from writes | CQRS | Optimized timeline reads. |
| Payment audit trail | Append-only ledger / event-like model | Correctness and auditability. |
| Simple CRUD admin | Monolith/module, no CQRS/event sourcing | Avoid accidental complexity. |
| Adobe Connect meeting bootstrap | Web BFF + domain services | Browser avoids orchestrating internal topology. |

### Common interview traps

- "Microservices for scalability" with no independent scaling reason.
- Shared database across services, creating hidden coupling.
- Service per table instead of service per business capability.
- Putting all domain logic in the API gateway/BFF.
- Synchronous call chains for every side effect.
- CQRS/event sourcing for simple CRUD because the terms sound advanced.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why does Fowler recommend monolith-first?</summary>

Because early in a product you usually do not know the right service boundaries. A monolith or modular monolith lets you learn the domain cheaply; premature microservices create wrong boundaries and distributed complexity.
</details>

<details><summary>2. What is a modular monolith?</summary>

One deployable application with strict internal module boundaries: owned data, public interfaces, no random cross-module imports, and tests/rules enforcing separation. It can later be split if needed.
</details>

<details><summary>3. What makes a good microservice boundary?</summary>

A stable business capability or bounded context, independent data ownership, clear APIs/events, independent scaling/deployment needs, and minimal chatty synchronous coupling.
</details>

<details><summary>4. API gateway vs BFF?</summary>

An API gateway handles shared edge concerns such as routing, auth, rate limiting, TLS, and tracing. A BFF is tailored to a specific frontend/client experience and returns UI-shaped data. Keep core domain logic in services.
</details>

<details><summary>5. Why should each service own its data?</summary>

So it can enforce invariants and evolve schema independently. Direct storage access by other services couples them to internal tables and makes changes risky.
</details>

<details><summary>6. What is CQRS?</summary>

Separating the command/write model from query/read models. Use it when read and write shapes or scaling needs differ significantly, such as precomputed feeds or dashboards.
</details>

<details><summary>7. What is event sourcing?</summary>

Persisting state changes as an append-only sequence of events and deriving current state by replaying/projections. It is useful for audit and temporal history but adds schema/projection complexity.
</details>

<details><summary>8. Give two reasons not to split a service.</summary>

The boundary is unstable, the team is small, strong transactions are needed constantly, it would be a CRUD wrapper, observability/deployment maturity is missing, or the services would share storage and deploy together.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Where / time |
|---|---|---|
| [Martin Fowler: MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html) | Whole article titled "MonolithFirst"; focus on learning boundaries before splitting. Static headings are mostly site navigation plus "Further Reading", "Notes", "Acknowledgements". | ~15 min |
| [Sam Newman: Backends For Frontends](https://samnewman.io/patterns/architectural/bff/) | Exact headings: "Introduction", "The General-Purpose API Backend", "Introducing The Backend For Frontend", "How Many BFFs?", "And Multiple Downstream Services (Microservices!)", "Reuse and BFFs", "BFFs for Desktop Web and Beyond", "And Autonomy", "General Perimeter Concerns", "When To Use", "Conclusion" | ~30 min |
| [Hello Interview: API Gateway deep dive](https://www.hellointerview.com/learn/system-design/deep-dives/api-gateway) | Exact headings: "What is an API Gateway?", "Core Responsibilities", "Tracing a Request", "Scaling an API Gateway", "Horizontal Scaling", "Global Distribution", "Popular API Gateways", "Managed Services", "Open Source Solutions", "When to Propose an API Gateway" | ~25 min |
| [Azure Architecture: CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) | Exact headings: "Context and problem", "Solution", "Separate read models and write models", "Benefits of CQRS", "Problems and considerations", "When to use this pattern", "Combine the Event Sourcing and CQRS patterns" | ~25 min |
| [Azure Architecture: Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) | Exact headings: "Context and problem", "Solution", "Workflow", "Pattern advantages", "Problems and considerations", "When to use this pattern", "Example" | ~25 min |

**Connects to:** [A6 API Design](../A-Fundamentals/A6-API-Design.md) · [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md) · [G4 Sagas](../G-Contention/G4-Sagas.md) · [I4 Observability + SLOs](I4-Observability-SLOs.md) · Questions: Chat (#3), News feed (#4), Payment (#16), E-commerce (#18), ChatGPT (#24)