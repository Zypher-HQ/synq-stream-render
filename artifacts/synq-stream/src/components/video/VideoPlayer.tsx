import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Check } from 'lucide-react';
import { VideoRecord, addWatchTime } from '@/lib/db';
import { useStore } from '@/lib/store';
import { formatTime } from '@/lib/format';
import logoUrl from '@/assets/synq-stream-logo.webp';

export function VideoPlayer({ video, autoPlay = false }: { video: VideoRecord; autoPlay?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { settings } = useStore();

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(settings.volume / 100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(settings.playbackSpeed);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [playbackRate, volume, isMuted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    if (autoPlay) {
      v.play().catch(() => setIsPlaying(false));
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    
    const handleTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      const now = Date.now();
      const delta = (now - lastTimeUpdateRef.current) / 1000;
      if (delta >= 5 && isPlaying) {
        addWatchTime(video.id, delta);
        lastTimeUpdateRef.current = now;
      }
    };
    
    const handleDurationChange = () => setDuration(v.duration);
    
    const handleProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };

    v.addEventListener('play', handlePlay);
    v.addEventListener('pause', handlePause);
    v.addEventListener('waiting', handleWaiting);
    v.addEventListener('playing', handlePlaying);
    v.addEventListener('timeupdate', handleTimeUpdate);
    v.addEventListener('durationchange', handleDurationChange);
    v.addEventListener('progress', handleProgress);

    return () => {
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('pause', handlePause);
      v.removeEventListener('waiting', handleWaiting);
      v.removeEventListener('playing', handlePlaying);
      v.removeEventListener('timeupdate', handleTimeUpdate);
      v.removeEventListener('durationchange', handleDurationChange);
      v.removeEventListener('progress', handleProgress);
    };
  }, [video.id, autoPlay, isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleInteraction = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setControlsVisible(false);
      }, settings.autoHideDelay * 1000);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const togglePip = () => {
    if (!videoRef.current || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      videoRef.current.requestPictureInPicture();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!settings.enableShortcuts || !videoRef.current) return;
    switch(e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'arrowleft':
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        break;
      case 'arrowright':
        videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
        break;
      case 'arrowup':
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.1));
        break;
      case 'arrowdown':
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.1));
        break;
      case 'f':
        toggleFullscreen();
        break;
      case 'm':
        toggleMute();
        break;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video w-full rounded-[14px] overflow-hidden bg-black shadow-2xl focus:outline-none"
      onMouseMove={handleInteraction}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <video 
        ref={videoRef}
        src={video.sourceUrl}
        poster={video.thumbnailUrl}
        controls={false}
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-contain"
        onClick={togglePlay}
      />

      {/* Center Play Button Overlay */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full backdrop-blur bg-white/10 border border-white/20 flex items-center justify-center transition-colors pointer-events-auto cursor-pointer hover:bg-accent/30" onClick={togglePlay}>
            <Play className="w-8 h-8 text-white ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
        </div>
      )}

      {/* Control Bar */}
      <div 
        className={`absolute inset-x-0 bottom-0 px-4 pb-3 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${(!controlsVisible && isPlaying) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {/* Timeline */}
        <div 
          className="relative h-4 mb-2 flex items-center cursor-pointer group/timeline"
          onClick={handleSeek}
        >
          <div className="absolute inset-x-0 h-[3px] bg-white/15 rounded-full overflow-hidden">
            {settings.showBuffered && (
              <div className="absolute left-0 h-full bg-white/30" style={{ width: `${(buffered / duration) * 100}%` }} />
            )}
            <div className="absolute left-0 h-full bg-accent" style={{ width: `${(currentTime / duration) * 100}%` }} />
          </div>
          <div 
            className="absolute h-3 w-3 bg-white rounded-full scale-0 group-hover/timeline:scale-100 transition-transform shadow-[0_0_8px_hsl(var(--accent))]"
            style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center gap-3">
          {/* Left Cluster */}
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white transition-colors">
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <div className="flex items-center group/volume">
              <button onClick={toggleMute} className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-16 transition-all duration-250 ease-out flex items-center">
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={isMuted ? 0 : volume} 
                  onChange={handleVolumeChange}
                  className="w-14 h-1 cursor-pointer accent-accent"
                />
              </div>
            </div>

            <span className="font-mono text-[11px] text-white/70 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Cluster */}
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <button 
                onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/10 text-white text-[12px] font-medium font-mono"
                aria-label="Playback speed"
              >
                <img src={logoUrl} alt="" className="w-3.5 h-3.5 object-contain opacity-90" />
                <span className="text-white/90">Synq</span>
                <span className="text-white">{playbackRate}x</span>
              </button>
              {speedMenuOpen && (
                <div className="absolute bottom-full mb-2 right-0 bg-black/80 backdrop-blur border border-border rounded-[10px] py-1 min-w-[80px] z-50">
                  {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                    <button
                      key={rate}
                      className={`w-full text-left px-3 py-1.5 text-[12px] font-mono flex items-center justify-between hover:bg-white/10 ${playbackRate === rate ? 'text-accent' : 'text-white'}`}
                      onClick={() => { setPlaybackRate(rate); setSpeedMenuOpen(false); }}
                    >
                      {rate}x
                      {playbackRate === rate && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {settings.enablePip && document.pictureInPictureEnabled && (
              <button onClick={togglePip} className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                <div className="w-4 h-3 border-2 border-current rounded-sm relative">
                  <div className="absolute bottom-0 right-0 w-1.5 h-1 bg-current" />
                </div>
              </button>
            )}

            <button onClick={toggleFullscreen} className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white transition-colors">
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
