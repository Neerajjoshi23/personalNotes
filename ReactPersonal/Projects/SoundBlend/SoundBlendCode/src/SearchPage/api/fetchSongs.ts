import type { FetchParams, AutoCompleteParams } from "../types";
import {
  jamendoSchemaRegistry,
  JamendoAutocompleteApiResponseSchema,
} from "../Schema/jamendo.schema";
import { Limit } from "../constants/constant";

const CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID;
// The precise endpoint required for track data distributions
const BASE_URL = "https://api.jamendo.com/v3.0";

// Only what we read before Zod validates the full shape
type RawResponse = {
  headers?: { status?: string; error_message?: string };
  results?: unknown;
};

const getFixedUrl = (pathParam: string) => {
  if (!CLIENT_ID) throw new Error("Missing VITE_JAMENDO_CLIENT_ID");
  const url = new URL(`${BASE_URL}/${pathParam}`);
  url.searchParams.append("client_id", CLIENT_ID);
  url.searchParams.append("format", "json");
  url.searchParams.append("limit", Limit.toString());
  return url;
};
export const fetchJamendoSongs = async (
  params: FetchParams,
  signal?: AbortSignal,
) => {
  const url = getFixedUrl(params.category);
  url.searchParams.append("fullcount", "true");
  url.searchParams.append("offset", params.offset?.toString() || "0");

  const query = params.query?.trim();
  if (query) {
    url.searchParams.append("namesearch", query);
  }

  if (params.artistId) {
    url.searchParams.append("artist_id", params.artistId);
    // Jamendo hides singles unless both types are requested
    url.searchParams.append("type", "single albumtrack");
  }
  if (params.albumId) {
    url.searchParams.append("album_id", params.albumId);
  }

  if (params.category === "tracks") {
    if (params.genre && params.genre !== "all") {
      url.searchParams.append("tags", params.genre);
    }
    if (params.mood && params.mood !== "all") {
      url.searchParams.append("fuzzytags", params.mood);
    }
    if (params.order) {
      url.searchParams.append("order", params.order);
    }
  }

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error("Failed to fetch songs");

  const rawResponse: RawResponse = await response.json();

  // Jamendo reports errors with HTTP 200 and headers.status === "failed"
  if (rawResponse?.headers?.status === "failed") {
    throw new Error(
      rawResponse.headers.error_message ?? "Jamendo request failed",
    );
  }
  if (!Array.isArray(rawResponse?.results) || rawResponse.results.length === 0) {
    return { totalItems: "0", data: [] };
  }

  const parsed = jamendoSchemaRegistry[params.category].safeParse(rawResponse);
  if (!parsed.success) {
    console.error(
      "Zod failed for category:",
      params.category,
      parsed.error.message,
    );
    throw new Error("Invalid response format");
  }

  return {
    totalItems: parsed.data.headers?.results_fullcount ?? "0",
    data: parsed.data.results,
  };
};
export const fetchAutoComplete = async (
  params: AutoCompleteParams,
  signal?: AbortSignal,
) => {
  const url = getFixedUrl("autocomplete");
  url.searchParams.append("prefix", params.prefix);
  url.searchParams.append("entity", params.entity);

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error("Failed to fetch autocomplete");

  const rawResponse: RawResponse = await response.json();
  if (rawResponse?.headers?.status === "failed") {
    throw new Error(
      rawResponse.headers.error_message ?? "Jamendo request failed",
    );
  }
  const result = JamendoAutocompleteApiResponseSchema.safeParse(rawResponse);
  if (!result.success) {
    console.error("Zod failed for autocomplete:", result.error.message);
    throw new Error("Invalid response format");
  }
  return { results: result.data.results };
};
