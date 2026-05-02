import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Play, Lock, KeyRound } from 'lucide-react';
import { VideoRecord } from '@/lib/db';
import { useStore } from '@/lib/store';
import { formatDuration, formatRelativeDate, formatViewCount } from '@/lib/format';
import { EmbedModal } from './EmbedModal';
import { VideoAnalyticsDrawer } from './VideoAnalyticsDrawer';

export function VideoCard({ video }: { video: VideoRecord }) {
  const [, setLocation] = useLocation();
  const { settings, devSession } = useStore();
  const [embedOpen, setEmbedOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const handleClick = () => {
    setLocation(`/watch/${video.id}`);
  };

  return (
    <>
      <div 
        className={`group relative flex flex-col rounded-[12px] border border-border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 shadow-sm ${settings.compactCardView ? '' : 'pb-3'}`}
        onClick={handleClick}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <img 
            src={video.thumbnailUrl || '/fallback.jpg'} 
            alt={video.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Play className="w-5 h-5 text-white ml-1" />
            </div>
          </div>
          
          {settings.showDurationBadge && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-white font-mono text-[11px] font-medium tracking-wide">
              {formatDuration(video.duration)}
            </div>
          )}

          {video.visibility !== 'public' && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-[10px] font-medium uppercase tracking-wide border border-white/10">
              {video.visibility === 'private' ? <Lock className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
              <span>{video.visibility === 'private' ? 'Private' : 'Locked'}</span>
            </div>
          )}

          {devSession && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button 
                onClick={(e) => { e.stopPropagation(); setEmbedOpen(true); }}
                className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-white text-[11px] font-medium hover:bg-black/80"
              >
                Embed
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setAnalyticsOpen(true); }}
                className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-white text-[11px] font-medium hover:bg-black/80"
              >
                Analytics
              </button>
            </div>
          )}
        </div>

        <div className={`flex flex-col ${settings.compactCardView ? 'p-2' : 'px-3 pt-3'}`}>
          <h3 className="text-[13px] font-medium leading-tight line-clamp-2 text-foreground">
            {video.title}
          </h3>
          
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
            {settings.showAdminNameTag && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent text-[10px] font-medium uppercase tracking-wide">
                {video.uploadedBy}
              </span>
            )}
            
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
              {settings.showViewCounts && (
                <>
                  <span>{formatViewCount(video.viewCount)}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                </>
              )}
              <span>{formatRelativeDate(video.uploadedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {devSession && (
        <>
          <EmbedModal 
            video={video} 
            open={embedOpen} 
            onOpenChange={setEmbedOpen} 
          />
          <VideoAnalyticsDrawer 
            video={video} 
            open={analyticsOpen} 
            onOpenChange={setAnalyticsOpen} 
          />
        </>
      )}
    </>
  );
}
