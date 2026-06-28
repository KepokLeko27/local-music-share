import React from 'react';
import { Play, Trash2, Music, Clock } from 'lucide-react';
import { Track } from '../types';

interface SongListProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
}

export default function SongList({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onDeleteTrack,
}: SongListProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col h-full" id="song-list-panel">
      <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Synced Music Library</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} uploaded to this room
          </p>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center" id="empty-songs">
          <div className="p-4 bg-slate-50 text-gray-400 rounded-2xl border border-slate-100 mb-4">
            <Music className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-800">No music synced yet</h4>
          <p className="text-xs text-gray-500 max-w-xs mt-1">
            Open this website on your phone, join this room PIN, and push your local audio files. They will instantly appear here!
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[480px] pr-1" id="song-items-list">
          {tracks.map((track) => {
            const isSelected = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-slate-50/80 border-slate-200 shadow-sm'
                    : 'bg-white hover:bg-slate-50/50 border-gray-100'
                }`}
              >
                <div
                  className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onPlayTrack(track)}
                >
                  <div
                    className={`p-3 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-700 group-hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-3.5 w-3.5">
                        <div className="w-0.5 bg-current rounded-full animate-bounce h-full" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-0.5 bg-current rounded-full animate-bounce h-full" style={{ animationDelay: '0.3s' }}></div>
                        <div className="w-0.5 bg-current rounded-full animate-bounce h-full" style={{ animationDelay: '0.5s' }}></div>
                      </div>
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-slate-900' : 'text-gray-800'
                      }`}
                    >
                      {track.originalName.replace(/\.[^/.]+$/, '')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 font-medium">{formatSize(track.size)}</span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {formatDate(track.uploadedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  id={`delete-${track.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTrack(track.id);
                  }}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all ml-2"
                  title="Delete from room"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
