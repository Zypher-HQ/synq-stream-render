import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/lib/store';
import { saveVideo, getAllVideos } from '@/lib/db';
import { UploadSection } from '@/components/dev/UploadSection';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DevPanel() {
  const [, setLocation] = useLocation();
  const { devSession, setDevSession, videos, setVideos, admins, addAdmin, removeAdmin, profileSwitchRequests, removeProfileSwitchRequest } = useStore();
  const { toast } = useToast();

  const [newAdminName, setNewAdminName] = useState('');

  useEffect(() => {
    if (!devSession) {
      setLocation('/');
    }
  }, [devSession, setLocation]);

  if (!devSession) return null;

  const totalViews = videos.reduce((acc, v) => acc + v.viewCount, 0);
  const totalWatchTime = videos.reduce((acc, v) => acc + v.watchTimeSeconds, 0);
  const totalUploads = videos.length;
  const currentWatching = videos.filter((v) => v.viewCount > 0).length;
  
  const h = Math.floor(totalWatchTime / 3600);
  const m = Math.floor((totalWatchTime % 3600) / 60);

  const trafficSums = videos.reduce((acc, v) => {
    acc.direct += v.trafficSources.direct || 0;
    acc.search += v.trafficSources.search || 0;
    acc.embedded += v.trafficSources.embedded || 0;
    acc.referral += v.trafficSources.referral || 0;
    acc.unknown += v.trafficSources.unknown || 0;
    return acc;
  }, { direct: 0, search: 0, embedded: 0, referral: 0, unknown: 0 });

  const totalTraffic = Object.values(trafficSums).reduce((a, b) => a + b, 0);
  const trafficChartData = useMemo(() => {
    return [
      { name: 'Direct', value: trafficSums.direct },
      { name: 'Search', value: trafficSums.search },
      { name: 'Embedded', value: trafficSums.embedded },
      { name: 'Referral', value: trafficSums.referral },
      { name: 'Unknown', value: trafficSums.unknown },
    ];
  }, [trafficSums.direct, trafficSums.search, trafficSums.embedded, trafficSums.referral, trafficSums.unknown]);

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminName && !admins.some(a => a.name === newAdminName)) {
      addAdmin(newAdminName);
      setNewAdminName('');
      toast({ description: 'Admin added.' });
    }
  };

  const handleApproveTransfer = async (req: typeof profileSwitchRequests[0]) => {
    const video = videos.find(v => v.id === req.videoId);
    if (video) {
      video.uploadedBy = req.requestedOwner;
      video.ownershipHistory.push({ from: req.currentOwner, to: req.requestedOwner, at: new Date().toISOString() });
      await saveVideo(video);
      setVideos(await getAllVideos());
      removeProfileSwitchRequest(req.videoId, req.requestedOwner);
      toast({ description: 'Ownership transfer approved.' });
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen pt-[52px] pb-12">
      
      {/* Header */}
      <div className="h-[44px] flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
          <span className="text-[14px] font-medium tracking-wide">DEV PANEL</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">{devSession.adminName}</span>
          <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => setDevSession(null)}>Exit Dev Mode</Button>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mx-auto p-6 space-y-8">
        
        {/* Metric Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title="Total Views" value={totalViews.toString()} subline={`across ${videos.length} videos`} />
          <Card title="Videos Uploaded" value={totalUploads.toString()} subline="in your library" />
          <Card title="Currently Watching" value={currentWatching.toString()} subline="active player sessions" pulse />
          <Card title="Total Watch Time" value={`${h}h ${m}m`} subline="all time accumulation" />
        </section>

        {/* Upload Section */}
        <section>
          <h3 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Upload Video</h3>
          <UploadSection />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Traffic Tracker */}
          <section>
            <h3 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Traffic Tracker</h3>
            <div className="border rounded-[12px] bg-card overflow-hidden">
              <table className="w-full text-[13px] text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium text-right w-24">Views</th>
                    <th className="px-4 py-3 font-medium w-32">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(trafficSums).sort((a,b)=>b[1]-a[1]).map(([source, val]) => {
                    const pct = totalTraffic > 0 ? (val / totalTraffic) * 100 : 0;
                    return (
                      <tr key={source}>
                        <td className="px-4 py-3 capitalize">{source}</td>
                        <td className="px-4 py-3 font-mono text-right">{val}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] w-8">{pct.toFixed(0)}%</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 border rounded-[12px] bg-card p-4">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficChartData}>
                    <defs>
                      <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-mono)' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" fill="url(#trafficFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Admin Manager */}
          <section className="flex flex-col gap-8">
            <div>
              <h3 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Admin Roster</h3>
              <div className="border rounded-[12px] bg-card p-4 space-y-4">
                <div className="space-y-3">
                  {admins.map(admin => (
                    <div key={admin.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border bg-card flex items-center justify-center">
                          <span className="font-mono text-[11px] font-medium text-accent">{admin.name.slice(0,2)}</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium">{admin.name}</span>
                            {admin.name === devSession.adminName && (
                              <span className="text-[9px] uppercase tracking-wider bg-accent/10 text-accent px-1.5 py-0.5 rounded-sm">You</span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">Added {new Date(admin.addedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {!admin.isDefault && admin.name !== devSession.adminName && (
                        <button onClick={() => removeAdmin(admin.name)} className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddAdmin} className="pt-4 border-t flex gap-2">
                  <Input 
                    placeholder="New admin name..." 
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value.toUpperCase())}
                    className="h-8 text-[12px] uppercase font-mono"
                  />
                  <Button type="submit" size="sm" className="h-8">Add</Button>
                </form>
              </div>
            </div>

            {/* Profile Switch Requests */}
            <div>
              <h3 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Pending Transfers</h3>
              <div className="border rounded-[12px] bg-card overflow-hidden">
                {profileSwitchRequests.length === 0 ? (
                  <div className="p-6 text-center text-[13px] text-muted-foreground">
                    No pending transfer requests.
                  </div>
                ) : (
                  <div className="divide-y">
                    {profileSwitchRequests.map((req, i) => (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-[13px] font-medium line-clamp-1">{req.title}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {req.currentOwner} &rarr; <span className="text-accent">{req.requestedOwner}</span>
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => removeProfileSwitchRequest(req.videoId, req.requestedOwner)}>Deny</Button>
                          <Button size="sm" className="h-7 text-[11px]" onClick={() => handleApproveTransfer(req)}>Approve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}

function Card({ title, value, subline, pulse }: { title: string, value: string, subline: string, pulse?: boolean }) {
  return (
    <div className="border rounded-[12px] bg-card p-5 flex flex-col justify-between h-[120px]">
      <div className="flex items-center gap-2">
        {pulse && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />}
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{title}</span>
      </div>
      <div className="flex flex-col gap-1 mt-auto">
        <span className="text-2xl font-mono text-foreground">{value}</span>
        <span className="text-[11px] text-muted-foreground">{subline}</span>
      </div>
    </div>
  );
}
