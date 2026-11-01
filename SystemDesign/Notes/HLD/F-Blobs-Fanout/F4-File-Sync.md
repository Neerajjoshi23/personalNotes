# F4 · File Sync: Dropbox-style metadata, blocks and conflict handling

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Dropbox / Google Drive (#5), Google Docs / collaborative editor (#12: versioning contrast), Instagram / photo sharing (#11: upload/download pieces)

---

## Why this topic matters

A file-sync system is not just "upload files to S3". The hard part is making many devices converge on the same folder state while users edit offline, networks fail, files are huge, and only small changes should upload.

| Need | Design idea |
|---|---|
| Large files | chunk/block files |
| Avoid duplicate storage | content hash and dedup |
| Upload only changes | delta sync |
| Fast folder listing and sharing | metadata service/database |
| Notify other devices | long polling / WebSocket notifications |
| Offline edits | local journal + conflict resolution |
| Undo/restore | version history |

DrawBoard solves collaborative editing with CRDTs. Dropbox/Drive file sync usually does not merge arbitrary binary edits. It syncs versions and creates conflicted copies when two devices edit concurrently.

---

## Part 1: architecture: metadata service vs block service

Split the system into a **metadata plane** and a **block/blob plane**.

```text
Desktop/mobile client
   │ metadata: list, rename, share, versions
   ▼
Metadata API ──► Metadata DB
   │
   │ block upload/download instructions
   ▼
Block service ──► Object storage
   ▲
   │ notifications
Notification service ──► other devices
```

### Metadata service

Owns folder tree, file records, permissions, versions and sync cursors. It answers:

- What files are in `/Work/Designs`?
- Which version is current?
- Who can access this file?
- Which blocks make up version 17?
- What changed since device cursor `abc`?

### Block service

Owns file bytes. It chunks, hashes, compresses/encrypts and uploads blocks to object storage. It answers:

- Do we already have a block with hash `h`?
- Where should the client upload missing blocks?
- Which block keys should the client download for this version?

This separation keeps small metadata operations fast and lets the byte path scale independently.

**Interview line:** "The metadata DB is the source of truth for the namespace and versions; the block service stores content-addressed chunks in object storage. Sync is mostly exchanging metadata and only transferring missing blocks."

---

## Part 2: chunking, content hashing and dedup

A large file is split into blocks. Each block gets a cryptographic hash, often SHA-256 in a high-level design answer.

```text
file.pdf
  ├── block 0 bytes 0..3MB      hash h0
  ├── block 1 bytes 4..7MB      hash h1
  ├── block 2 bytes 8..11MB     hash h2
  └── block 3 bytes 12..end     hash h3

file version = [h0, h1, h2, h3]
```

If another file/version already has `h1`, you do not upload/store it again. This is **deduplication**. If a user edits only block 2, delta sync uploads the new block `h2b` and creates a new version manifest `[h0, h1, h2b, h3]`.

### Fixed-size vs content-defined chunks

| Chunking | How | Good | Bad |
|---|---|---|---|
| Fixed-size | every N MB | simple, fast | insert at beginning shifts all blocks |
| Content-defined | boundaries based on rolling hash | better dedup after insertions | more CPU/complexity |

For interviews, fixed chunks are often enough unless asked about maximum dedup efficiency. Say content-defined chunking can improve delta sync for inserted bytes, but keep the first design understandable.

### Manifest model

```sql
CREATE TABLE file_versions (
  file_id UUID,
  version_no BIGINT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  base_version BIGINT,
  status TEXT,
  PRIMARY KEY (file_id, version_no)
);

CREATE TABLE file_version_blocks (
  file_id UUID,
  version_no BIGINT,
  block_index INT,
  block_hash TEXT,
  size_bytes INT,
  PRIMARY KEY (file_id, version_no, block_index)
);
```

The object key can be derived from the hash, e.g. `blocks/sha256/ab/cd/{hash}`. The metadata DB maps file versions to block hashes.

---

## Part 3: upload and download flows

### Upload flow

```text
1. Client detects local file change.
2. Client chunks file and computes block hashes.
3. Client asks metadata/block service which hashes already exist.
4. Client uploads missing blocks to object storage/block service.
5. Client commits new file version with ordered block hashes.
6. Metadata service updates current version and emits change notification.
```

This commit step is important. Blocks can arrive before the namespace changes. Users should not see a half-uploaded file version.

### Download flow

```text
1. Device receives notification: file X changed.
2. Device asks metadata service for latest version manifest.
3. It compares block hashes with local cache.
4. It downloads only missing blocks.
5. It reconstructs the file locally and updates its sync cursor.
```

A local block cache speeds up rename/copy and multiple files sharing content. If a user copies a large video inside the synced folder, the system may only need a metadata operation.

### Delta sync vs binary diff

Delta sync in this note means "upload/download changed blocks." Some systems can compute binary patches inside a block, but that is more complex and often not needed for an interview. The important idea is to avoid retransferring the entire file when most blocks are unchanged.

---

## Part 4: change notifications and sync cursors

A device needs to learn that something changed elsewhere. Options:

| Mechanism | Fit |
|---|---|
| Polling | simplest; okay for small systems |
| Long polling | server holds request until changes or timeout |
| WebSocket | bidirectional, low-latency; more connection management |
| Push notification | mobile wake-up signal, not full sync payload |

For Dropbox/Drive, notifications should usually say "something changed; fetch changes since cursor," not include the whole file. The metadata service provides a changelog.

```text
Device cursor = 105
GET /changes?cursor=105
→ [{seq:106, type:'file_updated', fileId:'f1'}, {seq:107, type:'deleted', fileId:'f2'}]
nextCursor = 107
```

Cursors make sync resumable. If a device is offline for a week, it asks for changes since its last cursor. If the changelog window expired, the server can force a full metadata rescan.

### Offline-first client behavior

The client keeps:

- local file snapshot;
- local operation journal;
- last server cursor;
- block cache;
- upload/download retry queue.

When offline, it records local edits and marks files "syncing". On reconnect, it uploads changes, checks remote versions and resolves conflicts.

---

## Part 5: conflict handling, versioning and deletes

Two devices can edit the same file from the same base version while offline.

```text
Base version 10
  ├── Laptop edits → version 11
  └── Phone edits offline → tries to commit based on version 10
```

For arbitrary files, automatic merge is unsafe. The normal behavior is:

- accept one version as the current file;
- save the other as `filename (Neeraj's conflicted copy).ext`;
- keep both in version history;
- let the user manually merge/delete.

Text documents can have richer merge strategies; DrawBoard/Yjs uses CRDTs for collaborative state. But for binary files like PSD, ZIP or MP4, conflicted copies are honest and safe.

### Versioning

Keep old manifests, not necessarily duplicate blocks. If version 12 and 13 share 95% of blocks, storage only adds new blocks. Version history enables restore and audit.

Deletes are usually tombstones:

- mark file deleted in metadata;
- notify devices;
- retain versions for retention window;
- garbage-collect unreferenced blocks after no version references them.

Garbage collection must be careful: a block hash may be shared by many files/users if dedup is global. Many systems limit dedup scope for privacy/security reasons; cross-user dedup can leak information if not designed carefully.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Large file changed slightly | block-level delta sync | upload only changed blocks |
| Same photo uploaded twice | content hash dedup | avoid duplicate bytes |
| Device offline for days | changelog cursor + local journal | resumable sync |
| Two offline edits | conflicted copy | safe for arbitrary file types |
| Need restore | version manifests | old versions share blocks |
| Mobile battery concerns | push/long-poll + batched sync | avoid constant polling |

### Common interview traps

- Treating file sync as only upload/download, without namespace/version state.
- Forgetting that block upload and metadata commit must be separate.
- Claiming automatic merge for arbitrary binary files.
- Not designing a way for offline devices to catch up.
- Using file path as the stable identity; paths change on rename/move. Use file IDs.
- Forgetting garbage collection of unreferenced blocks and expired versions.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why split metadata service and block service?</summary>

Metadata operations are small, queryable and permission-heavy; blocks are large byte payloads. Splitting them lets namespace/version queries stay fast while upload/download bandwidth scales through object storage/block workers.
</details>

<details><summary>2. What is a file version manifest?</summary>

An ordered list of block hashes plus metadata for a particular file version. It lets the client reconstruct the file and lets versions share unchanged blocks.
</details>

<details><summary>3. How does delta sync reduce bandwidth?</summary>

The client hashes chunks, compares them with server-known hashes, and uploads/downloads only missing or changed blocks instead of the entire file.
</details>

<details><summary>4. Why not use the file path as the file identity?</summary>

Paths change on rename/move and can collide. Use a stable file ID in metadata; path is a mutable property in the folder tree.
</details>

<details><summary>5. How do change notifications work?</summary>

The notification tells a device that changes exist. The device then calls `changes?cursor=...` to fetch ordered metadata changes and updates its cursor. The notification should not carry the whole file.
</details>

<details><summary>6. What happens when two offline devices edit the same binary file?</summary>

The server detects the base version mismatch. It keeps both versions, chooses one current or creates a new version, and exposes the other as a conflicted copy for the user to resolve.
</details>

<details><summary>7. How can versioning be storage-efficient?</summary>

Versions store manifests of block hashes. Unchanged blocks are shared across versions, so a small edit only adds new blocks. Garbage collection later removes blocks no version references.
</details>

<details><summary>8. What is the privacy caution around dedup?</summary>

Global cross-user dedup can leak whether another user has a particular file/hash. Many systems dedup within an account/tenant or add encryption designs carefully.
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
| [Hello Interview: Dropbox](https://www.hellointerview.com/learn/system-design/problem-breakdowns/dropbox) | Headings: "Users should be able to upload a file", "Great Solution: Upload File Directly to Blob Storage", "Users should be able to download", "Great Solution: Download from CDN", "Users can automatically sync files across devices", deep dives on large files, upload/download flows and notification service | ~60 min |
| **Alex Xu Vol 1, ch 15: Design Google Drive** | Sync conflicts, high-level design, block servers, metadata database, upload flow, download flow, notification service, save storage space and failure handling | [PDF p.244](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=244>) |

**Connects to:** [F1 Object storage + presigned URLs](F1-Object-Storage-Presigned-URLs.md) · [E1 Polling / SSE / WebSocket](../E-Realtime/E1-Polling-SSE-WebSocket.md) · [E3 Collaborative sync](../E-Realtime/E3-Collaborative-Sync.md) · [B3 Transactions + isolation](../B-Data/B3-Transactions-Isolation.md) · Questions: Dropbox / Google Drive (#5), Google Docs (#12)
