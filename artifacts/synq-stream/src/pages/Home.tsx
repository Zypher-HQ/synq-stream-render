import React from 'react';
import { useStore } from '@/lib/store';
import { VideoCard } from '@/components/video/VideoCard';
import { Film } from 'lucide-react';

export default function Home() {
  const { videos } = useStore();
  const sortedVideos = [...videos].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 md:p-8 pt-24">
      <div className="mb-6">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">All Videos</h2>
      </div>

      {sortedVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No videos yet</h3>
          <p className="text-[13px] text-muted-foreground">Upload your first video in Dev Mode</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
