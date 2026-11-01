# G4 · Sagas: long-running transactions without pretending the world is one database

> **Status:** [ ] Read the blog ? [ ] Read the sources ? [ ] Self-test passed · **Date:** ___
> **Used in:** Payment / wallet / UPI (#16), E-commerce / flash sale (#18), Ticket / hotel booking (#8), Uber trip (#9), Notification system (#13)

---

## Why this topic matters

A product flow often spans many services: order service, inventory, payment, shipping, notification, loyalty. The user sees one action: "place order". The system sees multiple local transactions and remote calls, any of which can fail halfway.

The naive answer is a distributed transaction: lock all participants and commit all at once. In real microservice systems, that is usually avoided because it couples availability, performance and operations across every participant. The practical pattern is a **saga**: a sequence of local transactions, each with a compensating action if later steps fail.

| Flow | Local steps | Possible compensation |
|---|---|---|
| E-commerce order | reserve inventory → authorize payment → create shipment | release inventory, void/refund payment, cancel shipment |
| Trip booking | reserve flight → reserve hotel → reserve cab | cancel each reservation according to policy |
| Ticket booking | hold seat → charge payment → confirm ticket | release hold, refund/void payment |
| Uber trip | match driver → start trip → charge rider → pay driver | cancel match, reverse/adjust payment |

**Interview line:** "I won't use 2PC across services for the checkout path. I'll model it as a saga with durable state, idempotent steps and explicit compensations. Each service commits locally; the saga orchestrator decides the next step or rollback."

---

## Part 1: why distributed transactions and 2PC are avoided

Two-phase commit (2PC) tries to make multiple systems commit atomically.

```
Phase 1: prepare
Coordinator -> Inventory: can you commit?  yes, locks/resources held
Coordinator -> Payment:   can you commit?  yes, locks/resources held

Phase 2: commit/abort
Coordinator -> all: commit
```

It is conceptually clean: either everyone commits or everyone aborts. The problem is the operational cost.

| 2PC issue | Why interviewers care |
|---|---|
| Blocking | If the coordinator fails after participants prepare, participants may hold locks while waiting to learn commit/abort |
| Coupling | All participants must support compatible transaction protocol semantics |
| Slow path | Locks/resources are held across network round trips |
| Availability | One unhealthy participant can block the whole business flow |
| Operations | Recovery, heuristics and coordinator logs are hard to explain and run correctly |

DDIA's distributed-transactions chapter explains that 2PC is an atomic commit protocol, not a magic availability tool. It can be appropriate inside one database cluster or tightly controlled infrastructure. But across independently deployed microservices and third-party APIs (PSP, shipping provider, airline), you usually cannot ask everyone to "prepare" and hold locks.

So sagas accept a different contract:

- each step commits locally;
- later failure is handled by another business action;
- the system may be temporarily inconsistent;
- state machines and idempotency make recovery safe.

This is closer to real business. A refund is not time travel; it is a new transaction that compensates a charge.

---

## Part 2: saga pattern basics

A saga is a durable workflow of local transactions.

```
Create order
  T1: reserve inventory      C1: release inventory
  T2: authorize payment      C2: void/refund payment
  T3: create shipment        C3: cancel shipment
  T4: mark order confirmed
```

If `T3` fails, the saga runs `C2` and `C1` according to business rules.

Key ideas:

| Concept | Meaning |
|---|---|
| Local transaction | A normal transaction inside one service/database |
| Saga state | Durable record of which steps completed and what to do next |
| Compensation | Business action that semantically undoes or offsets a completed step |
| Idempotency key | Stable key that makes retries safe |
| Timeout | Step did not complete in time; choose retry/compensate/manual review |
| Terminal states | `COMPLETED`, `COMPENSATED`, `FAILED_NEEDS_REVIEW` |

A simple order state machine:

```text
PENDING
  -> INVENTORY_RESERVED
  -> PAYMENT_AUTHORIZED
  -> SHIPMENT_CREATED
  -> CONFIRMED

Failure path:
PAYMENT_FAILED
  -> INVENTORY_RELEASED
  -> CANCELLED

SHIPMENT_FAILED
  -> PAYMENT_VOIDED
  -> INVENTORY_RELEASED
  -> CANCELLED
```

A saga is not "eventual consistency" as a vague excuse. It is a **controlled state machine** with explicit recovery paths.

---

## Part 3: orchestration vs choreography

There are two common ways to coordinate sagas.

### Orchestration

One orchestrator owns the workflow and tells services what to do.

```
OrderSaga orchestrator
  -> Inventory.reserve(orderId)
  <- InventoryReserved
  -> Payment.authorize(orderId, idempotencyKey)
  <- PaymentAuthorized
  -> Shipping.create(orderId)
  <- ShipmentCreated
  -> Order.confirm(orderId)
```

Pros:

- Easy to see the whole state machine in one place.
- Easier timeouts, retries and compensation order.
- Good for money/booking flows where correctness is central.
- Natural fit for workflow engines like Temporal.

Cons:

- Orchestrator can become a god service.
- Other services may become passive command handlers.
- Needs careful versioning as workflows evolve.

### Choreography

Services react to events; no central controller.

```
OrderCreated event
  -> Inventory service reserves and emits InventoryReserved
  -> Payment service authorizes and emits PaymentAuthorized
  -> Shipping service creates shipment and emits ShipmentCreated
  -> Order service confirms
```

Pros:

- Loosely coupled producers and consumers.
- Works well for simple flows and side effects like notifications.
- Easy to add observers.

Cons:

- Workflow is spread across services; harder to reason about.
- Cycles and event storms are possible.
- Compensation logic can become hidden and inconsistent.
- Debugging "where is this order stuck?" is harder.

Rule of thumb:

| Flow type | Prefer |
|---|---|
| Simple fan-out side effects | Choreography |
| Payment/booking/trip with user-visible state | Orchestration |
| Long-running, multi-day, human/manual steps | Orchestration / workflow engine |
| Analytics/search indexing events | Choreography |

**Interview line:** "For checkout I prefer orchestration because I want one durable place to see the order state and drive compensation. For non-critical projections like search indexing, choreography through events is fine."

---

## Part 4: compensating transactions are business actions, not undo buttons

A compensation is not always the exact inverse of a step.

| Completed step | Compensation |
|---|---|
| Inventory reserved | Release reservation |
| Card authorized | Void authorization if unsettled; refund if captured |
| Wallet debited | Credit wallet with linked reversal entry |
| Email sent | Send correction email; cannot unsend |
| Driver assigned | Cancel assignment and notify driver/rider |
| Hotel booked | Cancel booking; may incur fee based on policy |

Important design rules:

1. **Compensations must be idempotent.** Retrying `releaseInventory(orderId)` should not add inventory twice.
2. **Compensations may fail.** They need retries, alerts and sometimes manual review.
3. **Compensation order matters.** Usually reverse order of successful steps, but business policy can differ.
4. **Some steps are irreversible.** Avoid doing them until late, or design forward recovery.
5. **Audit everything.** Especially payment and ledger-related compensations.

Azure's compensating transaction pattern stresses that undo work may be intelligent and application-specific. You cannot rely on infrastructure to know what "undo shipment" means.

Payment example:

```
1. Create payment intent with PSP using idempotency key order:123:pay
2. PSP authorizes card but shipment creation fails
3. Saga calls void authorization with key order:123:void
4. If void fails because capture already happened, create refund
5. Order enters CANCELLED_REFUNDED or NEEDS_REVIEW
```

Notice the state names. They are part of the design. In interviews, naming states makes the flow concrete.

---

## Part 5: idempotent steps, retries and outbox

Sagas run over unreliable networks. A timeout does not mean failure. It means "unknown".

```
Orchestrator -> Payment.authorize(order=123)
Network timeout

Did PSP charge?
- yes, response lost
- no, request never arrived
- maybe still processing
```

So every command needs an idempotency key:

| Step | Idempotency key |
|---|---|
| Reserve inventory | `reserve:order-123:item-456` |
| Authorize payment | `payauth:order-123` |
| Create shipment | `ship:order-123` |
| Send confirmation | `email:order-123:confirmed` |

Service-side pattern:

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

On retry, return the stored response or continue the in-progress operation safely.

For event-driven steps, use [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md): write local state and event in the same database transaction, then publish from the outbox. This avoids the dual-write bug where a service updates its DB but crashes before publishing the event.

```
BEGIN;
UPDATE orders SET state='PAYMENT_AUTHORIZED' WHERE id=123;
INSERT INTO outbox(event_type, aggregate_id, payload) VALUES (...);
COMMIT;

CDC/publisher -> Kafka -> next service
```

Consumers must also be idempotent because at-least-once delivery means duplicates happen.

---

## Part 6: workflow engines and Temporal

You can implement a saga with tables, queues and workers. But long-running workflows have many edge cases:

- worker crashes after calling an activity;
- timers that wait minutes/days;
- retries with backoff;
- human approval steps;
- versioning workflow code;
- querying current workflow state;
- avoiding non-determinism during replay.

Temporal is a workflow engine for durable execution. You write workflow code that looks sequential, while Temporal records history and replays deterministic decisions.

Conceptual example:

```ts
async function orderSaga(orderId: string) {
  await reserveInventory(orderId);
  try {
    await authorizePayment(orderId);
    await createShipment(orderId);
    await confirmOrder(orderId);
  } catch (e) {
    await compensate(orderId);
    throw e;
  }
}
```

The real value is not syntax; it is durable state, timers, retries and visibility. Hello Interview's Temporal deep dive builds this intuition: make the function survive crashes, replay predictably, wait, and be woken by outside signals.

When to mention Temporal:

| Use Temporal when... | Avoid / be cautious when... |
|---|---|
| Workflow is long-running and business-critical | Flow is a simple one-step async job |
| You need timers, retries and human steps | Team cannot operate another critical platform |
| You need visibility into stuck workflows | Very high-throughput tiny events are better as streams |
| Compensation logic is complex | You need pure request/response latency in milliseconds |

In an interview, you can say: "I'll start with an `order_sagas` table and workers. At larger complexity, a workflow engine like Temporal gives durable execution and observability."

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Single database checkout | Normal DB transaction | Simpler; ACID works inside one DB |
| Checkout across inventory/payment/shipping services | Orchestrated saga | Clear state machine and compensation |
| Search index update after post | Choreography via outbox event | Projection can lag and retry independently |
| Payment capture + wallet ledger | Saga plus ledger entries and idempotency | Money needs audit and safe retries |
| Trip booking with flight/hotel/cab APIs | Saga with compensations and manual review states | External APIs cannot join 2PC |
| Multi-day approval workflow | Temporal/workflow engine | Durable timers, signals and visibility |
| Need strict all-or-nothing in one storage system | DB transaction / serializable isolation | Saga is not a substitute for local ACID |

### Common interview traps

- Saying "use saga" without listing compensating actions.
- Treating compensation as automatic rollback. It is a business operation and may fail.
- Ignoring idempotency for every command and event consumer.
- Letting a choreographed saga become invisible spaghetti.
- Using 2PC casually across services and third-party APIs.
- Forgetting terminal states for manual review when compensation cannot complete.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is 2PC often avoided across microservices?</summary>

It blocks participants while prepared, couples all services to one atomic commit protocol, holds resources across network failures, and makes availability depend on every participant and the coordinator. It is hard to operate across independently deployed services and third-party APIs.
</details>

<details><summary>2. What is a saga?</summary>

A sequence of local transactions coordinated as one business workflow. Each successful step has a compensating action if a later step fails. The saga's progress is stored durably as a state machine.
</details>

<details><summary>3. Orchestration vs choreography: which would you choose for checkout and why?</summary>

Orchestration. Checkout has central user-visible state, payment/inventory dependencies, timeouts and compensations. One orchestrator makes the workflow easier to observe, retry and compensate.
</details>

<details><summary>4. Give two examples where compensation is not a perfect undo.</summary>

An email cannot be unsent; you send a correction. A captured card payment cannot be uncharged; you issue a refund. A hotel cancellation may incur a fee rather than restoring the exact previous state.
</details>

<details><summary>5. Why does every saga step need an idempotency key?</summary>

Retries and timeouts are unavoidable. The orchestrator may not know whether the previous attempt succeeded, so the receiver must safely return the same result or continue the same operation instead of duplicating side effects.
</details>

<details><summary>6. How does the outbox pattern support sagas?</summary>

It writes the local state change and the event/command to an outbox in one DB transaction. A publisher/CDC process later emits it. This avoids updating state but losing the event during a crash.
</details>

<details><summary>7. When would you introduce Temporal?</summary>

When workflows are long-running or complex enough to need durable timers, retries, crash recovery, signals, state visibility and deterministic replay. For simple async events, queues and tables may be enough.
</details>

<details><summary>8. In a failed order after payment authorization, what states might you record?</summary>

For example: `PAYMENT_AUTHORIZED`, `SHIPMENT_FAILED`, `PAYMENT_VOID_REQUESTED`, `PAYMENT_VOIDED`, `INVENTORY_RELEASED`, `CANCELLED`; or `NEEDS_REVIEW` if void/refund fails.
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
| [microservices.io: Saga pattern](https://microservices.io/patterns/data/saga.html) | Headings: "Context", "Problem", "Forces", "Solution", "Example: Choreography-based saga", "Example: Orchestration-based saga", "Resulting context" | ~25 min |
| [Azure Architecture: Compensating transaction](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) | Headings: "Context and problem", "Solution", "Problems and considerations", "When to use this pattern", "Workload design", "Example" | ~25 min |
| [Hello Interview: Temporal deep dive](https://www.hellointerview.com/learn/system-design/deep-dives/temporal) | Headings: "Building durable execution from scratch", "Make the function survive a crash", "Make replay predictable", "Let the Workflow wait", "Let the outside world wake the Workflow", "What is Temporal?", "Temporal under the hood", "When to Use Temporal" | ~45 min |
| **DDIA ch 9: Consistency and Consensus** (1st ed) | "Distributed Transactions and Consensus" and 2PC sections: atomic commit, XA transactions, coordinator failure, three-phase commit caveat | [PDF p.374](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=374>) – [p.385](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=385>) |

**Connects to:** [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md) · [G2 Distributed locks + reservations](G2-Distributed-Locks-Reservations.md) · [G5 Ledger + reconciliation](G5-Ledger-Reconciliation.md) · [B3 Transactions](../B-Data/B3-Transactions-Isolation.md)
