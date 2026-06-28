import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Smartphone,
  Copy,
  Check,
  LogOut,
  Radio,
  Tv,
  Share2,
  HelpCircle,
  QrCode
} from 'lucide-react';
import { Track, RemoteCommand } from './types';
import RoomSelector from './components/RoomSelector';
import Uploader from './components/Uploader';
import SongList from './components/SongList';
import AudioPlayer from './components/AudioPlayer';
import RemoteController from './components/RemoteController';

// Generate a random stable client ID
const CLIENT_ID = 'client-' + Math.random().toString(36).substring(2, 11);

export default function App() {
  const [room, setRoom] = useState<string | null>(null);
  const [mode, setMode] = useState<'laptop' | 'phone'>('laptop');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Keep ref of current state for event handlers to access newest state
  const stateRef = useRef({ tracks, currentTrack, isPlaying, volume, currentTime, duration });
  useEffect(() => {
    stateRef.current = { tracks, currentTrack, isPlaying, volume, currentTime, duration };
  }, [tracks, currentTrack, isPlaying, volume, currentTime, duration]);

  // Load room from URL search parameter or localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRoom = params.get('room');
    if (queryRoom) {
      const cleanRoom = queryRoom.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanRoom) {
        setRoom(cleanRoom);
        localStorage.setItem('sync_room_pin', cleanRoom);
        // Default to phone mode if accessed on mobile layout, otherwise laptop
        if (window.innerWidth < 768) {
          setMode('phone');
        }
        return;
      }
    }

    const savedRoom = localStorage.getItem('sync_room_pin');
    if (savedRoom) {
      setRoom(savedRoom);
      if (window.innerWidth < 768) {
        setMode('phone');
      }
    }
  }, []);

  // Fetch track list
  const fetchTracks = async (targetRoom: string) => {
    try {
      const res = await fetch(`/api/tracks?room=${targetRoom}`);
      const data = await res.json();
      if (data.success) {
        setTracks(data.tracks);
      }
    } catch (e) {
      console.error('Failed to fetch tracks:', e);
    }
  };

  // Synchronize tracks and subscribe to room SSE events
  useEffect(() => {
    if (!room) return;

    fetchTracks(room);

    // Subscribe to server updates
    const eventSource = new EventSource(`/api/sync/events?room=${room}&clientId=${CLIENT_ID}`);

    eventSource.onmessage = (event) => {
      try {
        const command = JSON.parse(event.data) as any;
        console.log('Received command:', command);

        if (command.type === 'connected') {
          console.log('SSE connection active with ID:', command.clientId);
          return;
        }

        switch (command.type) {
          case 'refresh_list':
            fetchTracks(room);
            break;

          case 'play':
            setIsPlaying(true);
            break;

          case 'pause':
            setIsPlaying(false);
            break;

          case 'seek':
            if (command.value !== undefined) {
              setCurrentTime(command.value);
            }
            break;

          case 'volume':
            if (command.value !== undefined) {
              setVolume(command.value);
            }
            break;

          case 'track_change':
            if (command.trackId) {
              // Find track in local list
              const foundTrack = stateRef.current.tracks.find((t) => t.id === command.trackId);
              if (foundTrack) {
                setCurrentTrack(foundTrack);
                setIsPlaying(true);
                setCurrentTime(0);
              }
            }
            break;

          default:
            break;
        }
      } catch (e) {
        console.error('Error parsing room SSE event:', e);
      }
    };

    eventSource.onerror = (e) => {
      console.error('SSE EventSource error, reconnecting...');
    };

    return () => {
      eventSource.close();
    };
  }, [room]);

  // Periodic broadcaster: updates room state from desktop player so that controller devices sync their progress bars
  useEffect(() => {
    if (mode !== 'laptop' || !isPlaying || !currentTrack || !room) return;

    const interval = setInterval(() => {
      // Find active audio element
      const audioEl = document.querySelector('audio') as HTMLAudioElement | null;
      if (audioEl) {
        const time = audioEl.currentTime;
        const dur = audioEl.duration || 0;
        setCurrentTime(time);
        setDuration(dur);

        // Notify other devices of current seek state and duration
        sendRemoteCommand({
          type: 'seek',
          value: time,
          senderId: CLIENT_ID,
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [mode, isPlaying, currentTrack, room]);

  // Helper to dispatch remote control actions to server
  const sendRemoteCommand = async (command: RemoteCommand) => {
    if (!room) return;
    try {
      await fetch('/api/sync/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, command }),
      });
    } catch (e) {
      console.error('Failed to send remote command:', e);
    }
  };

  // Handle Joining Room PIN
  const handleJoinRoom = (enteredRoom: string) => {
    setRoom(enteredRoom);
    localStorage.setItem('sync_room_pin', enteredRoom);
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect from this room?')) {
      setRoom(null);
      setCurrentTrack(null);
      setIsPlaying(false);
      localStorage.removeItem('sync_room_pin');
      // Clean query parameter if exists
      window.history.pushState({}, document.title, window.location.pathname);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${room}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Native Laptop playback triggers (updates local state & sends command to sync room)
  const handlePlayPause = (playing: boolean) => {
    setIsPlaying(playing);
    sendRemoteCommand({
      type: playing ? 'play' : 'pause',
      senderId: CLIENT_ID,
    });
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    sendRemoteCommand({
      type: 'seek',
      value: time,
      senderId: CLIENT_ID,
    });
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    sendRemoteCommand({
      type: 'volume',
      value: vol,
      senderId: CLIENT_ID,
    });
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);

    sendRemoteCommand({
      type: 'track_change',
      trackId: track.id,
      senderId: CLIENT_ID,
    });
  };

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    const currentIndex = currentTrack ? tracks.findIndex((t) => t.id === currentTrack.id) : -1;
    const nextIndex = (currentIndex + 1) % tracks.length;
    handlePlayTrack(tracks[nextIndex]);
  };

  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    const currentIndex = currentTrack ? tracks.findIndex((t) => t.id === currentTrack.id) : -1;
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = tracks.length - 1;
    handlePlayTrack(tracks[prevIndex]);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!room) return;
    try {
      const res = await fetch(`/api/tracks/${trackId}?room=${room}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (currentTrack?.id === trackId) {
          setCurrentTrack(null);
          setIsPlaying(false);
        }
        fetchTracks(room);
      }
    } catch (e) {
      console.error('Failed to delete track:', e);
    }
  };

  // Remote controller actions from phone to desktop
  const handlePlayTrackRemote = (track: Track) => {
    // Optimistically update remote UI state
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);

    sendRemoteCommand({
      type: 'track_change',
      trackId: track.id,
      senderId: CLIENT_ID,
    });
  };

  const handleSendPlayPause = (playing: boolean) => {
    setIsPlaying(playing);
    sendRemoteCommand({
      type: playing ? 'play' : 'pause',
      senderId: CLIENT_ID,
    });
  };

  const handleSendNext = () => {
    if (tracks.length === 0) return;
    const currentIndex = currentTrack ? tracks.findIndex((t) => t.id === currentTrack.id) : -1;
    const nextIndex = (currentIndex + 1) % tracks.length;
    handlePlayTrackRemote(tracks[nextIndex]);
  };

  const handleSendPrev = () => {
    if (tracks.length === 0) return;
    const currentIndex = currentTrack ? tracks.findIndex((t) => t.id === currentTrack.id) : -1;
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = tracks.length - 1;
    handlePlayTrackRemote(tracks[prevIndex]);
  };

  if (!room) {
    return <RoomSelector onJoin={handleJoinRoom} />;
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${room}`;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-16" id="app-root-container">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3.5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Radio className="w-4 h-4 animate-pulse text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-800 tracking-tight block">Local Music Share</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                Room: <span className="text-slate-800 underline underline-offset-2 font-mono">{room}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" id="nav-actions">
            {/* Direct Sync Link Copier */}
            <button
              onClick={handleCopyLink}
              className="p-2 text-gray-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-gray-100 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
              title="Copy pairing link to open on phone"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pair Device</span>
                </>
              )}
            </button>

            {/* Quick user guide toggle */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="p-2 text-gray-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-gray-100 rounded-xl transition-all"
              title="How to sync"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Disconnect Room */}
            <button
              onClick={handleDisconnect}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Interactive Step Guide Box */}
        {showGuide && (
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm relative animate-fadeIn" id="guide-box">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">How to stream your music</h3>
            <ol className="text-xs text-gray-600 space-y-2 list-decimal pl-4 leading-relaxed font-sans">
              <li>
                Click <span className="font-semibold text-slate-900">"Pair Device"</span> at the top right to copy the direct setup link.
              </li>
              <li>
                Open that link on your <span className="font-semibold text-slate-900">Phone</span> (e.g. scan a QR code, email it to yourself, or enter the same passcode PIN: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-900 font-bold">{room}</span>).
              </li>
              <li>
                On your phone, select <span className="font-semibold text-slate-900">"Mobile Remote"</span> and upload your local MP3 or audio files using the uploader.
              </li>
              <li>
                On your Laptop, stay in <span className="font-semibold text-slate-900">"Desktop Player"</span>. Tap play on your phone, and the music will play instantly from your laptop!
              </li>
            </ol>
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-xs font-semibold text-gray-400 hover:text-gray-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Device Mode Switcher (Pill tab slider style) */}
        <div className="flex justify-center" id="device-mode-switch-wrapper">
          <div className="bg-gray-200/75 p-1 rounded-2xl flex gap-1 border border-gray-100/30">
            <button
              onClick={() => {
                setMode('laptop');
                setIsPlaying(false); // Stop playing active track when shifting modes to avoid dual audio
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                mode === 'laptop'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop Player</span>
            </button>
            <button
              onClick={() => {
                setMode('phone');
                setIsPlaying(false);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                mode === 'phone'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Remote</span>
            </button>
          </div>
        </div>

        {/* Core Layout Containers */}
        {mode === 'laptop' ? (
          /* Laptop/Desktop Player Mode */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="desktop-player-layout">
            <div className="md:col-span-7 h-full">
              <AudioPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onNext={handleNextTrack}
                onPrev={handlePrevTrack}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            </div>
            <div className="md:col-span-5 h-full">
              <SongList
                tracks={tracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onDeleteTrack={handleDeleteTrack}
              />
            </div>
          </div>
        ) : (
          /* Mobile / Remote Controller Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto" id="mobile-remote-layout">
            <RemoteController
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              volume={volume}
              currentTime={currentTime}
              duration={duration}
              onSendPlayPause={handleSendPlayPause}
              onSendNext={handleSendNext}
              onSendPrev={handleSendPrev}
              onSendVolume={handleVolumeChange}
              onSendSeek={handleSeek}
              onPlayTrackRemote={handlePlayTrackRemote}
            />

            {/* Quick Upload Portal */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm" id="remote-uploader-portal">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">Push New Tracks</h4>
              <Uploader room={room} onUploadSuccess={() => fetchTracks(room)} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
