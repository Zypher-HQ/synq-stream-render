import React from 'react';
import { useParams } from 'wouter';
import { useStore } from '@/lib/store';

export default function Thumb() {
  const { videoId } = useParams<{ videoId: string }>();
  const { videos } = useStore();
  
  const video = videos.find(v => v.id === videoId);

  if (!video) {
    return <div className="p-8 bg-black min-h-screen" />;
  }

  return (
    <div className="w-full h-[100dvh] bg-black flex items-center justify-center overflow-hidden">
      <img 
        src={video.thumbnailUrl || '/fallback.jpg'} 
        alt={video.title}
        className="max-w-full max-h-screen object-contain"
      />
    </div>
  );
}
