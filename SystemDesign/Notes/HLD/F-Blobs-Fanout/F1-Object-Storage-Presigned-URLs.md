# F1 · Object Storage + Presigned URLs: keep blobs out of your hot path

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Dropbox / Google Drive (#5), YouTube / Netflix / TikTok (#6), Instagram / photo sharing (#11), Chat (#3: attachments), News feed (#4: media posts)

---

## Why this topic matters

Almost every product eventually stores large binary objects: profile photos, PDFs, meeting recordings, whiteboard exports, chat attachments, videos. The trap is to treat a blob like another database column. That works for a toy app; at system-design scale it hurts the database, the app servers and the user experience.

| Decision | Good default | Why interviewers care |
|---|---|---|
| Blob bytes | Object storage (S3 / Azure Blob / GCS) | Cheap, durable, elastic, CDN-friendly |
| Blob metadata | SQL / document DB | Queryable ownership, permissions, status, versioning |
| Upload path | Client → object storage via presigned URL | App servers do not proxy gigabytes |
| Download path | CDN/object storage via short-lived URL | Auth stays in app; bytes flow from storage edge |
| Processing | Event-driven pipeline | virus scan, thumbnails, transcoding, OCR, moderation |

Think of Adobe Connect recordings: the meeting DB should know *which* recording belongs to a room, its duration, owner and processing status. It should not store the MP4 bytes. DrawBoard is similar: Supabase/Postgres can store board metadata; exported PNG/PDF snapshots belong in object storage.

---

## Part 1: why blobs do not belong in the database

A relational database is great at small records, indexes, transactions and constraints. A blob store is great at storing immutable byte streams cheaply and serving them at high throughput. Mixing the two makes each system do the other system's job.

### What goes wrong with blobs in DB rows

1. **Backup and restore become huge.** A user table with profile images makes every backup heavier, even if the images rarely change.
2. **Replication lag increases.** A 500 MB upload has to move through the database replication path that also carries tiny, latency-sensitive writes.
3. **Buffer cache pollution.** Databases cache pages for indexes and hot rows. Large binary pages evict useful data.
4. **App servers become byte pipes.** If uploads go client → app → DB, your API fleet pays for bandwidth and memory pressure.
5. **CDN integration is awkward.** CDNs naturally cache HTTP objects from object storage; they do not naturally cache arbitrary DB rows.
6. **Lifecycle policy is missing.** Object stores can move old blobs to colder tiers; DBs are not built around per-object tiering.

There are exceptions: tiny avatars or thumbnails might fit in a DB for a small monolith, and some DBs support large objects. But for an interview answer, the default is clear: **metadata in DB, bytes in object storage**.

```
Client ──upload bytes──► Object Storage
   │                         │
   └──metadata/status──► App API ──► Metadata DB
```

**Interview line:** "I keep the source of truth for permissions and object state in the database, but the raw bytes live in object storage. That keeps database replication, backups and query latency independent of file size."

---

## Part 2: the object storage model

Object storage looks simple from the outside: put bytes at a key, get bytes by key. The important pieces are:

| Term | Meaning | Interview example |
|---|---|---|
| **Bucket / container** | Top-level namespace with policies | `connect-recordings-prod` |
| **Key / object name** | Path-like identifier, not a real folder | `tenant/123/meeting/456/recording/original.mp4` |
| **Object body** | Immutable-ish byte stream | video, image, ZIP, PDF |
| **Metadata** | Small key-value fields on the object | content type, checksum, owner id, scan status |
| **Version** | Optional old copy after overwrite/delete | restore previous file version |
| **Durability** | Probability of not losing the object | achieved by replication/erasure coding inside the service |

### Keys are design, not decoration

A key is not just a filename. It should support operational needs:

- avoid user-supplied names as raw keys (`../../../weird` and collisions);
- include tenant/user/record ids for debugging;
- add a random UUID to prevent guessing;
- keep extension/content type for humans and downstream processors.

Example:

```text
uploads/{tenantId}/{userId}/{fileId}/original
processed/{tenantId}/{fileId}/thumbnail_320.jpg
videos/{tenantId}/{videoId}/hls/720p/segment_00042.ts
```

The user-facing filename (`resume.pdf`) belongs in DB metadata, not necessarily in the storage key. If a user renames a file, you update metadata, not move a large object.

### Object metadata vs application metadata

Object storage metadata is useful for storage-adjacent facts: `Content-Type`, checksum, encryption mode, original upload id. Application metadata belongs in your DB because you query it and enforce permissions there.

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size_bytes BIGINT,
  content_type TEXT,
  checksum_sha256 TEXT,
  status TEXT NOT NULL CHECK (status IN ('UPLOADING','UPLOADED','SCANNING','READY','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

The database row is the state machine. The object is the payload.

---

## Part 3: presigned URLs and the valet-key pattern

A presigned URL is a time-limited URL that grants one specific storage operation without giving the client your storage credentials. Azure calls the same idea the **Valet Key pattern**: the app gives the client a narrowly scoped key to access a resource directly.

### Upload flow

```
1. Client asks API: "I want to upload file X, 140 MB, image/png"
2. API authenticates user, creates DB row status=UPLOADING
3. API creates presigned PUT/POST URL for bucket+key, expires in e.g. 10 min
4. Client uploads bytes directly to object storage
5. Client calls completeUpload(fileId, checksum, size) OR storage emits event
6. API verifies object exists, updates status=UPLOADED/SCANNING
7. Processing pipeline scans/derives assets, then marks READY
```

```text
Browser/mobile
   │ 1 create upload
   ▼
App API ──2 DB row──► Metadata DB
   │ 3 presigned PUT
   ▼
Browser/mobile ──4 bytes──► Object Storage ──event──► Queue/Worker
```

Why this is good:

- app servers handle small control-plane requests only;
- upload bandwidth scales with the storage service;
- retries can be client-to-storage without re-hitting API servers;
- credentials are short-lived and scoped to one key/operation.

### Download flow

For private objects, the client first asks the API. The API checks authorization and returns either:

1. a short-lived presigned GET URL, or
2. a CDN signed URL/cookie if a CDN fronts private content.

For public assets like thumbnails, you can use normal CDN URLs. For private recordings, signed URLs are safer.

### Security details interviewers expect

| Risk | Mitigation |
|---|---|
| URL leaked in logs/chat | Short expiry, HTTPS only, minimal scope |
| User uploads an executable as `image/png` | validate size/content type in API and scanner; do not trust extension |
| Client overwrites another user's object | server chooses the key; presign only that key |
| Huge uploads abuse storage | enforce max size, quotas, lifecycle cleanup for abandoned uploads |
| Replay after completion | one-time application state transition: only `UPLOADING → UPLOADED` |

The storage service enforces what the signature allows. Your app enforces business rules before it generates the signature and after upload completion.

**Interview line:** "A presigned URL moves the data plane out of my API tier while keeping the control plane in my app: auth, ownership, quotas and state transitions still go through the service."

---

## Part 4: multipart and resumable uploads

Large uploads fail. Phones switch networks; browsers close; a single 5 GB PUT is painful to retry. Multipart upload splits the file into parts, uploads them independently, then asks storage to assemble them.

```
Client                     App/API                  Object Storage
  │ create multipart         │                           │
  ├─────────────────────────►│ create DB upload session  │
  │                          ├──initiate multipart──────►│
  │ ◄──uploadId + URLs───────┤                           │
  ├──part 1─────────────────────────────────────────────►│
  ├──part 2─────────────────────────────────────────────►│
  ├──part 3 retry───────────────────────────────────────►│
  │ complete(parts+ETags)     │                           │
  ├─────────────────────────►│ validate parts            │
  │                          ├──complete multipart──────►│
```

Key ideas:

- **Parallelism:** upload several parts at once to use bandwidth.
- **Resume:** remember `uploadId` and completed part numbers/ETags; retry missing parts only.
- **Integrity:** store checksum/ETag per part and a whole-object checksum if available.
- **Abort:** incomplete multipart uploads can cost money; lifecycle rules should abort old sessions.

For a Dropbox-style client, chunking may happen before the upload layer for dedup and delta sync. For a generic web upload, multipart is enough.

### Upload-complete event: client callback vs storage event

There are two common completion signals:

| Signal | How it works | Risk |
|---|---|---|
| Client calls `completeUpload` | simple; API can validate object exists | client may crash after upload succeeds |
| Storage event to queue | robust server-side trigger | events may be delayed/duplicated; worker must be idempotent |

Use both when correctness matters: the client call gives fast UX, and the storage event is a safety net. Store idempotency on `file_id`, not on a random worker attempt.

---

## Part 5: CDN, lifecycle, scanning and processing

Object storage is durable storage; a CDN is the delivery layer. The common pattern is:

```
Browser ──GET thumbnail/video segment──► CDN edge ──miss──► Object Storage origin
```

For public images and video segments, a CDN reduces latency and origin load. For private content, use signed CDN URLs/cookies or make the CDN call an authenticated origin. Do not bypass authorization by making every object public.

### Processing pipeline

A production upload rarely becomes visible immediately:

1. `UPLOADING`: DB row exists; object may be incomplete.
2. `UPLOADED`: raw object exists with checksum/size.
3. `SCANNING`: virus/malware scanner reads object in an isolated worker.
4. `PROCESSING`: create thumbnails, extract metadata, transcode, OCR, moderation.
5. `READY`: safe derived assets are available.
6. `REJECTED`: suspicious or invalid object; delete/quarantine.

```text
ObjectCreated event
      │
      ▼
Queue ─► scanner ─► thumbnailer/transcoder ─► DB status READY
              │                │
              └──reject────────┴──► quarantine + audit log
```

Users can see a placeholder while processing. For Adobe Connect recordings, the meeting may end now but the MP4, transcript and thumbnails appear later. That is normal async design, not a bug.

### Lifecycle and tiering

Old or rarely accessed blobs should not stay in the most expensive tier forever. Lifecycle rules can:

- delete abandoned uploads after a day;
- move old originals to infrequent-access/cold storage;
- keep derived thumbnails hot;
- expire temporary exports;
- preserve legal/compliance archives separately.

Keep DB metadata in sync with lifecycle choices. If a file moves to cold storage, downloads may be slower; the UI should show "preparing download" rather than timing out.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Small private PDF upload | Presigned PUT + DB metadata | avoids app proxying bytes |
| 20 GB video upload | Multipart/resumable upload | retry parts, parallelize, track progress |
| User profile photo | raw in object storage, thumbnail via CDN | fast reads; DB stores URL/key/status |
| Meeting recording | async processing pipeline | scan, transcode, transcript, thumbnails |
| Abandoned upload sessions | lifecycle abort + DB cleanup job | prevents storage leak |
| Private download | API auth → short-lived signed URL | storage does not need app sessions |

### Common interview traps

- Putting blobs in the SQL database without explaining backup, replication and cache impact.
- Letting clients choose storage keys directly.
- Saying "S3 event triggers worker" without handling duplicate events and idempotency.
- Returning a public bucket URL for private user files.
- Forgetting virus scanning / content validation before marking a file ready.
- Ignoring incomplete multipart uploads and abandoned `UPLOADING` rows.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why is "metadata in DB, blob in object storage" the default design?</summary>

The DB is the source of truth for ownership, permissions, status and queryable fields; object storage is optimized for durable, cheap byte storage and high-throughput delivery. This keeps backups, replication and hot queries independent of file size.
</details>

<details><summary>2. What exactly does a presigned URL delegate?</summary>

One specific storage operation, usually PUT or GET, for a specific bucket/key, with an expiry and signed parameters. It does not grant general storage credentials or business authorization.
</details>

<details><summary>3. Why should the server choose the object key?</summary>

To prevent collisions, path tricks, overwrites of other users' files, and guessable names. User-visible filenames are metadata; storage keys should be generated and scoped by the service.
</details>

<details><summary>4. A client uploads successfully but crashes before calling <code>completeUpload</code>. How do you recover?</summary>

Use storage-created events and/or a reconciliation job. The worker checks the object, verifies checksum/size if possible, and moves the DB row from `UPLOADING` to the next state idempotently.
</details>

<details><summary>5. What is multipart upload solving?</summary>

Large uploads can be split into parts that upload in parallel and retry independently. The client stores upload id, part numbers and ETags/checksums, then completes the upload once all parts are present.
</details>

<details><summary>6. Where does a CDN fit, and when is it unsafe?</summary>

The CDN sits in front of object storage for low-latency delivery and reduced origin load. It is unsafe if private objects are exposed as public URLs; use signed CDN URLs/cookies or authenticated origin access.
</details>

<details><summary>7. What states would you store for a file upload?</summary>

At minimum: `UPLOADING`, `UPLOADED`, `SCANNING`, `PROCESSING`, `READY`, `REJECTED` or `FAILED`. The state machine prevents half-uploaded or unscanned files from becoming visible.
</details>

<details><summary>8. How does this topic connect to YouTube and Dropbox?</summary>

YouTube uses object storage for original and transcoded assets, plus CDN delivery. Dropbox/Drive store file blocks/objects in blob storage and keep metadata, sharing, versions and sync state in a metadata service/database.
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
| [AWS S3: presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) | Headings: "Download and upload objects with presigned URLs", "Who can create a presigned URL", "Expiration time for presigned URLs", "Limiting presigned URL capabilities", "Frequently asked questions for presigned URLs" | ~20 min |
| [AWS S3: multipart upload overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html) | Headings: "Multipart upload process", "Checksums with multipart upload operations", "Concurrent multipart upload operations", "Prevent uploading objects with identical key names during multipart upload", "Multipart upload and pricing" | ~25 min |
| [Azure Architecture Center: Valet Key pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/valet-key) | Headings: "Context and problem", "Solution", "Issues and considerations", "When to use this pattern", "Example" | ~15 min |
| **Alex Xu Vol 2, ch 9: S3 object storage** (optional) | Object storage interview deep dive; useful if you want to design S3 itself, not just use it | [PDF p.255](<../../../Books/System Design Interview Vol 2 - Alex Xu.pdf#page=255>) |

**Connects to:** [F2 Video pipeline](F2-Video-Pipeline.md) · [F4 File sync](F4-File-Sync.md) · [C4 HTTP / CDN caching](../C-Caching/C4-HTTP-CDN-Caching.md) · [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md) · Questions: Dropbox (#5), YouTube (#6), Instagram (#11)
