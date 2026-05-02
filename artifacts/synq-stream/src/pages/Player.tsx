import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'wouter';
import { ChevronLeft, KeyRound, Lock, Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { incrementViewCount, getAllVideos, requestVideoAccess, type VideoRecord } from '@/lib/db';
import { formatRelativeDate, formatViewCount } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Player() {
  const { videoId } = useParams<{ videoId: string }>();
  const { videos, setVideos, devSession } = useStore();
  const incrementedRef = useRef(false);

  const baseVideo = videos.find((v) => v.id === videoId);

  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!baseVideo) return;
    setResolvedUrl('');
    setAccessError(null);
    setNeedsPassword(false);

    if (baseVideo.visibility === 'public') {
      setResolvedUrl(baseVideo.sourceUrl);
      return;
    }
    if (baseVideo.visibility === 'private' && devSession) {
      if (baseVideo.sourceUrl) {
        setResolvedUrl(baseVideo.sourceUrl);
      } else {
        requestVideoAccess(baseVideo.id, undefined, true).then((r) => {
          if (r.ok && r.videoUrl) setResolvedUrl(r.videoUrl);
          else setAccessError(r.error || 'Cannot load private video');
        });
      }
      return;
    }
    if (baseVideo.visibility === 'private') {
      setAccessError('This video is private. Enter Dev Mode to view it.');
      return;
    }
    if (baseVideo.visibility === 'password') {
      if (devSession) {
        requestVideoAccess(baseVideo.id, undefined, true).then((r) => {
          if (r.ok && r.videoUrl) setResolvedUrl(r.videoUrl);
          else setNeedsPassword(true);
        });
      } else {
        setNeedsPassword(true);
      }
    }
  }, [baseVideo?.id, baseVideo?.visibility, devSession]);

  useEffect(() => {
    if (!videoId || incrementedRef.current || !resolvedUrl) return;
    incrementedRef.current = true;
    incrementViewCount(videoId, 'direct').then(() => {
      getAllVideos(!!devSession).then(setVideos).catch(() => undefined);
    });
  }, [videoId, resolvedUrl, devSession, setVideos]);

  if (!baseVideo) {
    return <div className="p-8 pt-24 text-center text-muted-foreground">Video not found.</div>;
  }

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setVerifying(true);
    setAccessError(null);
    const r = await requestVideoAccess(baseVideo.id, password.trim(), !!devSession);
    setVerifying(false);
    if (r.ok && r.videoUrl) {
      setResolvedUrl(r.videoUrl);
      setNeedsPassword(false);
    } else {
      setAccessError(r.error || 'Incorrect password');
    }
  };

  const playable: VideoRecord | null = resolvedUrl
    ? { ...baseVideo, sourceUrl: resolvedUrl }
    : null;

  return (
    <div className="w-full flex flex-col min-h-screen pt-[52px]">
      <div className="h-[44px] flex items-center px-4 border-b">
        <Link href="/" className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="flex-1 w-full max-w-[900px] mx-auto p-4 md:p-8 flex flex-col">
        {playable ? (
          <VideoPlayer video={playable} autoPlay />
        ) : needsPassword ? (
          <div className="aspect-video w-full rounded-[14px] bg-card border border-border flex items-center justify-center">
            <form onSubmit={handleSubmitPassword} className="flex flex-col items-center gap-4 max-w-sm w-full px-6">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-accent" />
              </div>
              <div className="text-center">
                <h3 className="text-[14px] font-medium text-foreground">Password required</h3>
                <p className="text-[12px] text-muted-foreground mt-1">This video is password-protected.</p>
              </div>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={verifying}
                className="text-center font-mono"
              />
              {accessError && (
                <p className="text-[11px] text-destructive">{accessError}</p>
              )}
              <Button type="submit" disabled={verifying || !password.trim()} className="w-full">
                {verifying ? 'Verifying...' : 'Unlock'}
              </Button>
            </form>
          </div>
        ) : accessError ? (
          <div className="aspect-video w-full rounded-[14px] bg-card border border-border flex flex-col items-center justify-center gap-3">
            <Lock className="w-8 h-8 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground text-center max-w-xs">{accessError}</p>
          </div>
        ) : (
          <div className="aspect-video w-full rounded-[14px] bg-black/40 border border-border flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <h1 className="text-xl font-medium tracking-tight text-foreground">{baseVideo.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-accent/10 text-accent text-[11px] font-medium uppercase tracking-wide">
              {baseVideo.uploadedBy}
            </span>
            {baseVideo.visibility !== 'public' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-muted text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                {baseVideo.visibility === 'private' ? <Lock className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                {baseVideo.visibility === 'private' ? 'Private' : 'Password'}
              </span>
            )}
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="font-mono">{formatViewCount(baseVideo.viewCount)}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span>{formatRelativeDate(baseVideo.uploadedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
