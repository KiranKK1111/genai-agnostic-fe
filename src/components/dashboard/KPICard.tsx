/**
 * KPICard — MicroStrategy-style flat KPI cell.
 *
 *   ┌──────────────────────────┐
 *   │ Advisor Review in Prg    │
 *   │ 1             - 75.0%    │
 *   │ Previous Month: 4        │
 *   └──────────────────────────┘
 */
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface KPICardProps {
  label: string;
  value: number | string;
  previousValue?: number;
  color?: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, previousValue }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const numValue = typeof value === 'number' ? value : parseInt(value as string, 10);

  const pctChange =
    previousValue !== undefined && previousValue > 0
      ? ((numValue - previousValue) / previousValue) * 100
      : previousValue === 0 && numValue > 0 ? 100 : null;

  const isUp = pctChange !== null && pctChange > 0;
  const isDown = pctChange !== null && pctChange < 0;
  const isZero = pctChange !== null && pctChange === 0;

  const changeBg = isUp ? (isDark ? '#1a3a1a' : '#d4edda')
    : isDown ? (isDark ? '#3a1a1a' : '#f8d7da')
    : isZero ? (isDark ? '#2a2a2a' : '#e2e8f0') : 'transparent';
  const changeColor = isUp ? (isDark ? '#4ade80' : '#155724')
    : isDown ? (isDark ? '#f87171' : '#721c24')
    : (isDark ? '#999' : '#6c757d');

  return (
    <Box sx={{
      px: { xs: 1, sm: 1.5 }, py: { xs: 0.8, sm: 1 },
      bgcolor: isDark ? '#1a1a1a' : '#fff',
      display: 'flex', flexDirection: 'column', gap: 0.3, minWidth: 0,
    }}>
      <Typography sx={{
        fontWeight: 600, fontSize: { xs: '0.65rem', sm: '0.72rem' },
        color: isDark ? '#999' : '#37474f',
        lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{
          fontWeight: 800, fontSize: { xs: '1.2rem', sm: '1.5rem' },
          color: isDark ? '#e0e0e0' : '#212529',
          lineHeight: 1, fontFeatureSettings: '"tnum"',
        }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        {pctChange !== null && (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center',
            px: 0.7, py: 0.2, borderRadius: '3px', bgcolor: changeBg,
          }}>
            <Typography sx={{
              fontSize: { xs: '0.58rem', sm: '0.65rem' },
              fontWeight: 700, color: changeColor, lineHeight: 1, whiteSpace: 'nowrap',
            }}>
              {isUp ? '+ ' : ''}{pctChange.toFixed(1)}%
            </Typography>
          </Box>
        )}
      </Box>

      {previousValue !== undefined && (
        <Typography sx={{
          fontSize: { xs: '0.55rem', sm: '0.62rem' },
          color: isDark ? '#777' : '#868e96',
          fontWeight: 500, lineHeight: 1, fontStyle: 'italic',
        }}>
          Previous Month: {previousValue.toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};
