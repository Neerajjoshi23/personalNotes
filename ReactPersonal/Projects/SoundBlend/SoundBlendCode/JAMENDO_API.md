# Jamendo API v3.0 – params cheat-sheet

Base URL: `https://api.jamendo.com/v3.0/<endpoint>`
Source: https://developer.jamendo.com/v3.0/<endpoint>

## Common to every endpoint
| Param | Notes |
|---|---|
| `client_id` | **required** |
| `format` | `json` / `jsonpretty` / `xml` |
| `limit` | default 10, max 200 (autocomplete: per entity) |
| `offset` | start position (not on autocomplete) |
| `fullcount=true` | adds `headers.results_fullcount` (needed for pagination; slower) |
| `order` | allowed values differ per endpoint, see below. Suffix `_asc` / `_desc` (popularity_* is always desc) |

> Errors come back with HTTP 200: check `headers.status` (`success` / `failed`) and `headers.error_message`.

---

## `/tracks`
Text search:
- `namesearch` – track name contains the text
- `search` – free text over track, album, artist name + tags + similar artists (best for a general search box)
- `name`, `album_name`, `artist_name` – exact-ish name filters

Filters: `tags` (AND, `rock+pop`), `fuzzytags` (OR), `artist_id`, `album_id`, `id`, `type` (`single`/`albumtrack`),
`featured`, `lang`, `vocalinstrumental`, `acousticelectric`, `gender`, `speed`, `datebetween`, `durationbetween`, `groupby`, `boost`.

`order`: `relevance, buzzrate, downloads_week|month|total, listens_week|month|total, popularity_week|month|total, name, album_name, artist_name, releasedate, duration, id`
> Using any order other than `relevance` as the first order discards search relevance.

Other: `include` (`licenses, musicinfo, stats, lyrics`), `imagesize`, `audioformat` (`mp31, mp32, ogg, flac`).

Response fields used: `id, name, artist_name, album_name, album_image, image, duration, audio, audiodownload, releasedate`.
Singles have empty `album_*`.

## `/artists`
Text search: `namesearch` (contains), `name` (exact)
Filters: `id`, `hasimage`, `datebetween` (join date)
`order`: `name, id, joindate, popularity_total|month|week`
**No** `tags`, `fuzzytags`, `search`.

## `/albums`
Text search: `namesearch` (contains), `name` (exact)
Filters: `id`, `artist_id`, `artist_name`, `type` (`single`/`album`), `datebetween`, `imagesize`
`order`: `name, id, releasedate, artist_id, artist_name, popularity_total|month|week`
**No** `tags`, `fuzzytags`, `search`.

## `/autocomplete`
- `prefix` – **required**, min length 2, matched as `LIKE 'prefix%'`
- `entity` – any of `artists, albums, tracks, tags` (default: all four in one call)
- `limit` – matches per entity
- `matchcount=true` – include match counts
- No ids are returned, only names.

---

## Mapping for SoundBlend
| UI state | tracks | artists | albums |
|---|---|---|---|
| search text | `namesearch` (or `search`) | `namesearch` | `namesearch` |
| genre | `tags` | – | – |
| mood | `fuzzytags` | – | – |
| order | see track list | no `releasedate`, use `joindate` | `releasedate` ok |

Our `Order` constants (`popularity_total`, `releasedate_desc`, `name_asc`): `releasedate_desc` is **invalid for artists**.
