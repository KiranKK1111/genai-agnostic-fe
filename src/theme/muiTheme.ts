import { createTheme, ThemeOptions } from '@mui/material/styles';

const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb', contrastText: '#ffffff' },
          secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#ffffff' },
          background: { default: '#f8fafc', paper: '#ffffff' },
          text: { primary: '#0f172a', secondary: '#475569' },
          divider: 'rgba(226, 232, 240, 0.8)',
        }
      : {
          primary: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb', contrastText: '#ffffff' },
          secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#ffffff' },
          background: { default: '#0d0d0d', paper: '#1a1a1a' },
          text: { primary: '#f1f5f9', secondary: '#cbd5e1' },
          divider: 'rgba(148, 163, 184, 0.2)',
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    // Fluid sizes — slightly smaller on narrow screens, full size on desktop
    h1: { fontWeight: 700, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' },
    h2: { fontWeight: 700, fontSize: 'clamp(1.5rem, 3.5vw, 2rem)' },
    h3: { fontWeight: 600, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' },
    h4: { fontWeight: 600, fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' },
    h5: { fontWeight: 600, fontSize: 'clamp(1rem, 2vw, 1.25rem)' },
    h6: { fontWeight: 600, fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem' },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: 'none',
          // 44px min-height on touch devices (Apple HIG / Material guidance)
          '@media (pointer: coarse)': { minHeight: 44 },
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          // 44×44 minimum on touch devices
          '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 30,
            minHeight: 44,
            '@media (pointer: fine)': { minHeight: 40 },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '@media (pointer: coarse)': { minHeight: 44 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow:
            mode === 'light'
              ? '0 4px 20px rgba(0, 0, 0, 0.08)'
              : '0 4px 20px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          // Full-width dialogs on small phones
          '@media (max-width: 480px)': {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxWidth: '100% !important',
          },
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterTouchDelay: 500,  // delay before tooltip shows on long-press
        leaveTouchDelay: 1500,
      },
    },
  },
});

export const createMuiTheme = (mode: 'light' | 'dark') => {
  return createTheme(getThemeOptions(mode));
};
