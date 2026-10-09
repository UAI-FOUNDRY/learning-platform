import React from 'react';

export default function VideoControls({ onPlay, onPause, isPlaying }) {
  return (
    <div className="flex items-center gap-4 bg-gray-800 text-white p-2 text-sm">
      <button onClick={isPlaying ? onPause : onPlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}
