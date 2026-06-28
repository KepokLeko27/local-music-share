export interface Track {
  id: string;
  name: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  url: string;
  duration?: number; // in seconds
}

export interface SyncRoomState {
  roomId: string;
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  lastUpdatedBy: string; // client id to avoid self-echoes
  timestamp: number;
}

export interface RemoteCommand {
  type: 'play' | 'pause' | 'skip' | 'volume' | 'seek' | 'track_change' | 'refresh_list';
  trackId?: string;
  value?: number; // volume level or seek time
  senderId: string;
}
