import React, { useEffect } from 'react';
import { Navbar } from './Navbar';
import { useStore } from '@/lib/store';

export function Layout({ children }: { children: React.ReactNode }) {
  const { settings } = useStore();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (settings.accentColor) {
      // Need to convert hex to HSL for our tailwind config if we want custom hex.
      // But keeping it simple for now or applying it if supported.
      // E.g., setting a css variable directly.
    }
  }, [settings.theme, settings.accentColor]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground selection:bg-accent/30">
      <Navbar />
      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>
    </div>
  );
}
