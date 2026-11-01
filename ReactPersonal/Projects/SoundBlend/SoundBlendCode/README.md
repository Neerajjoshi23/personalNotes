# SoundBlend

Search the [Jamendo](https://www.jamendo.com) music catalogue, then **blend** up to 7 tracks: play them together with a
volume control per track and a master volume.

## Features

- **Search** tracks, artists and albums with genre, mood and sort filters. Filters live in the URL, so links and Back/refresh restore the state.
- **Autocomplete** suggestions (500 ms debounce, aborted when stale).
- **Infinite scroll** (virtualised list) or **pagination**.
- **Artist and album pages** that list their tracks.
- **Blend page**: add up to 7 tracks, toggle each in or out of the mix, set individual and master volume, play and pause together.
  The blend is saved in `localStorage`.

## Tech stack

React 19, TypeScript, Vite, TanStack Query v5, Zod v4, Zustand (with `persist`), React Router v7, Tailwind CSS v4, lucide-react.

## Getting started

1. Get a client ID from the [Jamendo developer portal](https://devportal.jamendo.com).
2. Create a `.env` file:

   ```
   VITE_JAMENDO_CLIENT_ID=your_client_id
   ```

3. Run:

   ```
   npm install
   npm run dev
   ```

Other scripts: `npm run build`, `npm run lint`, `npm run preview`.

## Project structure

```
src/
  Layout/       app shell (sidebar / top bar)
  HomePage/     home and 404 pages
  SearchPage/   search, detail page, list components, API, schemas, hooks
  BlendPage/    blend page and track rows
  Store/        Zustand blend store
```

## Notes

- Blending plays several `<audio>` elements at once, with volume = track x master. Jamendo's audio hosts send no CORS
  headers, so Web Audio effects (which need CORS) are not possible. `volume` is ignored on iOS Safari.
- Jamendo returns HTTP 200 with `headers.status: "failed"` on errors; the API layer handles this.
- More detail: [`REVIEW.md`](REVIEW.md) (design notes) and [`JAMENDO_API.md`](JAMENDO_API.md) (API reference).
- Music is provided by Jamendo under each track's own licence.
