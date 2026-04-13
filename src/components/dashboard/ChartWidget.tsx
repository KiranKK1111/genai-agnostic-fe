/**
 * ChartWidget — MicroStrategy-style chart with colored header strip.
 *
 * Header colors rotate: blue → green → amber → purple for visual distinction.
 * Uses ECharts (echarts-for-react) as the rendering engine.
 */
import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import ReactECharts from 'echarts-for-react';

const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#4f46e5', '#059669'];
const DARK_PALETTE = ['#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#22d3ee', '#f87171', '#818cf8', '#34d399'];

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
  data: { period?: string; category?: string; count: number;[k: string]: any }[];
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

  const fmtLabel = (v: string) => {
    if (!v) return '';
    const m = v.match(/^(\d{4})-(\d{2})$/);
    if (m) {
      const mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${mn[+m[2] - 1]}-${m[1].slice(2)}`;
    }
    return v.length > 16 ? v.slice(0, 14) + '..' : v;
  };

  /* ── ECharts option ── */
  const option = useMemo(() => {
    if (!trimmedData.length) return null;

    const textColor = isDark ? '#ffffff' : '#212529';
    const axisLineColor = isDark ? '#333' : '#ced4da';
    const splitLineColor = isDark ? 'rgba(100,116,139,0.15)' : '#e9ecef';
    const axisLabelColor = isDark ? '#999' : '#777';

    if (isPie) {
      // Pie chart
      const pieData = trimmedData.map((d, i) => ({
        name: String(d[xKey] ?? ''),
        value: Number(d.count) || 0,
        itemStyle: { color: colors[i % colors.length] },
      }));

      return {
        tooltip: {
          trigger: 'item' as const,
          formatter: (params: any): string =>
            `<strong>${fmtLabel(params.name)}</strong><br/>${params.seriesName}: ${params.value.toLocaleString()} (${params.percent}%)`,
          backgroundColor: isDark ? '#1e1e1e' : '#fff',
          borderColor: isDark ? '#333' : '#dee2e6',
          borderWidth: 1,
          textStyle: { color: textColor, fontSize: 12 },
          extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.15);',
        },
        legend: {
          bottom: 0,
          left: 'center',
          type: 'scroll' as const,
          textStyle: { fontSize: 10, color: axisLabelColor },
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 8,
        },
        series: [
          {
            name: title,
            type: 'pie' as const,
            radius: '60%',
            center: ['50%', '42%'],
            data: pieData,
            itemStyle: {
              borderColor: isDark ? '#1a1a1a' : '#fff',
              borderWidth: 1.5,
              borderRadius: 3,
            },
            label: {
              show: true,
              formatter: (params: any) => `${fmtLabel(params.name)} ${params.percent}%`,
              fontSize: 9,
              color: axisLabelColor,
            },
            labelLine: {
              show: true,
              length: 6,
              length2: 6,
              lineStyle: { color: isDark ? '#555' : '#adb5bd' },
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0,0,0,0.3)',
              },
            },
          },
        ],
      };
    }

    // Bar chart
    const categories = trimmedData.map((d) => fmtLabel(String(d[xKey] ?? '')));
    const values = trimmedData.map((d) => Number(d.count) || 0);

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (params: any): string => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<strong>${p.name}</strong><br/>count: ${p.value.toLocaleString()}`;
        },
        backgroundColor: isDark ? '#1e1e1e' : '#fff',
        borderColor: isDark ? '#333' : '#dee2e6',
        borderWidth: 1,
        textStyle: { color: textColor, fontSize: 12 },
        extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.15);',
      },
      grid: { top: 24, right: 12, bottom: 52, left: 40, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: categories,
        axisLine: { lineStyle: { color: axisLineColor } },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 9,
          color: axisLabelColor,
          rotate: 45,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 9, color: axisLabelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' as const } },
      },
      series: [
        {
          name: 'count',
          type: 'bar' as const,
          data: values,
          itemStyle: {
            color: barColor,
            borderRadius: [3, 3, 0, 0],
          },
          barMaxWidth: 32,
          label: {
            show: true,
            position: 'top' as const,
            fontSize: 9,
            fontWeight: 700,
            color: axisLabelColor,
          },
        },
      ],
    };
  }, [trimmedData, isPie, isDark, colors, barColor, title, xKey]);

  if (!trimmedData.length) {
    return (
      <Box sx={{ border: `1px solid ${borderColor}`, height, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 1.5, py: 0.5, background: hdr.bg, borderBottom: `1px solid ${borderColor}` }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.74rem', color: hdr.text }}>{title}</Typography>
        </Box>
        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: isDark ? '#1a1a1a' : '#fafbfc', px: 2,
        }}>
          <Typography sx={{ fontSize: '0.78rem', color: isDark ? '#777' : '#868e96', fontStyle: 'italic', textAlign: 'center' }}>
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
        <Typography sx={{
          fontWeight: 700, fontSize: '0.74rem', color: hdr.text,
          flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </Typography>
      </Box>

      {/* ── Chart ── */}
      <Box sx={{ flex: 1, px: 0.5, py: 0.5, minHeight: 0 }}>
        {option && (
          <ReactECharts
            option={option}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge
          />
        )}
      </Box>
    </Box>
  );
};
