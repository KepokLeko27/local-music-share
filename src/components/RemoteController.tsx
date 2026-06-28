import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Tv,
  Smartphone,
  Music,
  ListMusic
} from 'lucide-react';
import { Track } from '../types';

interface RemoteControllerProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  onSendPlayPause: (playing: boolean) => void;
  onSendNext: () => void;
  onSendPrev: () => void;
  onSendVolume: (vol: number) => void;
  onSendSeek: (time: number) => void;
  onPlayTrackRemote: (track: Track) => void;
}

export default function RemoteController({
  tracks,
  currentTrack,
  isPlaying,
  volume,
  currentTime,
  duration,
  onSendPlayPause,
  onSendNext,
  onSendPrev,
  onSendVolume,
  onSendSeek,
  onPlayTrackRemote,
}: RemoteControllerProps) {
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="flex flex-col gap-6" id="remote-controller-panel">
      {/* Target Device Status Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800" id="remote-status-card">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 animate-pulse">
            <Tv className="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Connected Mode</span>
            <h3 className="text-sm font-semibold tracking-wide">Phone Remote Controller</h3>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80">
          {currentTrack ? (
            <div className="space-y-4">
              <div>
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Playing on Laptop
                </span>
                <h4 className="text-sm font-semibold truncate text-white mt-2" title={currentTrack.originalName}>
                  {currentTrack.originalName.replace(/\.[^/.]+$/, '')}
                </h4>
              </div>

              {/* Seek Slider on Remote */}
              <div className="space-y-1">
                <input
                  id="remote-seek-slider"
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => onSendSeek(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Desktop player is idling. Tap any song below to launch remote streaming.
            </p>
          )}
        </div>
      </div>

      {/* Large Tactile Touch Controls */}
      {currentTrack && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col items-center gap-6" id="remote-tactile-controls">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tactile Controls</span>

          <div className="flex items-center justify-center gap-8">
            <button
              id="remote-prev-btn"
              onClick={onSendPrev}
              className="p-4 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-800 rounded-3xl border border-gray-100 transition-all"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              id="remote-play-pause-btn"
              onClick={() => onSendPlayPause(!isPlaying)}
              className="p-6 bg-slate-900 active:scale-95 hover:bg-slate-800 text-white rounded-full shadow-md transition-all"
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-0.5" />}
            </button>

            <button
              id="remote-next-btn"
              onClick={onSendNext}
              className="p-4 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-800 rounded-3xl border border-gray-100 transition-all"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* Volume adjust via remote */}
          <div className="w-full max-w-xs space-y-2 mt-2">
            <div className="flex justify-between items-center text-xs text-gray-400 font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Laptop Volume</span>
              <span className="font-mono">{Math.round(volume * 100)}%</span>
            </div>
            <input
              id="remote-volume-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onSendVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-slate-800"
            />
          </div>
        </div>
      )}

      {/* Track Launcher - Tap to Play on Laptop */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col" id="remote-track-launcher">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
          <ListMusic className="w-4 h-4 text-slate-800" />
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Push to PC Launcher</h4>
        </div>

        {tracks.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4 leading-relaxed">
            No tracks uploaded yet. Upload tracks first using the sync uploader below.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {tracks.map((track) => {
              const isSelected = currentTrack?.id === track.id;
              return (
                <button
                  key={track.id}
                  id={`launcher-${track.id}`}
                  onClick={() => onPlayTrackRemote(track)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 hover:bg-slate-100/70 border-transparent text-gray-800'
                  }`}
                >
                  <span className="text-xs font-semibold truncate pr-4">
                    {track.originalName.replace(/\.[^/.]+$/, '')}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm flex-shrink-0">
                    {isSelected ? 'Active' : 'Play Remote'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
