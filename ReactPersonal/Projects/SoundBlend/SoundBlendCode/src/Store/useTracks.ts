import { create } from "zustand";
import { type JamendoTrackResponse as Track } from "../SearchPage/Schema/jamendo.schema";
import { persist } from "zustand/middleware";
export const MAX_TRACK = 7;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
interface TrackControl extends Track {
  isIncluded: boolean;
  volume: number;
}
type TrackStore = {
  tracks: TrackControl[];
  isMasterPlaying: boolean;
  masterVolume: number;
  addTrack: (track: Track) => boolean;
  deleteTrack: (id: string) => void;
  toggleMasterPlaying: () => void;
  setMasterVolume: (volume: number) => void;
  toggleIndividualInclusion: (id: string) => void;
  setIndividualVolume: (id: string, volume: number) => void;
};

export const useTracks = create<TrackStore>()(
  persist(
    (set, get) => ({
      tracks: [],
      isMasterPlaying: false,
      masterVolume: 1,
      addTrack: (track: Track) => {
        const isPresent = get().tracks.some((t) => t.id === track.id);
        if (!isPresent && get().tracks.length < MAX_TRACK) {
          set((state) => ({
            tracks: [
              ...state.tracks,
              { ...track, isIncluded: true, volume: 1 },
            ],
          }));
          return true;
        }
        return false;
      },
      deleteTrack: (id: string) =>
        set((state) => {
          const tracks = state.tracks.filter((track) => track.id !== id);
          return {
            tracks,
            isMasterPlaying:
              state.isMasterPlaying && tracks.some((t) => t.isIncluded),
          };
        }),
      toggleMasterPlaying: () =>
        set((state) => ({
          isMasterPlaying: !state.isMasterPlaying,
        })),
      setMasterVolume: (volume: number) => set({ masterVolume: clamp(volume) }),
      toggleIndividualInclusion: (id: string) =>
        set((state) => {
          const tracks = state.tracks.map((track) =>
            track.id === id
              ? { ...track, isIncluded: !track.isIncluded }
              : track,
          );
          return {
            tracks,
            isMasterPlaying:
              state.isMasterPlaying && tracks.some((t) => t.isIncluded),
          };
        }),
      setIndividualVolume: (id: string, volume: number) =>
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === id ? { ...track, volume: clamp(volume) } : track,
          ),
        })),
    }),
    {
      name: "track-store",
      partialize: (s) => ({ tracks: s.tracks, masterVolume: s.masterVolume }),
    },
  ),
);
