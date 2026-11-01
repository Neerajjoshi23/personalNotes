# F2 · Video Pipeline: from raw upload to adaptive streaming

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** YouTube / Netflix / TikTok (#6), Instagram / photo sharing (#11: reels/stories), Chat (#3: video attachments), Frontend video streaming questions

---

## Why this topic matters

Video is the hardest blob type. A photo can be resized and cached. A video must be uploaded reliably, transformed into many variants, packaged for streaming, delivered globally, and adapted to every user's network in real time. If you say "store videos in S3 and put CloudFront in front" in an interview, you have only described the storage layer.

| Problem | Video-specific answer |
|---|---|
| Huge uploads | direct multipart/resumable upload |
| Many devices | transcode into multiple resolutions/codecs |
| Slow networks | adaptive bitrate streaming |
| Start playback quickly | small segments + manifests |
| Global scale | CDN in front of packaged assets |
| Cost | cache popular content, tier originals, control renditions |

Adobe Connect recordings have the same shape: record a meeting, process it asynchronously, generate playable formats and thumbnails, then deliver through an edge path. The details differ, but the pipeline mental model is identical.

---

## Part 1: the high-level flow

A production video service is two systems: **upload/processing** and **playback**.

```text
Upload path:
Client ─► API ─► presigned multipart upload ─► original object storage
                                      │
                                      ▼
                           queue/workflow/DAG engine
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
             transcode            thumbnails           metadata
                 │
                 ▼
       packaged HLS/DASH segments + manifests ─► CDN

Playback path:
Player ─► API/video metadata ─► manifest URL ─► CDN segments
```

The raw original is rarely what users watch. It is a source asset. Workers create **renditions** such as 1080p, 720p, 480p and 360p, possibly in different codecs. Then packagers create streaming-friendly segments and manifest files.

A simple metadata model:

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('UPLOADING','PROCESSING','READY','FAILED')),
  original_key TEXT,
  duration_ms BIGINT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE video_renditions (
  video_id UUID REFERENCES videos(id),
  resolution TEXT,      -- 1080p, 720p, 480p
  codec TEXT,           -- h264, h265, av1, vp9
  bitrate_kbps INT,
  manifest_key TEXT,
  status TEXT,
  PRIMARY KEY (video_id, resolution, codec)
);
```

**Interview line:** "I separate the upload control plane from the playback data plane: uploads create jobs, workers produce streamable renditions, and playback reads manifests and segments from the CDN."

---

## Part 2: upload, chunking and the transcoding DAG

### Upload

Reuse the F1 pattern: client asks the API for upload permission, receives presigned multipart URLs, uploads directly to object storage, then the system marks the video as uploaded and schedules processing. Large video uploads should be resumable because retries from byte zero are unacceptable.

After upload completes, enqueue a job such as:

```json
{
  "videoId": "v_123",
  "originalKey": "uploads/u1/v_123/original.mp4",
  "requestedProfiles": ["1080p_h264", "720p_h264", "480p_h264"],
  "idempotencyKey": "v_123:process:1"
}
```

The worker must be idempotent: if the queue redelivers the job, it should not create duplicate DB rows or publish "video ready" twice.

### DAG, not one giant worker

Transcoding naturally forms a directed acyclic graph. Some tasks can run in parallel; some depend on previous tasks.

```text
             validate container
                    │
                    ▼
              split into chunks/GOPs
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  encode 1080p  encode 720p   encode 480p
      │             │             │
      └──────┬──────┴──────┬──────┘
             ▼             ▼
       package HLS      generate thumbnails
             │             │
             └──────┬──────┘
                    ▼
              mark video READY
