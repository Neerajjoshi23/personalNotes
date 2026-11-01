import type {
  Genre,
  Mood,
  Order,
  CategoryType,
} from "./constants/constant";
import type {
  JamendoApiResponseSchema,
  JamendoAutocompleteApiResponseResults,
} from "./Schema/jamendo.schema";

export type FetchParams = {
  query: string;
  genre: Genre;
  mood: Mood;
  order: Order;
  category: CategoryType;
  offset?: number;
  // Detail pages: only tracks of this artist / album
  artistId?: string;
  albumId?: string;
};
export type FetchFilter = Omit<FetchParams, "offset">;
export type InfiniteQueryResponse = {
  totalItems: string | number | undefined;
  data: JamendoApiResponseSchema[];
};
export type AutoCompleteParams = {
  prefix: string;
  entity: CategoryType;
};
export type AutoCompleteResponse = {
  results: JamendoAutocompleteApiResponseResults;
};
