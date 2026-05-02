import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VideoRecord } from '@/lib/db';

export function EmbedModal({ video, open, onOpenChange }: { video: VideoRecord; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const embedUrl = `${baseUrl}embed/${video.id}`;
  const thumbUrl = `${baseUrl}thumb/${video.id}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: 'Copied to clipboard' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Embed Video</DialogTitle>
          <DialogDescription>
            Use these URLs to embed the video or thumbnail externally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Video Embed URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-[11px] font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                {embedUrl}
              </code>
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(embedUrl)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Thumbnail Embed URL <span className="text-muted-foreground font-normal">(Optional — useful for OG meta tags)</span></label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-[11px] font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                {thumbUrl}
              </code>
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(thumbUrl)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