```

Chunking by GOP (group of pictures) or time window lets multiple workers process different pieces. A workflow engine or job scheduler tracks which tasks finished and which can start next.

### Resolutions, codecs and bitrates

A rendition is not just "720p". It combines:

- **resolution:** frame size, e.g. 1920×1080;
- **bitrate:** how many bits per second; higher = better quality + higher cost;
- **codec:** H.264 is broadly compatible; H.265/AV1 can save bandwidth but need device support;
- **container/packaging:** how bytes are arranged for streaming.

Interview answer rule: do not promise every codec/resolution for every video. Generate a **ladder** based on the source. A 480p upload should not create a fake 1080p rendition.

---

## Part 3: packaging: HLS/DASH segments and manifests

Users should not download a full MP4 before playback. Streaming protocols split video into small segments and provide a manifest that tells the player what variants exist.

### HLS mental model

Apple's HTTP Live Streaming (HLS) commonly uses:

- a **master playlist** (`.m3u8`) listing available variants;
- a **media playlist** for each variant;
- small media **segments** (for example a few seconds each);
- standard HTTP delivery, which works well with CDNs.

```text
master.m3u8
  ├── 1080p/playlist.m3u8 ─► seg_0001.ts, seg_0002.ts, ...
  ├──  720p/playlist.m3u8 ─► seg_0001.ts, seg_0002.ts, ...
  └──  480p/playlist.m3u8 ─► seg_0001.ts, seg_0002.ts, ...
