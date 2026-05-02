import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VideoRecord } from './db';

export interface AdminRecord {
  name: string;
  addedAt: string;
  videoCount: number;
  isDefault: boolean;
}

export interface Settings {
  playbackSpeed: number;
  autoplay: boolean;
  loop: boolean;
  volume: number;
  quality: string;
  autoHideDelay: number;
  theme: 'dark' | 'light';
  accentColor: string;
  fontSize: 'small' | 'default' | 'large';
  showThumbnails: boolean;
  showDurationBadge: boolean;
  compactCardView: boolean;
  showViewCounts: boolean;
  showAdminNameTag: boolean;
  enableShortcuts: boolean;
  enablePip: boolean;
  showBuffered: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  captionPreference: boolean;
}

export interface ProfileSwitchRequest {
  videoId: string;
  title: string;
  currentOwner: string;
  requestedOwner: string;
}

interface AppState {
  videos: VideoRecord[];
  admins: AdminRecord[];
  settings: Settings;
  devSession: { adminName: string; sessionStart: string } | null;
  failedAttempts: number;
  lockoutUntil: string | null;
  profileSwitchRequests: ProfileSwitchRequest[];
  
  // Actions
  setVideos: (videos: VideoRecord[]) => void;
  updateVideo: (id: string, updates: Partial<VideoRecord>) => void;
  setDevSession: (session: { adminName: string; sessionStart: string } | null) => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
  setLockoutUntil: (time: string | null) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  addAdmin: (name: string) => void;
  removeAdmin: (name: string) => void;
  addProfileSwitchRequest: (request: ProfileSwitchRequest) => void;
  removeProfileSwitchRequest: (videoId: string, requestedOwner: string) => void;
}

const DEFAULT_SETTINGS: Settings = {
  playbackSpeed: 1,
  autoplay: false,
  loop: false,
  volume: 100,
  quality: 'auto',
  autoHideDelay: 3,
  theme: 'dark',
  accentColor: '#e2e8f0', // cool silver-white
  fontSize: 'default',
  showThumbnails: true,
  showDurationBadge: true,
  compactCardView: false,
  showViewCounts: true,
  showAdminNameTag: true,
  enableShortcuts: true,
  enablePip: true,
  showBuffered: true,
  reduceMotion: false,
  highContrast: false,
  captionPreference: false,
};

const DEFAULT_ADMIN: AdminRecord = {
  name: 'EBOY',
  addedAt: new Date().toISOString(),
  videoCount: 3,
  isDefault: true,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      videos: [],
      admins: [DEFAULT_ADMIN],
      settings: DEFAULT_SETTINGS,
      devSession: null,
      failedAttempts: 0,
      lockoutUntil: null,
      profileSwitchRequests: [],

      setVideos: (videos) => set({ videos }),
      updateVideo: (id, updates) => set((state) => ({
        videos: state.videos.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      })),
      setDevSession: (session) => set({ devSession: session }),
      incrementFailedAttempts: () => set((state) => ({ failedAttempts: state.failedAttempts + 1 })),
      resetFailedAttempts: () => set({ failedAttempts: 0, lockoutUntil: null }),
      setLockoutUntil: (time) => set({ lockoutUntil: time }),
      updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),
      addAdmin: (name) => set((state) => ({
        admins: [...state.admins, { name: name.toUpperCase(), addedAt: new Date().toISOString(), videoCount: 0, isDefault: false }],
      })),
      removeAdmin: (name) => set((state) => ({
        admins: state.admins.filter((a) => a.name !== name || a.isDefault),
      })),
      addProfileSwitchRequest: (request) => set((state) => ({
        profileSwitchRequests: [...state.profileSwitchRequests, request],
      })),
      removeProfileSwitchRequest: (videoId, requestedOwner) => set((state) => ({
        profileSwitchRequests: state.profileSwitchRequests.filter(
          (req) => !(req.videoId === videoId && req.requestedOwner === requestedOwner)
        ),
      })),
    }),
    {
      name: 'synq-stream-storage',
      partialize: (state) => ({
        admins: state.admins,
        settings: state.settings,
        devSession: state.devSession,
        failedAttempts: state.failedAttempts,
        lockoutUntil: state.lockoutUntil,
        profileSwitchRequests: state.profileSwitchRequests,
      }),
    }
  )
);
