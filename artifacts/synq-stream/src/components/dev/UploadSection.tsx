import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Globe, Lock, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  saveVideo,
  uploadFileToCloud,
  getAllVideos,
  type VideoRecord,
  type VideoVisibility,
} from '@/lib/db';
import { useStore } from '@/lib/store';

export function UploadSection() {
  const { devSession, setVideos } = useStore();
  const { toast } = useToast();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoLocalUrl, setVideoLocalUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);

  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbLocalUrl, setThumbLocalUrl] = useState<string>('');

  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [password, setPassword] = useState('');

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState('');

  const localUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      localUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const { getRootProps: getVideoProps, getInputProps: getVideoInputProps, isDragActive: isVideoDrag } = useDropzone({
    accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.m4v'] },
    maxFiles: 1,
    onDrop: (accepted) => {
      const file = accepted[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      localUrlsRef.current.push(url);
      setVideoFile(file);
      setVideoLocalUrl(url);
      setTitle((t) => t || file.name.replace(/\.[^/.]+$/, ''));
    },
  });

  const { getRootProps: getThumbProps, getInputProps: getThumbInputProps, isDragActive: isThumbDrag } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    onDrop: (accepted) => {
      const file = accepted[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      localUrlsRef.current.push(url);
      setThumbFile(file);
      setThumbLocalUrl(url);
    },
  });

  useEffect(() => {
    if (!videoLocalUrl) return;
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => setVideoDuration(v.duration);
    v.src = videoLocalUrl;
  }, [videoLocalUrl]);

  async function extractAutoThumbnail(): Promise<string> {
    return new Promise((resolve) => {
      if (!videoLocalUrl || !videoDuration) return resolve('');
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoLocalUrl;
      video.currentTime = videoDuration * 0.1;
      const onSeeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch {
          resolve('');
        }
      };
      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('error', () => resolve(''), { once: true });
    });
  }

  const reset = () => {
    setUploading(false);
    setProgress(0);
    setStatusLabel('');
    setVideoFile(null);
    setVideoLocalUrl('');
    setVideoDuration(0);
    setThumbFile(null);
    setThumbLocalUrl('');
    setTitle('');
    setVisibility('public');
    setPassword('');
  };

  const handleUpload = async () => {
    if (!videoFile || !title || !devSession) return;
    if (visibility === 'password' && !password.trim()) {
      toast({ description: 'Enter a password for password-protected videos.' });
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatusLabel('Uploading video to cloud...');

    try {
      const videoPath = await uploadFileToCloud(videoFile, (pct) => {
        setProgress(pct * 0.85);
      });

      let thumbnailPath = '';
      let thumbnailDataUrl: string | undefined;
      let autoExtracted = false;

      setStatusLabel('Processing thumbnail...');
      if (thumbFile) {
        thumbnailPath = await uploadFileToCloud(thumbFile, (pct) => {
          setProgress(85 + pct * 0.1);
        });
      } else {
        autoExtracted = true;
        const dataUrl = await extractAutoThumbnail();
        thumbnailDataUrl = dataUrl || undefined;
      }

      setProgress(95);
      setStatusLabel('Saving metadata...');

      const id = crypto.randomUUID();
      const newVideo: VideoRecord = {
        id,
        title,
        uploadedBy: devSession.adminName,
        uploadedAt: new Date().toISOString(),
        duration: videoDuration || 0,
        viewCount: 0,
        watchTimeSeconds: 0,
        trafficSources: { direct: 0, search: 0, embedded: 0, referral: 0, unknown: 0 },
        ownershipHistory: [],
        thumbnailIsAutoExtracted: autoExtracted,
        dailyViews: {},
        dropOffBuckets: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
        videoPath,
        thumbnailPath,
        thumbnailDataUrl,
        visibility,
        hasPassword: visibility === 'password',
        sourceUrl: '',
        thumbnailUrl: '',
      };

      await saveVideo(newVideo, visibility === 'password' ? password : undefined);

      setProgress(100);
      setStatusLabel('Done');
      const refreshed = await getAllVideos(true);
      setVideos(refreshed);
      toast({ description: 'Video uploaded to cloud successfully.' });
      setTimeout(reset, 600);
    } catch (err) {
      console.error(err);
      toast({ description: `Upload failed: ${err instanceof Error ? err.message : 'unknown error'}` });
      setUploading(false);
      setProgress(0);
      setStatusLabel('');
    }
  };

  const VisibilityChip = ({
    value,
    label,
    icon: Icon,
    description,
  }: {
    value: VideoVisibility;
    label: string;
    icon: typeof Globe;
    description: string;
  }) => (
    <button
      type="button"
      onClick={() => setVisibility(value)}
      disabled={uploading}
      className={`flex-1 flex flex-col items-start gap-1 px-3 py-3 rounded-md border text-left transition-colors ${
        visibility === value
          ? 'border-accent/50 bg-accent/5'
          : 'border-border hover:bg-card/80'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${visibility === value ? 'text-accent' : 'text-muted-foreground'}`} />
        <span className={`text-[12px] font-medium ${visibility === value ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{description}</span>
    </button>
  );

  return (
    <div className="border rounded-[12px] bg-card p-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Video Drop */}
        <div
          {...getVideoProps()}
          className={`col-span-1 md:col-span-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[200px]
            ${isVideoDrag ? 'border-accent bg-accent/5' : 'border-border hover:bg-card/80'}
            ${videoFile ? 'border-solid border-accent/30' : ''}
          `}
        >
          <input {...getVideoInputProps()} />
          {videoFile ? (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-accent mb-2" />
              <p className="text-[13px] font-medium text-foreground">{videoFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • {videoDuration > 0 ? `${Math.round(videoDuration)}s` : 'Detecting...'}
              </p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mb-4" />
              <p className="text-[13px] font-medium text-foreground mb-1">Drop your video here</p>
              <p className="text-[11px] text-muted-foreground">MP4, WebM, MOV — uploaded directly to cloud storage</p>
            </>
          )}
        </div>

        {/* Thumb Drop */}
        <div
          {...getThumbProps()}
          className={`col-span-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[200px] relative overflow-hidden
            ${isThumbDrag ? 'border-accent bg-accent/5' : 'border-border hover:bg-card/80'}
          `}
        >
          <input {...getThumbInputProps()} />
          {thumbLocalUrl ? (
            <img src={thumbLocalUrl} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <>
              <p className="text-[13px] font-medium text-foreground mb-1">
                Thumbnail <span className="text-muted-foreground">(optional)</span>
              </p>
              <p className="text-[11px] text-muted-foreground">JPG, PNG, WebP</p>
              <p className="text-[10px] text-muted-foreground/60 mt-4 italic">Will be auto-extracted if empty</p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 mt-2">
        <label className="text-[12px] font-medium text-foreground">Visibility</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <VisibilityChip value="public" label="Public" icon={Globe} description="Anyone can watch and discover." />
          <VisibilityChip value="password" label="Password" icon={KeyRound} description="Listed, but requires a password to play." />
          <VisibilityChip value="private" label="Private (only me)" icon={Lock} description="Only visible in Dev Mode." />
        </div>
        {visibility === 'password' && (
          <Input
            type="text"
            placeholder="Set password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={uploading}
            className="font-mono text-[12px] mt-1"
          />
        )}
      </div>

      <div className="flex gap-4 items-end mt-2">
        <div className="flex-1 space-y-2">
          <label className="text-[12px] font-medium text-foreground">Video Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title..."
            disabled={uploading}
          />
        </div>
        <Button
          onClick={handleUpload}
          disabled={!videoFile || !title || uploading || (visibility === 'password' && !password.trim())}
          className="w-[160px]"
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </div>

      {uploading && (
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>{statusLabel}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
