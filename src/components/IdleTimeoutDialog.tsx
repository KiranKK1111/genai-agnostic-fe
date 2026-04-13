import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Idle-timeout watchdog.
 *
 * Listens for user activity (mouse, keyboard, touch, scroll). If the user is
 * idle for IDLE_THRESHOLD_MS the dialog pops up asking them to confirm they
 * want to continue the session. If they ignore the dialog for another
 * GRACE_PERIOD_MS, the session is automatically logged out.
 *
 * Only active while the user is authenticated — mounting is handled by
 * whichever layout renders behind an auth gate.
 */
const IDLE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes of inactivity → pop dialog
const GRACE_PERIOD_MS = 5 * 60 * 1000;    // 5 minutes to click Continue before auto-logout
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
];

export function IdleTimeoutDialog() {
  const { isAuthenticated, logout, refreshSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(GRACE_PERIOD_MS / 1000));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleAutoLogout = useCallback(() => {
    clearAllTimers();
    setOpen(false);
    logout();
  }, [clearAllTimers, logout]);

  const showDialog = useCallback(() => {
    setOpen(true);
    setSecondsLeft(Math.round(GRACE_PERIOD_MS / 1000));

    // Live countdown so the user sees how much time is left
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    // Auto-logout if no response within the grace window
    graceTimerRef.current = setTimeout(handleAutoLogout, GRACE_PERIOD_MS);
  }, [handleAutoLogout]);

  const resetIdleTimer = useCallback(() => {
    // Only bump the idle timer while the dialog is NOT open — once it's
    // showing we want the user to explicitly click Continue.
    if (open) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(showDialog, IDLE_THRESHOLD_MS);
  }, [open, showDialog]);

  // Wire up activity listeners only while authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setOpen(false);
      return;
    }

    resetIdleTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      clearAllTimers();
    };
  }, [isAuthenticated, resetIdleTimer, clearAllTimers]);

  const handleContinue = async () => {
    // Freeze the grace countdown + the auto-logout timer while we await
    // the network refresh — we don't want the user to be signed out
    // mid-refresh.
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    setIsRefreshing(true);
    try {
      const ok = await refreshSession();
      if (!ok) {
        // Refresh token missing / expired → force sign out.
        handleSignOut();
        return;
      }
    } finally {
      setIsRefreshing(false);
    }

    setOpen(false);
    // Re-arm the idle watcher for another full 15-minute window
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(showDialog, IDLE_THRESHOLD_MS);
  };

  const handleSignOut = () => {
    clearAllTimers();
    setOpen(false);
    logout();
  };

  if (!isAuthenticated) return null;

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={(_e, reason) => {
        // Don't let the user dismiss it by clicking outside — force a choice.
        if (reason === 'backdropClick') return;
        handleSignOut();
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
            color: '#fff',
          }}
        >
          <Clock size={18} />
        </Box>
        <Typography component="span" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
          Are you still there?
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          You've been inactive for a while. For your security we'll sign you out
          automatically in <strong>{secondsLeft}s</strong>. Do you want to continue your session?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={handleSignOut}
          disabled={isRefreshing}
          variant="outlined"
          color="inherit"
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Sign out
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isRefreshing}
          variant="contained"
          startIcon={
            isRefreshing ? <CircularProgress size={14} color="inherit" /> : undefined
          }
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            minWidth: 120,
            background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #0a3d8f 0%, #1256a0 100%)' },
          }}
        >
          {isRefreshing ? 'Refreshing…' : 'Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
