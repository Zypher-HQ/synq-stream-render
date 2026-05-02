import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Link, useLocation } from 'wouter';
import logoUrl from '@/assets/synq-stream-logo.webp';
import { DevModeModal } from '@/components/dev/DevModeModal';

export function Navbar() {
  const [location] = useLocation();
  const [devModalOpen, setDevModalOpen] = useState(false);
  const { devSession } = useStore();
  const isDevMode = !!devSession;

  const isEmbed = location.startsWith('/embed/') || location.startsWith('/thumb/');
  if (isEmbed) return null;

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 h-[52px] bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-6 transition-all">
        
        {/* Left: Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <img src={logoUrl} alt="Synq Stream Logo" className="w-6 h-6 object-contain" />
          <div className="font-medium text-[15px] tracking-tight">
            <span className="text-accent transition-colors">Synq</span>
            <span className="text-foreground transition-colors ml-1">Stream</span>
          </div>
        </Link>

        {/* Center: Tabs */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center h-full">
          <TabLink href="/" label="Home" active={location === '/'} />
          <TabLink href="/settings" label="Settings" active={location === '/settings'} />
          {isDevMode && (
            <TabLink href="/dev" label="Dev Panel" active={location === '/dev'} />
          )}
        </div>

        {/* Right: Dev Mode Pill */}
        <button
          onClick={() => setDevModalOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all duration-200
            ${isDevMode 
              ? 'border-accent/30 bg-accent/5 text-foreground' 
              : 'border-border bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground'
            }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isDevMode ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-muted-foreground/50'}`} />
          Dev Mode
        </button>

      </nav>

      {/* Dev Mode Modal */}
      <DevModeModal open={devModalOpen} onOpenChange={setDevModalOpen} />
    </>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`relative h-full flex items-center px-4 text-[13px] font-medium transition-colors
        ${active ? 'text-foreground bg-card/40' : 'text-muted-foreground hover:text-foreground hover:bg-card/20'}
      `}
    >
      {label}
      {active && (
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-accent" />
      )}
    </Link>
  );
}
