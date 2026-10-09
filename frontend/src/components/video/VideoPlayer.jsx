import React from 'react';

export default function VideoPlayer({ url, onEnded }) {
  return (
    <div className="relative aspect-video bg-black flex items-center justify-center text-white">
      <p className="text-gray-400">Video Player Component</p>
    </div>
  );
}
