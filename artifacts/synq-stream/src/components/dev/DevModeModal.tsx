import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';
import { useStore } from '@/lib/store';

export function DevModeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [, setLocation] = useLocation();
  const [adminName, setAdminName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const { admins, setDevSession, failedAttempts, incrementFailedAttempts, resetFailedAttempts, lockoutUntil, setLockoutUntil } = useStore();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!lockoutUntil) {
      setTimeLeft(0);
      return;
    }
    const target = parseInt(lockoutUntil, 10);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      if (remaining <= 0) {
        resetFailedAttempts();
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil, resetFailedAttempts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeft > 0) return;

    const admin = admins.find((a) => a.name === adminName.toUpperCase());
    if (!admin || passcode !== '110312') {
      setError('Invalid admin name or passcode');
      incrementFailedAttempts();
      if (failedAttempts + 1 >= 7) {
        setLockoutUntil((Date.now() + 2 * 60 * 1000).toString());
      }
      return;
    }

    resetFailedAttempts();
    setError('');
    setAdminName('');
    setPasscode('');
    setDevSession({ adminName: admin.name, sessionStart: new Date().toISOString() });
    onOpenChange(false);
    setLocation('/dev');
  };

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-8 rounded-[20px] bg-card border-border/50">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl font-medium tracking-tight">
            <Lock className="w-5 h-5 text-accent" />
            Dev Mode
          </DialogTitle>
          <DialogDescription className="text-center text-[13px]">
            Admin access only
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="Admin Name"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value.toUpperCase())}
              disabled={timeLeft > 0}
              className="h-11 font-mono uppercase bg-background"
            />
            <Input
              type="password"
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              disabled={timeLeft > 0}
              className="h-11 bg-background"
            />
          </div>

          {error && !timeLeft && (
            <div className="text-[12px] text-destructive text-center font-medium">
              {error}
            </div>
          )}

          {timeLeft > 0 && (
            <div className="text-[12px] text-amber-500 text-center font-medium">
              Too many attempts. Try again in {formatTimeLeft(timeLeft)}.
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 text-[14px] font-medium mt-2"
            disabled={timeLeft > 0 || !adminName || !passcode}
          >
            Enter Dev Mode
          </Button>

          <div className="text-center mt-4">
            <button 
              type="button" 
              onClick={() => onOpenChange(false)}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
