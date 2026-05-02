import React from 'react';
import { useStore } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Settings() {
  const { settings, updateSettings } = useStore();

  const handleThemeChange = (val: string) => {
    updateSettings({ theme: val as 'dark' | 'light' });
  };

  const colorSwatches = [
    { name: 'Slate', value: '#e2e8f0', hex: '220 20% 85%' },
    { name: 'Neutral', value: '#d4d4d4', hex: '0 0% 83%' },
    { name: 'Blue', value: '#93c5fd', hex: '214 84% 78%' },
    { name: 'Indigo', value: '#a5b4fc', hex: '219 96% 82%' },
    { name: 'Mint', value: '#86efac', hex: '161 84% 73%' },
  ];

  const handleColorSelect = (swatch: typeof colorSwatches[0]) => {
    updateSettings({ accentColor: swatch.value });
    document.documentElement.style.setProperty('--accent', swatch.hex);
  };

  return (
    <div className="w-full max-w-[700px] mx-auto p-6 md:p-8 pt-24 space-y-12">
      
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-4">Playback</h2>
        <div className="border rounded-[12px] bg-card divide-y">
          <SettingRow 
            title="Autoplay next video" 
            desc="Automatically play the next video in the queue."
            control={<Switch checked={settings.autoplay} onCheckedChange={(v) => updateSettings({ autoplay: v })} />}
          />
          <SettingRow 
            title="Loop video" 
            desc="Repeat the current video continuously."
            control={<Switch checked={settings.loop} onCheckedChange={(v) => updateSettings({ loop: v })} />}
          />
          <SettingRow 
            title="Default Quality" 
            desc="Preferred resolution for playback."
            control={
              <Select value={settings.quality} onValueChange={(v) => updateSettings({ quality: v })}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="480p">480p</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <SettingRow 
            title="Default Volume" 
            desc="Set the initial volume level."
            control={
              <div className="w-[120px]">
                <Slider value={[settings.volume]} max={100} step={1} onValueChange={([v]) => updateSettings({ volume: v })} />
              </div>
            }
          />
        </div>
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-4">Appearance</h2>
        <div className="border rounded-[12px] bg-card divide-y">
          <SettingRow 
            title="Theme" 
            desc="Select light or dark mode."
            control={
              <Select value={settings.theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <SettingRow 
            title="Accent Color" 
            desc="Choose a primary accent color."
            control={
              <div className="flex gap-2">
                {colorSwatches.map(swatch => (
                  <button 
                    key={swatch.name}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${settings.accentColor === swatch.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: swatch.value }}
                    onClick={() => handleColorSelect(swatch)}
                    title={swatch.name}
                  />
                ))}
              </div>
            }
          />
          <SettingRow 
            title="Compact Cards" 
            desc="Reduce padding on video cards."
            control={<Switch checked={settings.compactCardView} onCheckedChange={(v) => updateSettings({ compactCardView: v })} />}
          />
          <SettingRow 
            title="Show Duration Badge" 
            desc="Display the video length on thumbnails."
            control={<Switch checked={settings.showDurationBadge} onCheckedChange={(v) => updateSettings({ showDurationBadge: v })} />}
          />
          <SettingRow 
            title="Show View Counts" 
            desc="Display the total views on video cards."
            control={<Switch checked={settings.showViewCounts} onCheckedChange={(v) => updateSettings({ showViewCounts: v })} />}
          />
        </div>
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-4">Behavior</h2>
        <div className="border rounded-[12px] bg-card divide-y">
          <SettingRow 
            title="Enable Keyboard Shortcuts" 
            desc="Use Space, Arrows, F, and M for playback control."
            control={<Switch checked={settings.enableShortcuts} onCheckedChange={(v) => updateSettings({ enableShortcuts: v })} />}
          />
          <SettingRow 
            title="Enable Picture-in-Picture" 
            desc="Allow PiP mode if supported by the browser."
            control={<Switch checked={settings.enablePip} onCheckedChange={(v) => updateSettings({ enablePip: v })} />}
          />
          <SettingRow 
            title="Show Buffered Progress" 
            desc="Display loading progress on the timeline."
            control={<Switch checked={settings.showBuffered} onCheckedChange={(v) => updateSettings({ showBuffered: v })} />}
          />
        </div>
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-4">Accessibility</h2>
        <div className="border rounded-[12px] bg-card divide-y">
          <SettingRow 
            title="Reduce Motion" 
            desc="Disable non-essential animations and transitions."
            control={<Switch checked={settings.reduceMotion} onCheckedChange={(v) => updateSettings({ reduceMotion: v })} />}
          />
          <SettingRow 
            title="High Contrast" 
            desc="Increase visibility for text and UI elements."
            control={<Switch checked={settings.highContrast} onCheckedChange={(v) => updateSettings({ highContrast: v })} />}
          />
        </div>
      </section>

    </div>
  );
}

function SettingRow({ title, desc, control }: { title: string; desc: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 h-[72px]">
      <div className="flex flex-col gap-1 pr-4">
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        <span className="text-[11px] text-muted-foreground">{desc}</span>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
