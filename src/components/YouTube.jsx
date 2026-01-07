import React from 'react';

export default function YouTube({ videoId, width = 560, height = 315 }) {
  return (
    <iframe
      width={width}
      height={height}
      src={`https://www.youtube.com/embed/${videoId}`}
      title="YouTube video player"
      style={{ border: 0 }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
