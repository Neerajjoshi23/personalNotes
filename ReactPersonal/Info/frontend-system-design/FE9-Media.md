# FE9 · Media on the Web: streaming, buffering and real-time trade-offs

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Video streaming / Netflix / YouTube (#6), Spotify (FE Tier 3), Adobe Connect recordings and live meetings, Photo sharing / Instagram (#11)

---

## Why this topic matters

Media system design is where frontend engineers are expected to think beyond components. The browser player is the visible part of a pipeline: encoding ladders, manifests, CDNs, buffering, DRM, captions, thumbnails, analytics and failure recovery.

For Adobe Connect, you need two mental models:

| Product surface | Main protocol family | Goal |
|---|---|---|
| Live meeting audio/video | WebRTC | Sub-second real-time interaction, adaptive to jitter, two-way. |
| Recording playback / webinar stream | HLS/DASH over HTTP | Scale to many viewers through CDN, tolerate seconds of latency. |

That contrast is interview gold. A senior frontend answer says when to use a normal `<video>`, when to use adaptive streaming via MSE/player libraries, and when WebRTC is the right tool.

**Interview line:** "For playback at scale I use HTTP adaptive streaming with HLS/DASH and a CDN. For two-way meeting media I use WebRTC because latency and interactivity matter more than CDN cacheability."

---

## Part 1: progressive download vs adaptive streaming

### Progressive download

The simplest web video is:

```html
<video controls src="/media/recording-720p.mp4"></video>
```

The browser downloads bytes from one media file. Range requests let it seek without downloading from the start.

Good for:
- short clips
- simple product demos
- small audience
- known network/device conditions

Problems:
- One bitrate/resolution does not fit all users.
- Switching quality mid-playback is hard.
- Long videos can waste bandwidth if user abandons early.
- Live streaming is not a natural fit.

### Adaptive bitrate streaming (HLS/DASH)

Adaptive streaming splits media into small segments at multiple qualities. A manifest describes the available variants.

```
master manifest
  ├─ 1080p @ 5 Mbps ─► seg1.ts seg2.ts seg3.ts ...
  ├─ 720p  @ 3 Mbps ─► seg1.ts seg2.ts seg3.ts ...
  └─ 360p  @ 800 kbps ─► seg1.ts seg2.ts seg3.ts ...

Player measures bandwidth/buffer/device → chooses next segment quality.
```

HLS and DASH are the common families:
- **HLS**: Apple-originated, widely supported, especially native on Safari/iOS.
- **DASH**: common open MPEG standard, usually played through JavaScript + MSE in browsers.

The frontend player is responsible for choosing segments, appending them and recovering from network/decoder errors. The backend/media pipeline creates the encoded variants and manifests. Cross-link: [F2 Video Pipeline](../../../SystemDesign/Notes/HLD/F-Blobs-Fanout/F2-Video-Pipeline.md).

### Why segmenting works so well with CDNs

Segments are normal HTTP objects. CDNs cache them efficiently, clients retry individual segments, and the origin is protected from every viewer requesting the full file.

For a recording replay, a viewer watching minute 40 only needs the manifest and segments around minute 40. For a viral webinar recording, the CDN serves the hot segments repeatedly.

---

## Part 2: MSE and the browser player architecture

Media Source Extensions (MSE) lets JavaScript feed media bytes into an `HTMLMediaElement`.

```
HLS/DASH manifest
      │
      ▼
Player JS ── fetch segment ──► SourceBuffer ──► MediaSource ──► <video>
      ▲             │
      │             └── metrics: download time, errors, buffer health
      └── ABR decision for next segment
```

A simplified MSE shape:

```ts
const video = document.querySelector('video')!;
const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener('sourceopen', async () => {
  const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64001f, mp4a.40.2"');
  const segment = await fetch('/segments/720p/0001.m4s').then(r => r.arrayBuffer());
  sourceBuffer.appendBuffer(segment);
});
```

Production players hide this complexity: hls.js, dash.js, Shaka Player, Video.js integrations, native HLS on Safari. In interviews, name the abstraction but explain the responsibilities.

### Player responsibilities

| Responsibility | What it means |
|---|---|
| Manifest parsing | Read variants, codecs, segment timelines, captions, DRM info. |
| ABR selection | Pick quality based on bandwidth, buffer, device and viewport. |
| Buffer management | Keep enough seconds ahead; evict old ranges; avoid quota errors. |
| Error recovery | Retry segments, switch CDN/quality, recover decoder stalls. |
| DRM | Request licenses and attach keys via EME when content is protected. |
| Text tracks | Load captions/subtitles, style and sync them. |
| Analytics | Startup time, rebuffer ratio, dropped frames, bitrate switches, errors. |

---

## Part 3: ABR, buffering and preloading

### ABR logic

Adaptive bitrate is a control loop.

Inputs:
- recent segment download throughput
- current buffer length
- dropped frames/decoder health
- viewport size and device capability
- user-selected quality cap
- CDN/server errors

Outputs:
- next segment quality
- whether to abandon a slow segment
- whether to increase/decrease quality slowly or aggressively

Simple heuristic:

```ts
type Variant = { id: string; bitrate: number; width: number; height: number };

function chooseVariant(variants: Variant[], bandwidthBps: number, bufferSeconds: number, viewportWidth: number) {
  const safety = bufferSeconds < 10 ? 0.55 : 0.75;
  const budget = bandwidthBps * safety;
  return variants
    .filter(v => v.bitrate <= budget && v.width <= viewportWidth * 1.5)
    .sort((a, b) => b.bitrate - a.bitrate)[0] ?? variants[0];
}
```

Real algorithms are more nuanced, but this shows the trade-off: avoid rebuffering first, improve quality second.

**Interview line:** "The player should prefer a lower bitrate over rebuffering. Users forgive temporary softness more than a frozen frame."

### Buffer states

| State | User impact | Player response |
|---|---|---|
| Startup | Black/loader before first frame | Fetch manifest, choose conservative first variant, append enough data. |
| Healthy buffer | Smooth playback | Maybe step quality up. |
| Low buffer | Risk of stall | Switch down, reduce parallel work, prioritize next media segment. |
| Rebuffering | Playback paused waiting | Aggressively switch down/retry, record QoE event. |
| Seek | Buffer old range irrelevant | Cancel old requests, fetch target segment, show thumbnail/preview. |

Key metrics for a media frontend:
- time to first frame
- startup failure rate
- rebuffer count and total rebuffer duration
- average bitrate / resolution
- bitrate switch count
- dropped frames
- CDN/manifest/segment error rate

### Preloading

The `<video preload>` attribute is a hint:
- `none`: do not preload. Good for many videos in a feed.
- `metadata`: fetch metadata/duration. Good for lists and previews.
- `auto`: browser may download media. Use carefully.

In a feed or carousel, lazy-load players near viewport and preload poster/metadata, not every video. For a dedicated recording page, preloading the manifest and first segments improves start time.

---

## Part 4: live latency and WebRTC contrast

### HTTP live streaming latency

Classic HLS/DASH uses segments of several seconds. A live player often buffers multiple segments to handle jitter, so latency can be 10–30 seconds or more depending on configuration.

Low-latency HLS/DASH reduce segment/part duration and tune server/player behavior, but they still operate over HTTP and CDN caches. They are excellent for large audience broadcasts where a few seconds is acceptable.

Use for:
- webinars with many viewers
- live sports/news style broadcast
- Adobe Connect recording playback or one-way broadcast mode

### WebRTC latency

WebRTC is designed for interactive media: capture, encode, send over RTP/UDP where possible, adapt to jitter/packet loss, and render quickly.

Use for:
- two-way meetings
- screen sharing
- live whiteboard/meeting collaboration
- active speaker video in Adobe Connect

Trade-offs:
- Harder to cache through CDNs.
- Requires SFUs/turn servers and real-time congestion control.
- More sensitive to CPU/device constraints.
- Scaling many viewers is an SFU/broadcast architecture question, not a static CDN question.

```
Recording playback:  browser ─HTTP segments─► CDN ─► origin/object storage
Live meeting:        browser ─WebRTC RTP────► SFU ─► other participants
```

If asked "design YouTube live", clarify the mode. A chatty classroom needs WebRTC or very low-latency streaming. A celebrity livestream to millions usually uses HTTP live streaming with chat as a separate real-time channel.

---

## Part 5: DRM, captions, thumbnails and media UX

### DRM / EME brief ⏭ *Skip for interviews*

Encrypted Media Extensions (EME) provides browser APIs for playing encrypted content via a Content Decryption Module. The app/player requests a license from a license server and attaches keys to playback.

Know the boundaries:
- DRM protects premium content distribution; it does not prevent screen capture completely.
- EME is player/client side; packaging/encryption/license policy are backend/media-platform concerns.
- DRM affects offline downloads, device compatibility and error handling.

For interviews, keep it brief unless the question is Netflix/premium video.

### Captions and subtitles

Captions are not optional accessibility polish. Use WebVTT text tracks for web playback.

```html
<video controls poster="/thumbs/recording-123.jpg">
  <source src="/hls/recording-123.m3u8" type="application/vnd.apple.mpegurl" />
  <track kind="captions" src="/captions/en.vtt" srclang="en" label="English" default />
  <track kind="subtitles" src="/captions/hi.vtt" srclang="hi" label="हिन्दी" />
</video>
```

Captions vs subtitles:
- Captions include speech and relevant non-speech audio for accessibility.
- Subtitles usually translate speech.

For Adobe Connect recordings, captions may be generated from transcript pipelines. The frontend must support track selection, search/time-jump, styling and sync drift handling.

### Thumbnails and sprites

Hover previews usually use either:
- individual thumbnail images per time interval, or
- a sprite sheet plus WebVTT mapping time ranges to sprite coordinates.

```
00:00-00:05 -> sprite.jpg#xywh=0,0,160,90
00:05-00:10 -> sprite.jpg#xywh=160,0,160,90
```

This improves seeking UX without fetching video segments for every hover.

### Poster, layout and accessibility

- Always reserve aspect ratio to avoid layout shift.
- Provide keyboard controls or use native controls if custom controls are not fully accessible.
- Expose captions, volume, playback speed and fullscreen through keyboard and labels.
- Respect reduced motion for animated previews/autoplay.
- Do not autoplay sound without user intent; browsers often block it anyway.

Custom media controls are a large accessibility commitment. If you build them, you own the keyboard and screen-reader contract.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Short marketing clip | Progressive MP4 with range support | Simple, low operational complexity. |
| Netflix/YouTube playback | HLS/DASH adaptive streaming + CDN + MSE player | Scales and adapts quality per user/network. |
| iOS Safari HLS | Native HLS where available | Better platform support and battery behavior. |
| Browser DASH/HLS custom player | MSE via player library | JS controls manifest, ABR, buffering. |
| Two-way meeting | WebRTC + SFU | Sub-second latency and interactivity. |
| Massive one-way live event | Low-latency HLS/DASH + CDN | Scale beats sub-second latency. |
| Premium protected content | HLS/DASH + DRM/EME + license server | Content policy and device compatibility. |
| Recording search/jump | Captions/transcript + thumbnail sprites | Better navigation and accessibility. |

### Common interview traps

- Saying "use WebRTC for Netflix". CDN-backed HTTP streaming is the scalable playback choice.
- Saying "use HLS for Zoom" without addressing seconds of latency.
- Ignoring captions and accessibility in a media UI.
- Building custom controls without keyboard/screen-reader behavior.
- Starting at 1080p before bandwidth is known, causing slow startup/rebuffer.
- Treating DRM as impossible-to-break security instead of distribution control.
- Forgetting media analytics; without QoE metrics you cannot tune ABR or CDN choices.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Progressive download vs adaptive streaming: what is the core difference?</summary>

Progressive download fetches one media file, usually with range requests. Adaptive streaming uses manifests plus many small segments at multiple bitrates; the player chooses segment quality over time based on bandwidth, buffer and device.
</details>

<details><summary>2. What does MSE let a JavaScript player do?</summary>

MSE lets JavaScript append fetched media segments into `SourceBuffer`s connected to a `MediaSource`, which feeds an HTML media element. This enables custom HLS/DASH playback, ABR, buffering and recovery logic.
</details>

<details><summary>3. What should an ABR algorithm optimize first: quality or avoiding stalls?</summary>

Avoiding stalls. Users generally prefer temporary lower quality over rebuffering. A good player starts conservatively, watches throughput/buffer health and steps quality up when safe.
</details>

<details><summary>4. Why are HLS/DASH easier to scale than WebRTC for playback?</summary>

They use normal HTTP segments that CDNs can cache and serve to many viewers. WebRTC is real-time peer/SFU traffic and is not naturally CDN-cacheable.
</details>

<details><summary>5. When is WebRTC the right answer?</summary>

For two-way or highly interactive real-time media: meetings, calls, screen sharing, active collaboration. Latency and bidirectional adaptation matter more than CDN cacheability.
</details>

<details><summary>6. What are captions, and why are they part of system design?</summary>

Captions are synchronized text tracks including speech and important non-speech audio. They affect accessibility, search, transcript navigation, storage/processing pipelines and player UI, so they are not an afterthought.
</details>

<details><summary>7. What does DRM/EME do and not do?</summary>

EME lets the browser play encrypted media through a CDM after license acquisition. It helps enforce distribution policy for premium content, but it does not make screen capture impossible and adds compatibility/operational complexity.
</details>

<details><summary>8. What media metrics would you instrument in the frontend?</summary>

Startup time/time to first frame, startup failure, rebuffer count/duration, bitrate/resolution over time, dropped frames, quality switches, segment/manifest/license errors and CDN used.
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
| [MDN: Media Source Extensions API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API) | "Concepts and usage", "The MSE standard", "DASH", "Availability in workers", "Interfaces" | ~25 min |
| [Apple: HTTP Live Streaming](https://developer.apple.com/streaming/) | HLS overview page and linked Apple HLS documentation/specification/tools; focus on manifests, segments, variants and low-latency updates | ~25 min |
| [Apple documentation: HTTP Live Streaming](https://developer.apple.com/documentation/http-live-streaming) | Open for Apple's official documentation hub; the page requires JavaScript but returned HTTP 200 | ~10 min |
| [MDN: Encrypted Media Extensions API](https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API) | "Interfaces", "Extensions to other interfaces", browser compatibility overview | ~10 min |
| [MDN: WebVTT API](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API) | "Concepts and usage", "Using the WebVTT API to add captions", "Styling WebVTT" | ~15 min |

**Connects to:** [F2 Video Pipeline](../../../SystemDesign/Notes/HLD/F-Blobs-Fanout/F2-Video-Pipeline.md) · FE5 Performance (Core Web Vitals, lazy loading) · FE7 Accessibility + i18n (captions, controls) · Questions: YouTube / Netflix (#6), Adobe Connect recordings/live meetings

