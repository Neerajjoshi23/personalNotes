# Java + Spring Boot Backend Roadmap

> **Parked (2026-10-30):** not on the current learning path. The backend track is now FastAPI (`llm_enginerring/week9-fastapi/`). Pick this up only if a job or work task needs Spring Boot; the concepts from the FastAPI sessions transfer.

Goal: own a production Java/Spring Boot backend at work. Each part has a detailed, runnable **article** in this folder (listed below) plus a "work task" to apply at work. The articles use an e-commerce backend (`com.example.shopflow`: products, stock, orders, payments, wallet, webhooks) and many other realistic scenarios. HLD notes live in `C:\Users\neerajj\personal\SystemDesign\Notes\HLD\` (referred to below as `HLD\`).

**Where to learn each part (no video course needed):** this roadmap = syllabus and checklists; the article = the lesson with code and real output.

| Part | Article |
|---|---|
| A | `session-1-java-for-spring.md` |
| B | `session-2-spring-core-rest.md` |
| C | `session-3-databases-jpa.md` |
| D | `session-4-security.md` |
| E | `session-5-redis-async-scheduling.md` |
| F | `session-6-testing.md` |
| G | `session-7-ops-resilience-deploy.md` |

Articles target **Spring Boot 4.0.8 / Java 21** and include `If your company is on Spring Boot 3.x` callouts. Check your company's `pom.xml` version first. Where the roadmap below says "shortener", read it as "the shopflow project in the article" - the Build lists are still a good checklist, the article examples replace them.

Originally this replaced an earlier FastAPI plan. Since 2026-10-30 it is parked; see the note at the top.

- **Have already:** Java 21.0.9, Maven 3.9.11 (no Gradle needed - use Maven).
- **Need:** Docker Desktop running (Postgres, Redis), IntelliJ (or VS Code + Java pack), Git.
- **Time:** ~6-10 weeks alongside work (about 1 part per week). Not a deadline.

---

## 0. How to use this

1. Per part: do the **Read** list -> **Build** the checklist in the shortener (type it, don't paste) -> do the **Work task** -> answer the **Interview Qs** aloud without notes -> tick **Done when**.
2. Read the HLD notes listed for the part *side by side* (theory in HLD, practice here).
3. Optional video course (section 9) is for walkthroughs; the roadmap is the syllabus. Don't just watch.

---

## 1. Overview and HLD mapping

| Part | Topic | Time | HLD notes to read alongside |
|---|---|---|---|
| A | Java for a C++ dev (just what Spring needs) | 3-5 days | - (LLD `L0`-`L1` optional) |
| B | Spring core + Spring Boot + REST APIs | 1 week | A2 Request-Flow, A6 API-Design, A7 Scaling-Basics |
| C | Databases: SQL, JPA/Hibernate, transactions, Flyway, pooling, locking | 1.5-2 weeks | B1 Data-Models, B2 Indexes, B3 Transactions-Isolation, G1 Locking, D3 Idempotency |
| D | Security: auth, JWT, method security | 1 week | A6 API-Design (auth section) |
| E | Redis, caching, rate limiting, async, scheduling, webhooks, queues | 1-1.5 weeks | C1-C3 Caching/Redis, D1 Queues, D3 Delivery-Semantics, D5 Async-Request-Reply, E1 Polling-SSE-WS |
| F | Testing: JUnit 5, Mockito, MockMvc, Testcontainers | 3-5 days | I3 Circuit-Breaker (testing failure modes) |
| G | Ops: actuator, probes, graceful shutdown, metrics, resilience4j, Docker, CI, deploy | 1 week | I2 Timeouts-Retries, I3 Circuit-Breaker-Bulkhead, I4 Observability-SLOs, D1 |
| H (optional) | Kafka, outbox, microservice boundaries, Spring AI/RAG | later | D2 Kafka, D4 Outbox-CDC, I5 Microservices-Boundaries, G4 Sagas |

**After Part G read (theory consolidation):** A1 Delivery-Framework, A3 HTTP-Versions-Networking, A4 DNS-CDN-LoadBalancer-Proxy, A5 Latency-Estimation, B4 Replication, B5 Sharding, B6 Consistent-Hashing, B7 CAP, B8 Encoding-Schema-Evolution, B9 Real-Databases, C4 HTTP-CDN-Caching, D2 Kafka, D4 Outbox-CDC, G2 Distributed-Locks, I1 Leader-Election, I5, I6 Multi-Region-DR. Then continue `SystemDesign\system-design-roadmap.md` (§6 for E onward).

### Project slices (shopflow; the article code is the reference)

| Part | Slice |
|---|---|
| B | Place order with stock reservation, idempotent `POST /orders`, validation, ProblemDetail errors, request-id filter |
| C | Postgres + Flyway, Product/Order/OrderItem, N+1 fix, flash-sale oversell fix, wallet transfer + deadlock fix |
| D | Customer-owned orders, JWT, ownership checks (IDOR), admin refunds |
| E | Catalog cache + Redis fallback, coupon rate limit, `@Async` notifications, unpaid-order expiry job, webhooks, report 202 polling |
| F | Unit + MockMvc slice + Testcontainers tests, concurrency test, `mvn verify` |
| G | Actuator probes, graceful shutdown, Micrometer metrics, resilience4j around payment gateway, Dockerfile, CI |

---

## Part A - Java for Spring Boot (3-5 days)

You know C++, so focus on **what is different**.

| C++ habit | Java reality |
|---|---|
| Value semantics, stack objects | Objects are always references (heap); primitives are values. No copy-construct unless you write it |
| RAII / destructors | GC; use `try-with-resources` (`AutoCloseable`) for non-memory resources |
| `==` compares values for overloaded types | `==` is identity for objects; use `.equals()` and always override `hashCode()` together |
| Templates (compile-time instantiation) | Generics with **type erasure**; no `List<int>`, use `List<Integer>` (boxing) |
| Header/impl, namespaces | Packages; one public class per file; Maven layout `src/main/java` |
| Multiple inheritance | Single class inheritance + multiple interfaces (default methods) |
| Exceptions all unchecked | **Checked** vs unchecked; Spring mostly uses unchecked |
| `const` | `final` (reference only), immutability via `record` / final fields |
| Manual threads/mutex | `ExecutorService`, `CompletableFuture`, `synchronized`, `java.util.concurrent`, **virtual threads (Java 21)** |

### Topics
1. Classes, interfaces, abstract classes, enums, `record`, `sealed` (just awareness), inner/static nested classes, `static`/`final`
2. `equals`/`hashCode`/`toString`, immutability, `Comparable` vs `Comparator`
3. Collections: `List/ArrayList/LinkedList`, `Map/HashMap/LinkedHashMap/TreeMap/ConcurrentHashMap`, `Set`, `Deque`; iteration + fail-fast
4. Generics (bounded types, wildcards, erasure)
5. Lambdas, functional interfaces, Streams (`map/filter/collect/groupingBy`), `Optional` (when *not* to use)
6. Exceptions: checked vs unchecked, custom exceptions, try-with-resources
7. **Annotations and reflection (concept only)** - this is how Spring works under the hood
8. JVM basics: heap vs stack, GC (G1), classpath, `-Xmx`; why memory leaks still happen (static maps, listeners, ThreadLocal)
9. Concurrency: threads, `ExecutorService`, `CompletableFuture`, `volatile`, atomics, `ConcurrentHashMap`, deadlock; virtual threads
10. Maven: `pom.xml`, dependencies, scopes, lifecycle (`clean test package`), BOM / `spring-boot-starter-parent`
11. Modern Java 17-21: `var`, text blocks, switch expressions, pattern matching, records

### Read
- https://dev.java/learn/ (language basics, generics, collections, streams, concurrency)
- https://docs.oracle.com/javase/tutorial/

### Build
- [ ] CLI mini-project (no Spring): in-memory link store using `Map`, records, `Optional`, a streams report (top-N most clicked)
- [ ] Concurrency exercise: 100 threads incrementing a counter - broken, then fixed with `AtomicLong`, then with `ConcurrentHashMap.merge`
- [ ] Write a class with correct `equals/hashCode`; show a bug when you omit `hashCode` as a `HashMap` key
- [ ] Maven project run via `mvn -q test` with a JUnit test

### Interview Qs
1. `==` vs `equals`; what breaks if `hashCode` is not overridden?
2. How does `HashMap` work? Resize? Why `ConcurrentHashMap`?
3. Checked vs unchecked exceptions - which does Spring prefer and why?
4. What is type erasure and what does it prevent?
5. How does GC differ from C++ RAII? What is a memory leak in Java?
6. `synchronized` vs `ReentrantLock` vs atomics; what do virtual threads change?
7. `Stream` vs loop; lazy evaluation; when streams hurt readability

**Done when:** you write the CLI project without looking things up every minute, and explain Qs 1-3 aloud.

---

## Part B - Spring core, Spring Boot, REST (1 week)

### Topics
1. **IoC / DI**: beans, `@Component/@Service/@Repository/@Configuration/@Bean`, **constructor injection** (prefer over field `@Autowired`), scopes (singleton default - stateless beans!), `@Qualifier/@Primary`
2. Auto-configuration: what `@SpringBootApplication` does, starters, `application.yml`, profiles (`dev/test/prod`), `@ConfigurationProperties` (typed config, not scattered `@Value`)
3. Bean lifecycle, `@PostConstruct`, events
4. **AOP / proxies**: how `@Transactional/@Cacheable/@Async` work (proxy wraps bean) -> **self-invocation pitfall** (calling `this.method()` bypasses the proxy)
5. Spring MVC: `@RestController`, `@RequestMapping`, `@PathVariable/@RequestParam/@RequestBody`, `ResponseEntity`, status codes, Jackson serialization, DTOs vs entities (never expose entities)
6. Validation: `@Valid`, Jakarta Bean Validation annotations, custom validator
7. Error handling: `@RestControllerAdvice`, `ProblemDetail` (RFC 9457), consistent error body
8. Layering: **controller -> service -> repository**, DTO mapping (manual or MapStruct), no business logic in controllers
9. API design: pagination (`Pageable`), idempotency keys on POST, versioning (`/api/v1`), HTTP semantics (PUT vs PATCH, 201 + `Location`, 204)
10. Servlet model: thread-per-request, Tomcat thread pool, filters vs interceptors; `OncePerRequestFilter` for request-id / logging (MDC)
11. Logging: SLF4J + Logback, structured logs, correlation id in MDC

### Read
- https://docs.spring.io/spring-boot/reference/index.html
- https://docs.spring.io/spring-framework/reference/core/beans.html
- https://docs.spring.io/spring-framework/reference/web/webmvc.html
- https://docs.spring.io/spring-boot/reference/web/servlet.html
- https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html
- https://docs.spring.io/spring-boot/reference/features/profiles.html
- https://docs.spring.io/spring-boot/reference/features/external-config.html
- Generate project: https://start.spring.io (Maven, Java 21, Spring Web, Validation, Actuator)

### Build (shortener)
- [ ] `POST /api/v1/links`, `GET /{code}` -> 302, `GET /api/v1/links/{code}`
- [ ] Request/response DTOs as `record`s with validation (valid URL, custom alias pattern)
- [ ] `@RestControllerAdvice` returning `ProblemDetail`; 404/400/409 cases
- [ ] `@ConfigurationProperties` for base URL, code length
- [ ] Request-id filter that puts id in MDC and response header
- [ ] Demonstrate the self-invocation pitfall with a small custom aspect, then fix it

### Work task
Read one existing controller + service + `@ControllerAdvice` in your company's service: draw the call path for one request (filter -> controller -> service -> repo) and list where validation/errors are handled.

### Interview Qs
1. What does `@SpringBootApplication` do? How does auto-config decide?
2. Constructor vs field injection; why singleton beans must be stateless
3. How does `@Transactional` work internally? What is the self-invocation problem?
4. `@Component` vs `@Bean`; `@Configuration` proxying
5. Filter vs interceptor vs `@ControllerAdvice`
6. How do you return consistent errors? What is ProblemDetail?
7. Why DTOs rather than entities in the API?
8. What happens to a request in Tomcat (thread pool, blocking)? How many requests can one instance handle?

**Done when:** shortener create + redirect work with validation, error model, config properties; you can explain Qs 2, 3, 8.

---

## Part C - Databases (1.5-2 weeks)  *(most important for ownership)*

### Topics
1. SQL you must be fluent in: joins, group by, indexes, `EXPLAIN ANALYZE`, composite index order, covering index
2. Data modelling: normalization, FK constraints, unique constraints, soft delete (+ **partial unique index**), `timestamptz`, money as integer cents/`numeric`, CHECK constraints
3. **Spring Data JPA**: entities, `JpaRepository`, derived queries, `@Query`, projections, `Pageable`, `@Embedded`
4. **Hibernate internals**: persistence context, entity states, dirty checking, flush; **lazy vs eager**, **N+1 problem** (`@EntityGraph`, `JOIN FETCH`, batch size), `LazyInitializationException`, `open-in-view` (turn off)
5. **Transactions**: `@Transactional` (propagation `REQUIRED` vs `REQUIRES_NEW`, rollback rules: only runtime exceptions by default, `readOnly`), isolation levels, transaction scope vs HTTP request, why no network calls inside a long transaction
6. Concurrency control: optimistic locking (`@Version`), pessimistic (`SELECT ... FOR UPDATE`, `@Lock`), atomic `UPDATE ... SET x = x + 1`, deadlocks
7. **Migrations with Flyway** (never `ddl-auto=update` in prod)
8. Connection pooling: HikariCP sizing, pool exhaustion, timeouts; why pool size != thread count
9. Idempotent writes: unique constraint + `INSERT ... ON CONFLICT`, idempotency-key table
10. Plain SQL option: `JdbcClient` / `JdbcTemplate` when JPA is wrong (bulk, reporting)
11. Transactional outbox pattern (awareness; implement in Part H)

### Read
- https://docs.spring.io/spring-data/jpa/reference/index.html
- https://docs.spring.io/spring-framework/reference/data-access/transaction.html
- https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html
- https://docs.spring.io/spring-boot/how-to/data-access.html
- https://documentation.red-gate.com/flyway
- https://vladmihalcea.com/tutorials/hibernate/ (N+1, lazy loading, locking, batching)

### Build (shortener)
- [ ] `docker compose` with Postgres; Flyway `V1__init.sql`, `V2__...`
- [ ] `Link` and `User` entities; unique index on `code`; partial unique index for soft-deleted aliases
- [ ] Paginated list `GET /api/v1/links?page=&size=`
- [ ] **Reproduce N+1** (Link -> Clicks), see it in SQL logs, fix with `JOIN FETCH` / `@EntityGraph`
- [ ] Click counter: demonstrate lost update with read-modify-write, then fix with atomic `UPDATE` and with `@Version`
- [ ] Code generation with collision handling via unique constraint + retry
- [ ] Two-thread test proving transaction rollback on runtime but *not* checked exception; fix with `rollbackFor`
- [ ] Set `spring.jpa.open-in-view=false`; observe `LazyInitializationException`, fix properly with DTO projection

### Work task
Find the slowest query or a list endpoint in your team's service; enable SQL logging, check for N+1, run `EXPLAIN` on it, and propose/add an index.

### Interview Qs
1. What is the persistence context? When does Hibernate flush?
2. N+1 - how to detect and fix? Lazy vs eager defaults?
3. `@Transactional` rollback rules; propagation `REQUIRED` vs `REQUIRES_NEW`; `readOnly`
4. Optimistic vs pessimistic locking; when each?
5. Isolation levels: what anomalies does READ COMMITTED allow? Postgres default?
6. How do you size HikariCP? What happens at pool exhaustion?
7. Why Flyway not `ddl-auto`? How do you do a zero-downtime column rename?
8. How do you make a POST idempotent?
9. When would you not use JPA?
10. Lost update: explain and give three fixes

**Done when:** shortener runs on Postgres with Flyway, no N+1 on listing, counter correct under concurrent load, you can explain Qs 2, 3, 4, 5.

---

## Part D - Security (1 week)

### Topics
1. Spring Security **filter chain** architecture; `SecurityFilterChain` bean (modern style, no `WebSecurityConfigurerAdapter`)
2. Authentication vs authorization; `UserDetailsService`, `PasswordEncoder` (BCrypt/Argon2)
3. Stateless JWT auth: access token + refresh token, expiry, rotation, revocation (denylist or short TTL), where tokens are stored
4. Resource server option: `spring-boot-starter-oauth2-resource-server` (validate JWT from IdP) - this is how most companies do it; know what OAuth2/OIDC roles mean
5. Method security: `@PreAuthorize`, roles vs permissions, ownership checks
6. CORS, CSRF (when needed vs stateless APIs), security headers
7. Secrets: never in git, env vars/secret manager; input validation vs injection (parameterized queries); rate limiting login
8. Common vulns: IDOR (broken object-level authorization), mass assignment (hence DTOs), JWT `alg=none`/weak secret

### Read
- https://docs.spring.io/spring-security/reference/index.html
- https://docs.spring.io/spring-security/reference/servlet/architecture.html

### Build
- [ ] `POST /auth/register`, `/auth/login` (BCrypt), JWT access token + refresh token
- [ ] Protect `/api/**`, keep `GET /{code}` public
- [ ] `@PreAuthorize` ownership: user can only edit/delete own links; test IDOR (user B tries user A's link -> 403/404)
- [ ] Login rate limit
- [ ] Switch to resource-server style validation against a local JWKS (e.g. Keycloak in Docker) - optional

### Work task
Trace how your company's service authenticates a request: where is the token validated, how are roles derived, where is the ownership check done?

### Interview Qs
1. Walk through Spring Security's filter chain for a JWT request
2. JWT vs server session: tradeoffs; how do you revoke a JWT?
3. Why BCrypt not SHA-256?
4. What is IDOR; how do you prevent it?
5. When is CSRF protection needed?
6. Access vs refresh token; where to store on the client?

**Done when:** shortener has auth, ownership enforced and tested, and you can explain Qs 1, 2, 4.

---

## Part E - Redis, caching, async, scheduling, webhooks (1-1.5 weeks)

### Topics
1. Spring Cache abstraction: `@Cacheable/@CacheEvict`, TTL, key design; vs manual cache-aside with `StringRedisTemplate`
2. Cache problems: stampede, penetration (negative caching), stale data, invalidation (C3)
3. Redis data types and uses: strings, hashes, `INCR`+`EXPIRE`, sorted sets, TTL
4. Rate limiting: fixed window with `INCR`, sliding window, token bucket (Bucket4j option)
5. `@Async` and `TaskExecutor` (bounded pool, rejection policy); `CompletableFuture`; virtual threads (`spring.threads.virtual.enabled=true`)
6. `@Scheduled` and the **multi-instance problem** (every instance runs it) -> ShedLock or DB lease via atomic `UPDATE`
7. Webhooks: send with **HMAC signature**, retries with backoff, idempotency on receiver; receive: verify signature, constant-time compare
8. Queues: Redis Streams or RabbitMQ/Kafka basics, at-least-once -> idempotent consumers (D1, D3)
9. Async request-reply pattern (D5): 202 Accepted + status endpoint

### Read
- https://docs.spring.io/spring-boot/reference/io/caching.html
- https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html
- https://docs.spring.io/spring-framework/reference/integration/scheduling.html
- https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html
- https://github.com/lukas-krecan/ShedLock
- https://github.com/bucket4j/bucket4j

### Build
- [ ] Redis container; cache-aside for `GET /{code}` with TTL and negative cache
- [ ] Load test redirect (k6/`hey`) with and without cache; record the numbers
- [ ] Per-IP rate limiter (Redis `INCR` + `EXPIRE`), returns `429` + `Retry-After`
- [ ] Async click recording via bounded executor; show what happens when the queue fills
- [ ] `@Scheduled` expiry cleanup that runs on only one instance (start two instances, prove it)
- [ ] Outgoing webhook "link created" with HMAC signature + retry

### Work task
List every `@Scheduled`/`@Async`/cache usage in your service; check each for: multi-instance safety, bounded pool, TTL, invalidation path.

### Interview Qs
1. Cache-aside vs write-through; what is a stampede and how do you stop it?
2. Why does `@Cacheable` not work on self-invocation?
3. How do you run a scheduled job on exactly one of N instances?
4. Design a rate limiter; where do you store counters and why?
5. At-least-once delivery -> how do consumers stay correct?
6. What should an `@Async` executor config always include?

**Done when:** redirect is cached, rate-limited, analytics are async, scheduled job is single-instance safe, and you can explain Qs 1, 3, 5.

---

## Part F - Testing (3-5 days)

### Topics
1. JUnit 5 (lifecycle, parameterized), AssertJ, Mockito (`@Mock`, `@InjectMocks`, `verify`, don't over-mock)
2. Test pyramid; slice tests: `@WebMvcTest` + `MockMvc`, `@DataJpaTest`, vs full `@SpringBootTest`
3. **Testcontainers** for real Postgres/Redis (don't test against H2 - dialect differs); `@ServiceConnection`
4. Testing security (`@WithMockUser`, JWT in MockMvc), testing time/concurrency
5. Contract of API errors in tests (ProblemDetail shape)

### Read
- https://docs.spring.io/spring-boot/reference/testing/index.html
- https://docs.spring.io/spring-boot/reference/testing/testcontainers.html
- https://java.testcontainers.org

### Build
- [ ] Service unit tests with Mockito (code collision retry, expiry logic)
- [ ] `@WebMvcTest` for validation + error responses + auth (401/403)
- [ ] Testcontainers integration test: create -> redirect -> counter; concurrent click test
- [ ] Coverage report (JaCoCo) - target meaningful paths, not a number

### Work task
Add one missing integration test in your team's repo for a bug-prone path (and one test that would have caught a past incident).

### Interview Qs
1. Unit vs slice vs integration; what do you mock and what not?
2. Why Testcontainers over H2?
3. How do you test a concurrent counter / idempotent endpoint?
4. How do you keep tests fast and non-flaky?

**Done when:** `mvn verify` runs all tests green including containers, and CI will run them.

---

## Part G - Operations (1 week)

### Topics
1. **Actuator**: `/actuator/health` with liveness/readiness groups (K8s probes), `info`, `metrics`, `prometheus`; secure the endpoints
2. **Graceful shutdown**: `server.shutdown=graceful`, `spring.lifecycle.timeout-per-shutdown-phase`, readiness flips first, in-flight requests finish
3. Observability: Micrometer metrics (counter/timer/gauge), custom metrics (redirects, cache hit ratio), tracing (OpenTelemetry), structured logs + correlation id; SLOs (I4)
4. **Resilience4j**: timeouts, retry with backoff + jitter, circuit breaker, bulkhead, rate limiter; fallback when Redis is down (I2, I3)
5. HTTP clients: `RestClient`/`WebClient` with **connect + read timeouts always set**
6. Docker: layered jar / buildpacks (`mvn spring-boot:build-image`), non-root user, memory flags (`-XX:MaxRAMPercentage`)
7. CI: GitHub Actions (`mvn verify`, build image, push), environment config via env vars
8. Deploy basics: env profiles, secrets, DB migrations at startup vs separate job, rollbacks, blue/green

### Read
- https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes
- https://docs.spring.io/spring-boot/reference/actuator/observability.html
- https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- https://docs.spring.io/spring-boot/reference/packaging/container-images/index.html
- https://resilience4j.readme.io/docs/getting-started
- https://docs.spring.io/spring-boot/how-to/webserver.html

### Build
- [ ] Liveness/readiness endpoints; readiness reflects DB; liveness does not
- [ ] Graceful shutdown proof: start a slow request, send SIGTERM, request completes
- [ ] Custom metrics on `/actuator/prometheus` (redirect count, cache hit ratio, latency histogram)
- [ ] Resilience4j around Redis: timeout + circuit breaker, redirects still work from DB when Redis is down
- [ ] Dockerfile/buildpack image, non-root, run with `docker compose` (app + Postgres + Redis)
- [ ] GitHub Actions: `mvn verify` -> image build

### Work task
Open your team's dashboard/alerts: list the top 3 metrics/alerts you'd add, and check timeouts on every outbound call in your service.

### Interview Qs
1. Liveness vs readiness - what goes wrong if you mix them?
2. What happens on deploy to in-flight requests?
3. Timeouts, retries, circuit breaker: how do they interact? Retry storms?
4. How do you find the cause of a latency spike in prod?
5. What would you alert on (SLOs, burn rate)?
6. How do you roll out a DB migration safely with N instances running?

**Done when:** one command starts the whole stack; a Redis outage doesn't break redirects; you can describe a deploy end-to-end.

---

## Part H - Optional later

- **Kafka + outbox** (D2, D4): publish click events via transactional outbox, idempotent consumer
- **Microservice boundaries** (I5), sagas (G4)
- **Spring AI / RAG** (links back to the Python AI roadmap): Spring AI `ChatClient`, vector store (pgvector)
- WebFlux/reactive: only if your company uses it; otherwise virtual threads cover most cases

---

## 8. Spring Boot "gotchas" checklist (review before interviews/PRs)

- [ ] Constructor injection, stateless singletons
- [ ] No entities in API responses; DTOs validated with `@Valid`
- [ ] `open-in-view=false`; no lazy loading outside transactions
- [ ] N+1 checked on every list endpoint
- [ ] `@Transactional` on service layer, not controller; no remote calls inside it; self-invocation avoided
- [ ] Runtime vs checked exception rollback understood
- [ ] Flyway for schema; never `ddl-auto=update`/`create` in prod
- [ ] HikariCP size deliberate; timeouts on all outbound calls
- [ ] `@Scheduled` guarded with a lock for multi-instance
- [ ] Bounded `@Async` executor
- [ ] Idempotency on writes that can be retried
- [ ] Graceful shutdown + readiness/liveness configured
- [ ] Secrets externalised; password hashing; ownership checks (IDOR)

---

## 9. Udemy course options (optional, ~20-30 h)

> Hours, ratings and last-updated dates below come from web searches, **not verified on Udemy** (Udemy blocks automated checks). Open the course page and check: updated for **Spring Boot 3 / Java 17+**, recent updates, and Udemy's frequent sale price.

| Course | Approx. hours | Fit |
|---|---|---|
| **Nam Ha Minh - "Spring Boot REST APIs Ultimate Course"** | ~24-26 h | Best fit for 20-30 h: REST design, JWT/OAuth2, testing, deployment; covers parts B, D, F, G |
| **Chad Darby - "[NEW] Spring Boot 3, Spring 6 & Hibernate for Beginners"** | ~34 h (skip Thymeleaf/MVC views -> ~25 h) | Most popular, ~4.6 rating, best for JPA/Hibernate + Security basics (parts B, C, D) |
| "Build Production Ready REST API in Spring Boot" (Expense App) | ~22 h | Project-style: JPA, Security 6, JWT, Docker/AWS |
| Amigoscode - "Spring Boot for Beginners" | ~12-17 h | Lighter, quicker overview |
| in28Minutes - "Master Spring Boot 3 & Spring Framework 6" | 40+ h | Broad; too long unless you want depth |
| Avoid for now | 85-130 h | Telusko full-stack bundle, Tim Buchalka Java Masterclass (only core-Java first ~14 h is relevant, and you know C++) |

**My pick:** Chad Darby, watching only the Spring Boot REST + Hibernate/JPA + Security sections *or* Nam Ha Minh's REST course if you prefer API/production focus. Neither covers Redis, Testcontainers, resilience, actuator probes deeply - those come from this roadmap's Read lists.

**Free alternatives:** https://spring.academy/courses (official, free tier), https://dev.java/learn/ (Part A).

### How to pair a course with this roadmap
1. Watch a section at 1.25-1.5x, then close it.
2. Rebuild the same thing in your own project, in your own style.
3. Break it on purpose (N+1, lost update, missing timeout) and fix it.
4. Answer that part's Interview Qs aloud **without AI**.

---

## 10. Suggested calendar (flex it)

| Week | Parts |
|---|---|
| 1 | A (+ start B) |
| 2 | B |
| 3-4 | C |
| 5 | D |
| 6 | E |
| 7 | F + G start |
| 8 | G + HLD consolidation reading |
| 9+ | H as work needs it |

Work tasks (the "apply at work" items) run in parallel with each part - they are what make this stick.
