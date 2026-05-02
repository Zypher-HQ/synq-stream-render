import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTime(seconds: number): string {
  return formatDuration(seconds);
}

export function formatRelativeDate(iso: string): string {
  if (!iso) return '';
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function formatViewCount(n: number): string {
  if (!n) return '0 views';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M views`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K views`;
  return `${n} views`;
}

export function getInitials(name: string): string {
  if (!name) return 'U';
  return name.slice(0, 2).toUpperCase();
}
