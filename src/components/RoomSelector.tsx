import React, { useState } from 'react';
import { KeyRound, Radio, Smartphone, Monitor } from 'lucide-react';

interface RoomSelectorProps {
  onJoin: (room: string) => void;
}

export default function RoomSelector({ onJoin }: RoomSelectorProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanPin) {
      setError('Please enter a valid secret passcode (letters & numbers)');
      return;
    }
    if (cleanPin.length < 3) {
      setError('Passcode must be at least 3 characters');
      return;
    }
    onJoin(cleanPin);
  };

  const handleQuickJoin = (type: string) => {
    // Generate a quick random passcode if they want one
    const randomPin = Math.random().toString(36).substring(2, 7);
    setPin(randomPin);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4" id="room-selector-container">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
        <div className="flex justify-center mb-6" id="logo-icon">
          <div className="p-4 bg-slate-50 text-slate-800 rounded-2xl border border-slate-100">
            <Radio className="w-8 h-8 animate-pulse text-slate-800" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 font-sans">
            Local Music Sync
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Push music from your phone and play it instantly on your PC or laptop.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="passcode-input" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Enter Secret Room PIN / Word
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                id="passcode-input"
                type="text"
                autoComplete="off"
                placeholder="e.g. adammusic or 7854"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 text-gray-900 border border-transparent rounded-2xl focus:border-slate-800 focus:bg-white focus:outline-none transition-all text-center font-medium tracking-wide placeholder-gray-400"
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-1.5 text-center">{error}</p>}
          </div>

          <button
            id="join-room-btn"
            type="submit"
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-2xl shadow-sm hover:shadow transition-all duration-200"
          >
            Connect & Create Room
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="flex-shrink mx-4 text-xs text-gray-400 uppercase tracking-wider font-semibold">How it works</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center mt-2">
          <div className="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
            <Smartphone className="w-5 h-5 mx-auto text-gray-600 mb-2" />
            <span className="block text-xs font-semibold text-gray-700">1. Phone</span>
            <span className="text-[10px] text-gray-500 block mt-1">Enter PIN, select & upload audio.</span>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all">
            <Monitor className="w-5 h-5 mx-auto text-gray-600 mb-2" />
            <span className="block text-xs font-semibold text-gray-700">2. Laptop</span>
            <span className="text-[10px] text-gray-500 block mt-1">Enter same PIN, open player.</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => handleQuickJoin('random')}
            className="text-xs text-gray-500 hover:text-gray-900 font-medium underline underline-offset-4"
          >
            Generate a random passcode
          </button>
        </div>
      </div>
    </div>
  );
}
