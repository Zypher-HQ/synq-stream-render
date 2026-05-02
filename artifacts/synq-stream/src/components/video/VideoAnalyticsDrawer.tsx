import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoRecord } from '@/lib/db';
import { useStore } from '@/lib/store';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';

export function VideoAnalyticsDrawer({ video, open, onOpenChange }: { video: VideoRecord; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { admins, addProfileSwitchRequest, videos } = useStore();
  const { toast } = useToast();
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');

  const viewsData = Object.entries(video.dailyViews || {}).map(([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date));
  
  const platformWatchTime = videos.reduce((acc, v) => acc + v.watchTimeSeconds, 0);
  const platformTotalDuration = videos.reduce((acc, v) => acc + (v.duration * v.viewCount), 0);
  const platformAvgPct = platformTotalDuration > 0 ? Math.round((platformWatchTime / platformTotalDuration) * 100) : 0;
  
  const videoAvgPct = video.viewCount > 0 ? Math.round((video.watchTimeSeconds / (video.duration * video.viewCount)) * 100) : 0;

  const dropOffData = (video.dropOffBuckets || []).map((val, i) => ({ pct: `${(i + 1) * 10}%`, value: val }));
  
  const deviceData = [
    { name: 'Desktop', value: video.deviceBreakdown?.desktop || 0 },
    { name: 'Mobile', value: video.deviceBreakdown?.mobile || 0 },
    { name: 'Tablet', value: video.deviceBreakdown?.tablet || 0 },
  ];
  const COLORS = ['hsl(var(--accent))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  const trafficData = [
    { name: 'Direct', value: video.trafficSources?.direct || 0 },
    { name: 'Search', value: video.trafficSources?.search || 0 },
    { name: 'Embedded', value: video.trafficSources?.embedded || 0 },
    { name: 'Referral', value: video.trafficSources?.referral || 0 },
    { name: 'Unknown', value: video.trafficSources?.unknown || 0 },
  ].sort((a, b) => b.value - a.value);

  const handleTransferRequest = () => {
    if (!selectedAdmin) return;
    addProfileSwitchRequest({
      videoId: video.id,
      title: video.title,
      currentOwner: video.uploadedBy,
      requestedOwner: selectedAdmin
    });
    toast({ description: 'Ownership transfer requested.' });
    setTransferModalOpen(false);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="text-xl">Analytics: {video.title}</DrawerTitle>
          </DrawerHeader>
          <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
            
            <div className="space-y-3">
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Views Over Time</h4>
              <div className="h-[200px] border rounded bg-card/50 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={viewsData}>
                    <XAxis dataKey="date" hide />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--accent))' }} />
                    <Line type="monotone" dataKey="views" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Average Watch Duration</h4>
              <div className="h-[200px] border rounded bg-card/50 p-6 flex flex-col items-center justify-center text-center">
                <div className="text-5xl font-mono text-foreground font-medium">{videoAvgPct}%</div>
                <div className="text-[13px] text-muted-foreground mt-2">vs platform avg {platformAvgPct}%</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Audience Retention</h4>
              <div className="h-[200px] border rounded bg-card/50 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dropOffData}>
                    <XAxis dataKey="pct" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Device Breakdown</h4>
              <div className="h-[200px] border rounded bg-card/50 p-4 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[50%] pl-4 flex flex-col gap-2 justify-center">
                  {deviceData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-mono">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-3">
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Traffic Sources</h4>
              <div className="border rounded bg-card/50 overflow-hidden">
                <table className="w-full text-[13px] text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-2 font-medium">Source</th>
                      <th className="px-4 py-2 font-medium text-right">Views</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {trafficData.map((row) => (
                      <tr key={row.name}>
                        <td className="px-4 py-3">{row.name}</td>
                        <td className="px-4 py-3 font-mono text-right">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 mt-4 pt-6 border-t flex items-center justify-between">
              <div className="text-[13px] text-muted-foreground">
                Uploaded by <span className="font-medium text-foreground">{video.uploadedBy}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTransferModalOpen(true)}>
                Request Ownership Transfer
              </Button>
            </div>
            
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-[13px] font-medium block mb-2">Select new owner</label>
            <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
              <SelectTrigger>
                <SelectValue placeholder="Select admin" />
              </SelectTrigger>
              <SelectContent>
                {admins.filter(a => a.name !== video.uploadedBy).map(admin => (
                  <SelectItem key={admin.name} value={admin.name}>{admin.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
            <Button onClick={handleTransferRequest} disabled={!selectedAdmin}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
