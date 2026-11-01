export const messages = {
  "app.name": "SoundBlend",
  "app.credit": "Music via Jamendo",
  "nav.home": "Home",
  "nav.search": "Search",
  "nav.blend": "Blend",

  "home.eyebrow": "Layer. Mix. Listen.",
  "home.title": "Build a blend from tracks you discover",
  "home.subtitle":
    "Search royalty-free music from Jamendo, pick up to {max} tracks, and play them together with per-track and master volume.",
  "home.cta": "Start searching",
  "home.blend": "Open my blend",
  "home.f1.title": "Search the catalog",
  "home.f1.body": "Tracks, artists and albums with genre, mood and sort filters.",
  "home.f2.title": "Pick up to {max}",
  "home.f2.body": "Add tracks in one click and keep them while you browse.",
  "home.f3.title": "Mix it live",
  "home.f3.body": "Per-track and master volume. Mute or remove any layer.",

  "blend.title": "Your blend",
  "blend.subtitle": "{count} of {max} tracks",
  "blend.play": "Play blend",
  "blend.pause": "Pause blend",
  "blend.master": "Master volume",
  "blend.volume": "Volume for {name}",
  "blend.include": "In mix",
  "blend.muted": "Muted",
  "blend.remove": "Remove {name}",
  "blend.emptyTitle": "Your blend is empty",
  "blend.emptyBody": "Add tracks from search to start layering them.",
  "blend.emptyCta": "Find tracks",
  "blend.nothingActive": "Turn at least one track on to play.",

  "track.add": "Blend",
  "track.added": "Added",

  "notfound.title": "Page not found",
  "notfound.back": "Back home",

  "search.title": "Discover",
  "search.badge": "JAMENDO CATALOG",
  "search.subtitle":
    "Search thousands of royalty-free tracks, then add your favourites to a blend.",
  "search.placeholder": "Search tracks, artists or albums",
  "search.button": "Search",

  "view.infinite": "Infinite scroll",
  "view.paginated": "Pagination",

  "category.tracks": "Tracks",
  "category.artists": "Artists",
  "category.albums": "Albums",

  "filter.allGenres": "All genres",
  "filter.allMoods": "All moods",
  "filter.sort": "Sort: {value}",

  "state.idle": "Search for something or pick a genre or mood to get started.",
  "state.loading": "Loading…",
  "state.error": "Failed to load tracks. Please try again.",
  "state.empty": "No tracks found.",
  "state.loadingMore": "Loading more items...",
  "state.endOfList": "End of tracklist reached.",

  "pagination.prev": "Previous",
  "pagination.next": "Next",
  "pagination.page": "Page {page}",

  "track.artworkAlt": "{name} artwork",
  "track.noAudio": "Your browser does not support audio.",
  "track.artistProfile": "Artist profile",
  "track.blendFull": "Blend is full ({max} tracks max)",
  "detail.back": "← Back",
} as const;

export type MessageKey = keyof typeof messages;

export function t(
  key: MessageKey,
  values?: Record<string, string | number>,
): string {
  const template: string = messages[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(values[name] ?? `{${name}}`),
  );
}