```

DASH is a similar idea with different manifest/segment conventions. In an interview, the key is not memorizing file extensions; it is knowing why packaging exists: **small HTTP chunks, seekability, CDN cacheability, and adaptive switching**.

### Where CDN fits

The CDN caches manifests and segments close to users. A segment is immutable once published, which is perfect for caching. Manifests for VOD can be cached longer; live manifests change frequently and need shorter TTLs.

```text
Player ──GET master.m3u8──► CDN
Player ──GET 720p/seg_42──► CDN edge ──miss──► object storage origin
```

Store original assets and packaged outputs separately. You may delete or cold-tier originals later, but you usually keep streamable outputs hot while the video is popular.

---

## Part 4: adaptive bitrate on the player

Adaptive bitrate (ABR) is mostly a player behavior enabled by server-side packaging. The player starts with a safe bitrate, measures throughput/buffer health, and switches variants segment by segment.

```text
Network good: 480p seg1 → 720p seg2 → 1080p seg3
Network drops: 1080p seg20 → 720p seg21 → 480p seg22
```

A good player balances:

- startup time (start quickly, maybe at lower quality);
- rebuffering risk (avoid stalls);
- visual quality;
- device constraints (screen size, CPU, codec support);
- user preferences (data saver, chosen quality).

### Frontend angle

For frontend system design, mention:

- show poster/thumbnail while manifest loads;
- prefetch only a small buffer, not the whole video;
- handle offline/poor network gracefully;
- collect QoE metrics: startup delay, rebuffer count, average bitrate, dropped frames;
- accessibility: captions/subtitles are also timed assets.

This connects to React: your component orchestrates player state, but the browser/native player does decoding. Do not implement a codec in JavaScript.

---

## Part 5: live vs VOD

Video-on-demand (VOD) has the full file before processing. Live streaming produces media while recording is still happening.

| Topic | VOD | Live |
|---|---|---|
| Input | complete uploaded file | continuous encoder output |
| Latency target | seconds of startup is okay | seconds or sub-seconds matter |
| Manifest | mostly stable | constantly updated sliding window |
| Processing | can retry many tasks before publish | must keep up with real time |
| CDN TTL | longer for segments/manifests | shorter manifest TTL; old segments expire |
| Failure mode | processing delay | stream stalls or falls behind live edge |

For live, you still segment and publish manifests, but the manifest window advances as new segments arrive. If a worker is slow, viewers fall behind or buffer. For VOD, a slow worker just delays readiness.

Adobe Connect live meetings use WebRTC for interactive low-latency media, which is different from HLS-style broadcast delivery. But recordings after the meeting look much closer to the VOD pipeline above.

---

## Part 6: cost control and thumbnails

Video cost is usually bandwidth + storage + compute.

### Cost levers

| Cost | Control |
|---|---|
| CDN egress | cache popular videos; use regional CDNs; avoid unnecessary prefetch |
| Storage | lifecycle originals; delete failed temp assets; don't generate useless renditions |
| Transcoding compute | only transcode after upload completes; right-size ladder; use spot/batch workers carefully |
| Hot keys | shard popular manifests/metadata; CDN absorbs segment reads |
| Reprocessing | store pipeline version; reprocess only affected assets |

A common design is to keep popular videos fully on CDN, while less popular long-tail content may be served from origin or cached on demand. Do not say "everything stays hot forever" unless someone else is paying the bill.

### Thumbnails and preview assets

Thumbnails are part of the pipeline:

- extract frames at safe timestamps;
- generate multiple sizes;
- pick a representative frame or let creators choose;
- store as image objects behind CDN;
- write thumbnail keys to metadata DB.

For YouTube-like UX, thumbnails load before playback and drive click-through. For a file-sync product, a thumbnail helps browse photos/videos without downloading originals.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Uploading a large video | presigned multipart upload | app servers stay out of data path |
| Making video playable everywhere | transcoding ladder | different devices/networks need different variants |
| Serving playback | HLS/DASH segments via CDN | HTTP cacheable and adaptive |
| Reducing startup delay | player starts low/mid bitrate | quick first frame beats waiting for 1080p |
| Live stream | rolling manifests + short segments | manifest updates as media arrives |
| Saving cost | selective renditions + lifecycle + CDN policy | video can bankrupt naive designs |

### Common interview traps

- Treating transcoding as a synchronous request after upload.
- Saying "CDN stores videos" but not explaining manifests and segments.
- Generating 4K output from a 480p source.
- Forgetting retries/idempotency in the processing DAG.
- Ignoring playback metrics; you need QoE to debug buffering.
- Using one pipeline for live and VOD without calling out latency differences.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why isn't the uploaded MP4 usually the file users stream?</summary>

It may be too large, use an unsupported codec/bitrate, and cannot adapt to different networks. The system transcodes it into a ladder of renditions and packages them into streamable segments with manifests.
</details>

<details><summary>2. What is the role of a manifest?</summary>

It tells the player which variants and segments exist. The player reads the manifest, chooses a bitrate/resolution, and requests small segments over HTTP/CDN.
</details>

<details><summary>3. Where does adaptive bitrate logic live?</summary>

Mostly in the player. The backend enables it by producing multiple renditions and manifests; the player measures bandwidth/buffer/device constraints and switches variants segment by segment.
</details>

<details><summary>4. Why model transcoding as a DAG?</summary>

Tasks have dependencies and parallelism: validate, split, encode several resolutions in parallel, package outputs, generate thumbnails, then mark ready. A DAG makes retries, status and parallel workers manageable.
</details>

<details><summary>5. How is live different from VOD?</summary>

VOD processes a complete file and can delay publish until ready. Live continuously produces segments, updates a sliding manifest, and must keep up with real time; failures cause viewers to buffer or fall behind live edge.
</details>

<details><summary>6. Name three cost-control levers.</summary>

Generate only useful renditions, cache popular segments through CDN, lifecycle/cold-tier originals and temporary files, avoid wasteful prefetch, and use batch/spot workers carefully for non-urgent processing.
</details>

<details><summary>7. What should happen when a transcoding job is redelivered?</summary>

The worker should be idempotent: check existing outputs/status by `videoId` and pipeline version, write deterministic keys, and avoid duplicate READY events or duplicate DB rows.
</details>

<details><summary>8. What metrics would you collect from the player?</summary>

Startup time, rebuffer count/duration, average bitrate, rendition switches, dropped frames, manifest/segment errors, CDN region, and device/browser codec support.
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
| [Apple: HTTP Live Streaming](https://developer.apple.com/streaming/) | Headings: "HTTP Live Streaming", "Documentation", "Videos", "Streaming Tools", "Streaming Examples", "Related Resources" | ~20 min |
| [Hello Interview: YouTube](https://www.hellointerview.com/learn/system-design/problem-breakdowns/youtube) | Headings: "Background: Video Streaming", "Users can upload videos", "Good Solution: Store different video formats", "Great Solution: Store different video formats as segments", "Users can watch videos", "Great Solution: Adaptive bitrate streaming", deep dives on processing, resumable uploads and scale | ~60 min |
| **Alex Xu Vol 1, ch 14: Design YouTube** | Video uploading flow, streaming flow, video transcoding, DAG model, transcoding architecture, speed/cost optimizations | [PDF p.220](<../../../Books/System Design Interview Vol 1 - Alex Xu.pdf#page=220>) |

**Connects to:** [F1 Object storage + presigned URLs](F1-Object-Storage-Presigned-URLs.md) · [C4 HTTP / CDN caching](../C-Caching/C4-HTTP-CDN-Caching.md) · [D1 Queues](../D-Async/D1-Queues.md) · [D5 Async request-reply](../D-Async/D5-Async-Request-Reply.md) · Questions: YouTube / Netflix (#6), Instagram (#11)
