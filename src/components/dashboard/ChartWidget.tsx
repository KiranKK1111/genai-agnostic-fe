/**
 * ChartWidget — MicroStrategy-style chart with colored header strip.
 *
 * Header colors rotate: blue → green → amber/red for visual distinction.
 * Shows "Month" label on the right of the header.
 */
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from 'recharts';

const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#4f46e5', '#059669'];
const DARK_PALETTE = ['#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#22d3ee', '#f87171', '#818cf8', '#34d399'];

/* Each index gets a different colored header — matches MicroStrategy */
const HEADERS_LIGHT = [
  { bg: 'linear-gradient(90deg, #1565c0, #1976d2)', text: '#e3f2fd' },
  { bg: 'linear-gradient(90deg, #2e7d32, #388e3c)', text: '#e8f5e9' },
  { bg: 'linear-gradient(90deg, #e65100, #ef6c00)', text: '#fff3e0' },
  { bg: 'linear-gradient(90deg, #6a1b9a, #7b1fa2)', text: '#f3e5f5' },
];
const HEADERS_DARK = [
  { bg: 'linear-gradient(90deg, #152538, #1a3050)', text: '#93c5fd' },
  { bg: 'linear-gradient(90deg, #1a2e1a, #1e3a1e)', text: '#86efac' },
  { bg: 'linear-gradient(90deg, #2e1e0e, #3a2810)', text: '#fde68a' },
  { bg: 'linear-gradient(90deg, #221533, #2e1e42)', text: '#c4b5fd' },
];

interface ChartWidgetProps {
  title: string;
  data: { period?: string; category?: string; count: number; [k: string]: any }[];
  defaultType?: 'bar' | 'pie';
  height?: number;
  color?: string;
  showToggle?: boolean;
  headerIndex?: number;
  periodSelector?: boolean;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  title, data, defaultType = 'bar', height = 260, color, headerIndex = 0,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const colors = isDark ? DARK_PALETTE : PALETTE;
  const hdr = isDark
    ? HEADERS_DARK[headerIndex % HEADERS_DARK.length]
    : HEADERS_LIGHT[headerIndex % HEADERS_LIGHT.length];

  const borderColor = isDark ? '#333' : '#cfd8dc';
  const trimmedData = data?.length ? data.slice(-18) : [];
  const xKey = trimmedData[0]?.period !== undefined ? 'period' : 'category';
  const barColor = color || colors[headerIndex % colors.length];
  const isPie = defaultType === 'pie';

  const ttStyle = {
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    border: `1px solid ${isDark ? '#333' : '#dee2e6'}`,
    borderRadius: 3, color: isDark ? '#ffffff' : '#212529',
    fontSize: 11, padding: '6px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };
  const axisStyle = { fontSize: 9, fill: isDark ? '#999' : '#777' };

  const fmtLabel = (v: string) => {
    if (!v) return '';
    const m = v.match(/^(\d{4})-(\d{2})$/);
    if (m) {
      const mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${mn[+m[2] - 1]}-${m[1].slice(2)}`;
    }
    return v.length > 16 ? v.slice(0, 14) + '..' : v;
  };

  if (!trimmedData.length) {
    return (
      <Box sx={{ border: `1px solid ${borderColor}`, height, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 1.5, py: 0.5, background: hdr.bg, borderBottom: `1px solid ${borderColor}` }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.74rem', color: hdr.text }}>{title}</Typography>
        </Box>
        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: isDark ? '#1a1a1a' : '#fafbfc',
        }}>
          <Typography sx={{ fontSize: '0.78rem', color: isDark ? '#777' : '#868e96', fontStyle: 'italic' }}>
            No data returned for this view. This might be because the applied filter excludes all data.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{
      border: `1px solid ${borderColor}`,
      bgcolor: isDark ? '#1a1a1a' : '#fff',
      height, display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header ── */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        px: 1.5, py: 0.5, background: hdr.bg,
        borderBottom: `1px solid ${borderColor}`, flexShrink: 0,
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.74rem', color: hdr.text, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </Typography>
      </Box>

      {/* ── Chart ── */}
      <Box sx={{ flex: 1, px: 1, py: 0.5, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          {isPie ? (
            <PieChart>
              <Pie
                data={trimmedData} dataKey="count" nameKey={xKey}
                cx="50%" cy="50%" outerRadius="70%" innerRadius={0}
                label={({ name, percent }: { name: string; percent: number }) =>
                  `${fmtLabel(name)} ${(percent * 100).toFixed(1)}%`
                }
                labelLine={{ stroke: isDark ? '#777' : '#adb5bd', strokeWidth: 1 }}
                fontSize={9} strokeWidth={1.5} stroke={isDark ? '#1a1a1a' : '#fff'}
              >
                {trimmedData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle} labelStyle={{ color: isDark ? '#ffffff' : '#212529' }} itemStyle={{ color: isDark ? '#ffffff' : '#212529' }} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            </PieChart>
          ) : (
            <BarChart data={trimmedData} margin={{ top: 18, right: 5, left: -18, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(100,116,139,0.15)' : '#e9ecef'} vertical={false} />
              <XAxis
                dataKey={xKey} tick={axisStyle} tickFormatter={fmtLabel}
                angle={-45} textAnchor="end" height={50} interval={0}
                axisLine={{ stroke: isDark ? '#333' : '#ced4da' }} tickLine={false}
              />
              <YAxis tick={axisStyle} width={35} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={ttStyle} labelStyle={{ color: isDark ? '#ffffff' : '#212529' }} itemStyle={{ color: isDark ? '#ffffff' : '#212529' }} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={30}>
                {trimmedData.map((_, i) => <Cell key={i} fill={barColor} />)}
                <LabelList
                  dataKey="count" position="top"
                  style={{ fontSize: 8, fontWeight: 700, fill: isDark ? '#999' : '#37474f' }}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};
