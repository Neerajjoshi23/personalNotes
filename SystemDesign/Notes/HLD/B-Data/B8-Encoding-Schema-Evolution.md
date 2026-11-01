# B8 · Encoding + Schema Evolution: changing data without breaking old code

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Kafka / event streams (#13/#20/#23), gRPC APIs, REST APIs, Search indexing (#17), Notification (#13), Payments (#16), Chat (#3), any microservice boundary.

---

## Why this topic matters

Production systems are never upgraded all at once. One service deploys before another. Mobile clients remain old for months. Kafka events written today may be replayed next year. Database rows written by old code are read by new code.

So the real question is not "JSON or Protobuf?" It is:

> Can old and new versions of the system keep talking while the schema changes?

| Boundary | Evolution problem |
|---|---|
| REST API | old mobile app calls new server; new server returns fields old app doesn't know |
| gRPC | field numbers must remain stable across generated clients |
| Kafka event | old consumer reads new event; new consumer reads old event from backlog |
| Database | new code reads rows written before a column existed |
| CDC / search index | schema changes flow through derived systems |

**Interview line:** "For internal events I would use a schema-based binary format like Protobuf or Avro, enforce backward/forward compatibility in CI with a schema registry, and evolve fields by adding optional fields rather than renaming or reusing tags."

---

## Part 1: encoding formats are contracts

Encoding is converting in-memory data to bytes. Decoding turns bytes back into objects.

```text
Object in service A -> bytes on network/log/disk -> object in service B
```

The format decides readability, payload size, CPU cost, type information, compatibility rules, and whether schema is in code, in data or in a registry.

### JSON / XML

JSON is the default for public HTTP APIs because it is human-readable and universal.

Pros: easy debugging with browser/curl, natural for JavaScript/TypeScript, no generated code required, and unknown fields are usually ignored by clients.

Cons: numbers can be ambiguous (`int64` problems in JS), no built-in binary type, field names repeat in every message, schema is optional unless you add OpenAPI/JSON Schema, and stringly typed data can drift silently.

XML is similar but more verbose, with namespaces and attributes. You mostly mention it as an older enterprise format.

Good fit: public REST APIs, configuration, low-QPS admin boundaries.

### Binary formats: Protobuf, Thrift, Avro

Binary formats store compact typed data and usually rely on a schema.

| Format | Mental model | Common use |
|---|---|---|
| **Protocol Buffers** | `.proto` file with numbered fields; generated code | gRPC, internal RPC, durable events |
| **Thrift** | IDL with numbered fields; generated code | older cross-language RPC systems |
| **Avro** | schema stored/registered; data often decoded with writer + reader schema | Kafka/Hadoop/data pipelines |

Binary formats are not automatically better. They are better when you care about performance, type contracts and long-lived event compatibility.

---

## Part 2: Protobuf-style field tags

Protobuf does not encode field names. It encodes **field numbers** (tags) and wire types.

```proto
message UserCreated {
  string user_id = 1;
  string email = 2;
  int64 created_at_ms = 3;
}
```

A message on the wire says roughly: field `1` has string `u123`, field `2` has string `a@b.com`, field `3` has varint `...`.

That is why field numbers are sacred.

### Safe changes

```proto
message UserCreated {
  string user_id = 1;
  string email = 2;
  int64 created_at_ms = 3;
  string display_name = 4; // safe if optional/defaultable
}
```

Old readers ignore field `4`. New readers see default/empty if old messages do not contain it.

### Dangerous changes

```proto
// Dangerous: reusing a tag for a different meaning
string phone_number = 2; // tag 2 used to mean email
```

Old data will be decoded incorrectly. Even worse, the system may not crash; it may silently interpret one concept as another.

Rules of thumb:

- never reuse field numbers;
- reserve deleted field numbers and names;
- add fields as optional/defaultable;
- avoid changing a field's type unless the format explicitly says it is wire-compatible;
- rename fields carefully: the binary tag may be stable, but generated JSON names and code names may break clients.

---

## Part 3: forward and backward compatibility

Compatibility is directional. Use precise words.

| Term | Meaning | Example |
|---|---|---|
| **Backward compatibility** | New code can read old data | deploy new consumer that reads old Kafka backlog |
| **Forward compatibility** | Old code can read new data | old mobile app reads response from new server |
| **Full compatibility** | both directions | rolling deploys and replays are safe |

### The rolling deploy test

During deployment, old and new versions run together:

```text
old producer -> old consumer
old producer -> new consumer
new producer -> old consumer
new producer -> new consumer
```

Your schema change must survive all four edges.

### Common safe evolution pattern

Suppose you want to replace `full_name` with `first_name` and `last_name`.

1. Add new optional fields; keep writing old field.
2. Deploy readers that prefer new fields but fall back to old.
3. Deploy writers that write both old and new.
4. Wait until all old readers are gone and old data is migrated/expired.
5. Stop writing old field.
6. Only later remove it from code; reserve its tag.

```text
v1: full_name
v2: full_name + first_name + last_name
v3: first_name + last_name, full_name reserved
```

This is the data equivalent of frontend feature-flag migration: add, dual-write, switch readers, remove.

---

## Part 4: Avro and schema registry ⏭ *Skip for interviews*

Avro is common in Kafka/data pipelines because decoding uses both schemas:

- **writer schema:** schema used when the event was written;
- **reader schema:** schema the current consumer expects.

If the reader has a field that the writer did not, Avro can use a default. If the writer has an extra field, the reader can ignore it.

A **schema registry** stores schemas centrally and gives each version an id. Kafka messages often carry only a small schema id plus the binary payload.

```text
Producer -> Schema Registry: is UserCreated v3 compatible?
Producer -> Kafka: [schemaId=42][binary payload]
Consumer -> Registry: fetch schema 42
Consumer: decode writer schema 42 into its reader schema
```

Why it matters:

- CI/CD can reject incompatible schema changes;
- consumers can discover exactly what schema produced an event;
- event contracts become visible instead of hidden in code;
- replaying old events remains possible.

Schema registries are not only for Avro. Confluent supports Avro, Protobuf and JSON Schema, but Avro's writer/reader schema model is the classic example.

---

## Part 5: dataflow through databases, services and messages

DDIA's key framing is: data flows through systems in different ways, and compatibility requirements differ.

### 1. Through databases ⏭ *Skip for interviews*

```text
old app writes row -> new app reads row
new app writes row -> old app reads row
```

Database schema migrations must be rolling-deploy safe.

Safe pattern for adding `display_name`:

```sql
ALTER TABLE users ADD COLUMN display_name text; -- nullable first
-- deploy app that writes it
-- backfill in batches
-- later add NOT NULL / default if needed
```

Unsafe pattern: rename/drop a column while old app instances still use it.

### 2. Through services (REST/gRPC)

REST with JSON often gets forward compatibility by ignoring unknown fields, but request validation can break this if too strict.

Guidelines:

- add optional response fields freely;
- avoid changing field meaning;
- version APIs when semantics change;
- for public clients, assume old clients live for a long time;
- use idempotency keys for retries in payment/order APIs.

For gRPC/Protobuf: field numbers are the contract, add optional fields, do not reuse tags, consider unknown-field behavior by language/version, and use package/service versioning for breaking changes.

### 3. Through messages/events

Kafka events are hardest because they are durable. A consumer deployed today may read events from six months ago.

Guidelines:

- design events as facts, not commands that depend on current code meaning;
- include stable IDs and timestamps;
- avoid destructive renames;
- use schema compatibility checks;
- prefer additive changes;
- keep old consumers in mind during rolling deploys.

```json
{
  "event_id": "evt_123",
  "type": "PaymentCaptured",
  "payment_id": "pay_1",
  "amount_paise": 50000,
  "occurred_at": "2026-09-30T12:00:00Z"
}
```

---

## Part 6: JSON vs Protobuf vs Avro in interviews

| Scenario | Pick | Why |
|---|---|---|
| Public REST API | JSON + OpenAPI | debuggable, browser/client friendly |
| Internal low-latency RPC | gRPC + Protobuf | typed, compact, generated clients |
| Kafka event stream with many consumers | Avro/Protobuf + schema registry | compatibility enforcement and replay safety |
| Analytics/data lake ingestion | Avro/Parquet depending stage | schema + efficient processing |
| Frontend config | JSON | simple and inspectable |
| Tiny system / early startup | JSON first | avoid schema tooling until needed |

A nice interview answer is pragmatic:

> "Externally I expose JSON REST because clients are diverse. Internally, between services, I use Protobuf/gRPC for typed contracts. For Kafka events I use Avro or Protobuf with a schema registry and backward compatibility checks, because events are retained and replayed."

### DrawBoard example

DrawBoard's realtime Yjs updates are binary CRDT updates. That is different from business events like `BoardCreated` or `AICommentAdded`. For those durable events, a schema-based format is safer because you may replay them into analytics, search or AI indexing later.

### Adobe Connect example

Meeting telemetry is a classic schema-evolution problem: old clients emit older event shapes; new analytics jobs read mixed versions. Additive event evolution plus a registry prevents dashboards from breaking during rollout.

---

## Part 7: choosing in an interview / cheat sheet

| Need | Choice | Compatibility rule |
|---|---|---|
| Add a new field | Add optional/defaultable field | old readers ignore; new readers default |
| Remove a field | Stop using, then stop writing, reserve tag/name | never reuse identity |
| Rename a field | Treat as add new + deprecate old | names may be code/API contracts |
| Change field type | Avoid; add a new field | old bytes may decode incorrectly |
| Split one field into two | add new fields, dual-write, reader fallback | migrate gradually |
| Kafka event | schema registry + backward/full compatibility | consumers and replays are independent |
| REST public API | additive JSON changes + version breaking semantics | old clients live long |
| gRPC API | Protobuf tags stable forever | generated clients rely on IDL |

### Common interview traps

- Saying "JSON is schema-less" as if that avoids compatibility. The schema still exists; it is just implicit.
- Reusing a Protobuf field number after deleting a field.
- Thinking backward compatibility means old code can read new data. That is forward compatibility.
- Forgetting old Kafka events. New consumers must read old backlog.
- Doing a database `DROP COLUMN` in the same deploy that removes app reads.
- Changing the meaning of a field while keeping the same name/tag. That is worse than a visible breaking change.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why are Protobuf field numbers more important than field names?</summary>

The binary wire format stores field numbers/tags, not source-code names. Reusing tag `2` for a different meaning can make old data decode as the wrong field. Names matter for generated code and JSON mapping, but tags are the durable binary identity.
</details>

<details><summary>2. Define backward and forward compatibility.</summary>

Backward compatibility: new code can read old data. Forward compatibility: old code can read new data. Full compatibility means both directions work, which is what rolling deploys and event replay often need.
</details>

<details><summary>3. You want to replace <code>full_name</code> with <code>first_name</code> and <code>last_name</code>. What is the safe migration?</summary>

Add the new optional fields, deploy readers that prefer new but fall back to old, dual-write old and new fields, wait for old readers/data to disappear or backfill, then stop writing old and reserve its tag/name. Do not simply rename in place.
</details>

<details><summary>4. Why is Kafka schema evolution stricter than normal request/response APIs?</summary>

Events are durable and replayable. New consumers may read old events from months ago, and old consumers may run while new producers emit new versions. Many independent consumers make compatibility enforcement essential.
</details>

<details><summary>5. What does a schema registry add?</summary>

It stores schema versions and ids, lets producers/CI check compatibility before publishing, and lets consumers decode messages using the writer schema. It makes event contracts visible and enforceable.
</details>

<details><summary>6. When would you still choose JSON?</summary>

For public REST APIs, browser/frontend boundaries, configs, early-stage systems, or places where human debuggability matters more than compactness and generated typed clients.
</details>

<details><summary>7. Give one database migration rule that matches schema evolution rules.</summary>

Add first, remove later. For example add a nullable column, deploy code that can read/write both old and new shapes, backfill in batches, then only after old code is gone add stricter constraints or drop the old column.
</details>

<details><summary>8. Why is "change field type" usually treated as "add a new field"?</summary>

Old data and old clients expect the previous type. Even if one format has some compatible type changes, the safe general rule is to add a new field with a new tag/name and migrate readers gradually.
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
| **DDIA ch 4: Encoding and Evolution** | Whole chapter; this note follows its structure | [p.133](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=133>) |
| ↳ Formats for Encoding Data | JSON/XML/binary formats, Thrift/Protobuf, Avro, schema evolution | [p.134](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=134>) |
| ↳ Modes of Dataflow | Dataflow through databases, services and messages | [p.150](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=150>) |
| ↳ Summary | Quick revision | [p.161](<../../../Books/DDIA - Martin Kleppmann (1st ed).pdf#page=161>) |
| [Protocol Buffers: Proto3 guide](https://protobuf.dev/programming-guides/proto3/) | Exact headings: "Defining A Message Type", "Specifying Field Types", "Assigning Field Numbers", "Specifying Field Cardinality", "Deleting Fields" | ~20 min |
| [Confluent Schema Registry: Schema Evolution](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) | Exact headings: "Schema evolution", "Compatibility types", "Backward compatibility", "Forward compatibility", "Full compatibility", "Transitive property" | ~15 min |
| [gRPC Core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/) | Exact headings: "Overview", "RPC life cycle" | ~10 min |
| [Apache Avro Specification](https://avro.apache.org/docs/current/specification/) | Read "Schemas", "Primitive Types", "Complex Types", "Schema Resolution" | ~20 min |

**Connects to:** [D2 Kafka](../D-Async/D2-Kafka.md) · [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md) · [A6 API design](../A-Fundamentals/A6-API-Design.md) · [B1 Data models](B1-Data-Models-DB-Choice.md) · Questions: Notification (#13), Message queue (#23), Payment (#16), Search (#17)
