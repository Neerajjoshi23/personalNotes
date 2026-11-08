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
- **Accounts** with Supabase Auth: sign up, sign in, sign out. Search, Detail and Blend are protected; after login you return to the page you wanted. Home stays public.
- **Lazy-loaded pages** with `Suspense`, and an **error boundary** around each page with a "Try again" button.

## Tech stack

React 19, TypeScript, Vite, TanStack Query v5, Zod v4, Zustand (with `persist`), React Router v7, Tailwind CSS v4, lucide-react, Supabase (`@supabase/supabase-js`), React Hook Form.

## Getting started

1. Get a client ID from the [Jamendo developer portal](https://devportal.jamendo.com).
2. Create a [Supabase](https://supabase.com) project. Under Authentication, set the Site URL to `http://localhost:5173`, add `http://localhost:5173/**` to Redirect URLs, and (for local dev) turn off "Confirm email". Copy the Project URL and anon key from Project Settings -> API.
3. Create a `.env` file:

   ```
   VITE_JAMENDO_CLIENT_ID=your_client_id
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. Run:

   ```
   npm install
   npm run dev
   ```

Other scripts: `npm run build`, `npm run lint`, `npm run preview`.

## Project structure

```
src/
  Layout/       app shell (sidebar / top bar, sign out)
  Auth/         auth context, provider, ProtectedRoute, sign in / sign up pages
  components/   shared components (ErrorBoundary)
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
