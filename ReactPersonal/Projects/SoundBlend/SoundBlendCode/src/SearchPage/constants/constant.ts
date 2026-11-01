import { jamendoSchemaRegistry } from "../Schema/jamendo.schema";

export const Genre = ["all", "electronic", "rock", "ambient"] as const;
export const Mood = ["all", "energetic", "relaxing", "epic"] as const;
export const Order = [
  "relevance",
  "popularity_total",
  "releasedate_desc",
  "name_asc",
] as const;
export type CategoryType = keyof typeof jamendoSchemaRegistry; // "track" | "artist" | "album"
export const Category = Object.keys(jamendoSchemaRegistry) as CategoryType[];
export const Limit = 10;
export const ROW_HEIGHT = 68;
export const OVERSCAN = 2;
export const ViewMode = ["infinite", "paginated"] as const;
export type Genre = (typeof Genre)[number];
export type Mood = (typeof Mood)[number];
export type Order = (typeof Order)[number];
export type ViewMode = (typeof ViewMode)[number];
