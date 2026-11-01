import { z } from "zod";
export function createJamendoApiResponseSchema<T extends z.ZodTypeAny>(
  resultsSchema: T,
) {
  return z.object({
    headers: z.object({
      status: z.string().optional(),
      results_fullcount: z.number().optional().or(z.string().optional()),
      results_count: z.number().optional().or(z.string().optional()),
    }),
    results: resultsSchema,
  });
}
export const JamendoBaseEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
});
export const JamendoShareableSchema = JamendoBaseEntitySchema.extend({
  shorturl: z.string().optional(),
  shareurl: z.string().optional(),
});
export const JamendoTrackSchema = JamendoBaseEntitySchema.extend({
  // id and name are inherited from JamendoBaseEntitySchema
  artist_name: z.string(),
  album_name: z.string().optional(),
  album_image: z.string().optional(),
  duration: z.number(),
  audio: z.string(),
  releasedate: z.string().optional(),
});

// 1. Transform the individual item here
export const JamendoTransformedTrackSchema = JamendoTrackSchema.transform(
  (track) => ({
    id: track.id,
    name: track.name,
    artistName: track.artist_name,
    albumName: track.album_name,
    artworkUrl: track.album_image,
    audio: track.audio,
    duration: track.duration,
    releaseDate: track.releasedate,
  }),
);

export const JamendoArtistsSchema = JamendoShareableSchema.extend({
  // id and name are inherited from JamendoBaseEntitySchema and shareable fields from JamendoShareableSchema
  joindate: z.string().optional(),
  image: z.string().optional(),
  website: z.string().optional(),
});
export const JamendoTransformedArtistSchema = JamendoArtistsSchema.transform(
  (artist) => ({
    id: artist.id,
    name: artist.name,
    artworkUrl: artist.image,
    joinDate: artist.joindate,
    website: artist.website,
    shareUrl: artist.shareurl,
  }),
);
export const JamendoAlbumnsSchema = JamendoShareableSchema.extend({
  // id and name are inherited from JamendoBaseEntitySchema and shareable fields from JamendoShareableSchema
  artist_id: z.string(),
  artist_name: z.string().optional(),
  image: z.string().optional(),
  releasedate: z.string().optional(),
});
export const JamendoTransformedAlbumSchema = JamendoAlbumnsSchema.transform(
  (album) => ({
    id: album.id,
    name: album.name,
    artistId: album.artist_id,
    artistName: album.artist_name,
    artworkUrl: album.image,
    releaseDate: album.releasedate,
    shareUrl: album.shareurl,
  }),
);
export const JamendoAutocompleteSchema = z.object({
  tags: z.array(z.string()).optional(),
  artists: z.array(z.string()).optional(),
  albums: z.array(z.string()).optional(),
  tracks: z.array(z.string()).optional(),
});
export const JamendoTrackApiResponseSchema = createJamendoApiResponseSchema(
  z.array(JamendoTransformedTrackSchema),
);
export const JamendoArtistApiResponseSchema = createJamendoApiResponseSchema(
  z.array(JamendoTransformedArtistSchema),
);
export const JamendoAlbumApiResponseSchema = createJamendoApiResponseSchema(
  z.array(JamendoTransformedAlbumSchema),
);
// No matches -> Jamendo sends [] instead of an object; normalise it to {}
export const JamendoAutocompleteApiResponseSchema =
  createJamendoApiResponseSchema(
    JamendoAutocompleteSchema.or(
      z
        .array(z.never())
        .transform((): z.infer<typeof JamendoAutocompleteSchema> => ({})),
    ),
  );

// A clean dictionary of your schemas
export const jamendoSchemaRegistry = {
  tracks: JamendoTrackApiResponseSchema,
  artists: JamendoArtistApiResponseSchema,
  albums: JamendoAlbumApiResponseSchema,
} as const;
export type JamendoApiResponseSchema = z.infer<
  (typeof jamendoSchemaRegistry)[keyof typeof jamendoSchemaRegistry]
>["results"][number];

export type JamendoArtistResponse = z.infer<
  typeof JamendoArtistApiResponseSchema
>["results"][number];
export type JamendoTrackResponse = z.infer<
  typeof JamendoTrackApiResponseSchema
>["results"][number];
export type JamendoAlbumResponse = z.infer<
  typeof JamendoAlbumApiResponseSchema
>["results"][number];
export type JamendoAutocompleteApiResponse = z.infer<
  typeof JamendoAutocompleteApiResponseSchema
>;
export type JamendoAutocompleteApiResponseResults = z.infer<
  typeof JamendoAutocompleteApiResponseSchema
>["results"];
