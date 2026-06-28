import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize2,
  Radio
} from 'lucide-react';
import { Track } from '../types';

interface AudioPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function AudioPlayer({
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  volume,
  onVolumeChange,
  currentTime,
  onSeek,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [localTime, setLocalTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [isDragging, setIsDragging] = useState(false);

  // Web Audio Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Synchronize audio element's playing state with props
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.log('Playback interrupted or user interaction required:', err);
        // Fallback: update parent that we actually paused
        onPlayPause(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // Synchronize incoming currentTime (from remote commands)
  useEffect(() => {
    if (!audioRef.current || isDragging) return;

    // Only update if difference is more than 1.5s to avoid glitching on minor lag
    if (Math.abs(audioRef.current.currentTime - currentTime) > 1.5) {
      audioRef.current.currentTime = currentTime;
      setLocalTime(currentTime);
    }
  }, [currentTime]);

  // Synchronize volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Setup Web Audio API and Visualizer
  useEffect(() => {
    if (!canvasRef.current || !audioRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize AudioContext on user play action or load
    const setupVisualizer = () => {
      try {
        if (!audioRef.current) return;

        // Create context only once
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }

        const audioCtx = audioCtxRef.current;

        // Resume if suspended (browser security)
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        // Create analyser and source only once
        if (!analyserNodeRef.current) {
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyserNodeRef.current = analyser;

          const source = audioCtx.createMediaElementSource(audioRef.current);
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
          sourceNodeRef.current = source;
        }
      } catch (err) {
        console.log('Web Audio context blocked or already connected:', err);
      }
    };

    // If already playing, set up
    if (isPlaying) {
      setupVisualizer();
    }

    // Animation function
    const bufferLength = analyserNodeRef.current ? analyserNodeRef.current.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    let animationPhase = 0;

    const render = () => {
      animationFrameIdRef.current = requestAnimationFrame(render);

      const width = canvas.width = canvas.parentElement?.clientWidth || 400;
      const height = canvas.height = 100;

      ctx.clearRect(0, 0, width, height);

      const isAnalysing = isPlaying && analyserNodeRef.current && audioCtxRef.current?.state === 'running';

      if (isAnalysing && analyserNodeRef.current) {
        analyserNodeRef.current.getByteFrequencyData(dataArray);

        // Render true music spectrum
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.8;

          // Beautiful premium gradient bar
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#f1f5f9'); // slate-100
          gradient.addColorStop(0.5, '#475569'); // slate-600
          gradient.addColorStop(1, '#0f172a'); // slate-900

          ctx.fillStyle = gradient;
          // Smooth rounded bars
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, 2);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // Render beautiful procedural resting or synthetic wave
        animationPhase += isPlaying ? 0.05 : 0.01;
        ctx.beginPath();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x++) {
          const amplitude = isPlaying ? 25 : 4;
          const frequency = isPlaying ? 0.02 : 0.01;
          const y = height / 2 + Math.sin(x * frequency + animationPhase) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Secondary subtle wave
        ctx.beginPath();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x++) {
          const amplitude = isPlaying ? 15 : 2;
          const frequency = isPlaying ? 0.035 : 0.015;
          const y = height / 2 + Math.cos(x * frequency - animationPhase) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    };

    render();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying, currentTrack]);

  // Handle time update from audio element
  const handleTimeUpdate = () => {
    if (!audioRef.current || isDragging) return;
    setLocalTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleAudioEnded = () => {
    onNext();
  };

  // Slider controls
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setLocalTime(time);
  };

  const handleTimeDragStart = () => {
    setIsDragging(true);
  };

  const handleTimeDragEnd = () => {
    setIsDragging(false);
    if (audioRef.current) {
      audioRef.current.currentTime = localTime;
      onSeek(localTime);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(prevVolume);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!currentTrack) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <div className="p-4 bg-slate-50 text-slate-800 rounded-2xl border border-slate-100 mb-4 animate-pulse">
          <Radio className="w-8 h-8 text-slate-800" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Ready to play</h3>
        <p className="text-xs text-gray-500 max-w-xs mt-1">
          Select any synced song from your library or push a song from your phone to start playing.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full" id="audio-player-panel">
      {/* Hidden native audio tag */}
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Track info header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200/50 rounded-full text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
          Now Playing on Desktop
        </span>
        <h2 className="text-lg font-bold text-gray-900 truncate max-w-sm mx-auto" title={currentTrack.originalName}>
          {currentTrack.originalName.replace(/\.[^/.]+$/, '')}
        </h2>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
          Synced over local network
        </p>
      </div>

      {/* Dynamic Spectrum / Waveform Visualizer */}
      <div className="my-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 overflow-hidden flex items-center justify-center" id="visualizer-wrapper">
        <canvas ref={canvasRef} className="w-full h-[100px]" />
      </div>

      {/* Progress slider */}
      <div className="space-y-1 mt-4" id="progress-container">
        <input
          id="audio-progress-bar"
          type="range"
          min={0}
          max={duration || 100}
          value={localTime}
          onChange={handleTimeChange}
          onMouseDown={handleTimeDragStart}
          onTouchStart={handleTimeDragStart}
          onMouseUp={handleTimeDragEnd}
          onTouchEnd={handleTimeDragEnd}
          className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-slate-800"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-semibold font-mono">
          <span>{formatTime(localTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Music Controls */}
      <div className="flex flex-col items-center gap-6 mt-6">
        <div className="flex items-center justify-center gap-6" id="player-controls-row">
          <button
            id="prev-btn"
            onClick={onPrev}
            className="p-3 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all"
            title="Previous track"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            id="play-pause-btn"
            onClick={() => {
              // Toggle AudioContext state to resume Web Audio security context
              if (audioCtxRef.current?.state === 'suspended') {
                audioCtxRef.current.resume();
              }
              onPlayPause(!isPlaying);
            }}
            className="p-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-[1.03]"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            id="next-btn"
            onClick={onNext}
            className="p-3 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all"
            title="Next track"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-3 w-full max-w-[200px]" id="volume-row">
          <button
            id="mute-btn"
            onClick={toggleMute}
            className="text-gray-500 hover:text-slate-800 transition-colors"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            id="volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onVolumeChange(val);
              if (isMuted && val > 0) {
                setIsMuted(false);
              }
            }}
            className="w-full h-1 bg-gray-100 rounded-full appearance-none cursor-pointer accent-slate-800"
          />
        </div>
      </div>
    </div>
  );
}
