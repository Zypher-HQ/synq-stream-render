import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { useStore } from '@/lib/store';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { incrementViewCount, getAllVideos, requestVideoAccess, type VideoRecord } from '@/lib/db';
import { Lock, KeyRound, Loader2 } from 'lucide-react';

export default function Embed() {
  const { videoId } = useParams<{ videoId: string }>();
  const { videos, setVideos, devSession } = useStore();
  const incrementedRef = useRef(false);

  const baseVideo = videos.find((v) => v.id === videoId);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseVideo) return;
    setResolvedUrl('');
    setError(null);
    if (baseVideo.visibility === 'public') {
      setResolvedUrl(baseVideo.sourceUrl);
    } else if (baseVideo.visibility === 'private' && devSession) {
      requestVideoAccess(baseVideo.id, undefined, true).then((r) => {
        if (r.ok && r.videoUrl) setResolvedUrl(r.videoUrl);
        else setError(r.error || 'Access denied');
      });
    } else if (baseVideo.visibility === 'private') {
      setError('Private video');
    } else if (baseVideo.visibility === 'password') {
      setError('Password-protected — open in Synq Stream to unlock');
    }
  }, [baseVideo?.id, baseVideo?.visibility, devSession]);

  useEffect(() => {
    if (!videoId || incrementedRef.current || !resolvedUrl) return;
    incrementedRef.current = true;
    incrementViewCount(videoId, 'embedded').then(() => {
      getAllVideos(!!devSession).then(setVideos).catch(() => undefined);
    });
  }, [videoId, resolvedUrl, devSession, setVideos]);

  if (!baseVideo) {
    return <div className="p-8 bg-black min-h-screen text-white flex items-center justify-center text-[13px]">Video not found</div>;
  }

  if (error) {
    return (
      <div className="w-full h-[100dvh] bg-black flex flex-col items-center justify-center gap-3 text-white">
        {baseVideo.visibility === 'private' ? <Lock className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
        <p className="text-[12px] opacity-70 text-center max-w-xs">{error}</p>
      </div>
    );
  }

  if (!resolvedUrl) {
    return (
      <div className="w-full h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  const playable: VideoRecord = { ...baseVideo, sourceUrl: resolvedUrl };

  return (
    <div className="w-full h-[100dvh] bg-black">
      <VideoPlayer video={playable} autoPlay />
    </div>
  );
}
