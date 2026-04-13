/**
 * Pie Chart Visualization Component
 * Handles many slices gracefully: groups small slices, uses leader lines, and
 * places the legend below on the right so labels don't overlap.
 */

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import { VisualizationWrapper } from '../VisualizationWrapper';

interface PieChartVisualizationProps {
  data: Record<string, any>[];
  variant?: 'pie' | 'donut';
}

export function PieChartVisualization({
  data,
  variant = 'donut',
}: PieChartVisualizationProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);
    if (columns.length === 0) return null;

    // ── Smart column selection ──────────────────────────────────
    // Classify each column as numeric or non-numeric using a sample of rows.
    // A column counts as numeric only if (almost) every sampled value parses
    // as a finite number. This avoids mis-classifying ID-like numeric columns
    // when a better string column (e.g. "status") is available.
    const sampleSize = Math.min(data.length, 25);
    const isNumericCol = (col: string): boolean => {
      let numeric = 0;
      let nonEmpty = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = data[i][col];
        if (v === null || v === undefined || v === '') continue;
        nonEmpty++;
        const n = Number(v);
        if (typeof v === 'boolean') continue;
        if (!isNaN(n) && isFinite(n)) numeric++;
      }
      return nonEmpty > 0 && numeric / nonEmpty >= 0.9;
    };

    const numericCols = columns.filter(isNumericCol);
    const nonNumericCols = columns.filter((c) => !numericCols.includes(c));

    // Category = first non-numeric column (e.g. "status"). Fallback: first column.
    const categoryKey = nonNumericCols[0] || columns[0];
    // Value = first numeric column that isn't the category, but skip ID-shaped
    // columns (names containing "id") when we have another numeric choice.
    const valueCandidates = numericCols.filter((c) => c !== categoryKey);
    const preferredValue = valueCandidates.find((c) => !/\bid\b|_id$|^id$/i.test(c));
    const valueKey = preferredValue || valueCandidates[0] || null;

    // Build pie data. Two cases:
    //   1. We found both a category column and a numeric value column → use as-is.
    //   2. No numeric value column → aggregate by COUNT of rows per category.
    let pieData: { name: string; value: number }[];
    if (valueKey) {
      pieData = data.map((row) => ({
        value: Number(row[valueKey]) || 0,
        name: String(row[categoryKey] ?? ''),
      }));
    } else {
      const counts = new Map<string, number>();
      for (const row of data) {
        const key = String(row[categoryKey] ?? '');
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      pieData = Array.from(counts, ([name, value]) => ({ name, value }));
    }

    pieData = pieData
      .filter((d) => d.name !== '' && d.value > 0)
      .sort((a, b) => b.value - a.value);

    if (pieData.length === 0) return null;

    // If more than 8 slices, group the smallest ones into "Others"
    if (pieData.length > 8) {
      const top = pieData.slice(0, 7);
      const rest = pieData.slice(7);
      const othersValue = rest.reduce((sum, d) => sum + d.value, 0);
      pieData = [...top, { name: `Others (${rest.length})`, value: othersValue }];
    }

    const total = pieData.reduce((s, d) => s + d.value, 0);

    const colors = [
      '#1565c0', '#2e7d32', '#e65100', '#6a1b9a',
      '#00838f', '#c62828', '#4527a0', '#ef6c00',
      '#00695c', '#ad1457', '#283593', '#558b2f',
    ];

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: any) => {
          const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0';
          return `<strong>${params.name}</strong><br/>${params.seriesName}: ${params.value.toLocaleString()} (${pct}%)`;
        },
        backgroundColor: isDark ? '#1a1a1a' : '#fff',
        borderColor: isDark ? '#333' : '#ccc',
        textStyle: { color: isDark ? '#fff' : '#212529', fontSize: 13 },
        extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.15);',
      },
      grid: { containLabel: true },
      legend: {
        type: 'scroll' as const,
        orient: 'vertical' as const,
        left: 10,
        top: 'middle',
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 10,
        textStyle: {
          fontSize: 12,
          color: isDark ? '#ccc' : '#333',
        },
        pageTextStyle: { color: isDark ? '#999' : '#666' },
        pageIconColor: isDark ? '#999' : '#666',
        pageIconInactiveColor: isDark ? '#444' : '#ccc',
      },
      series: [
        {
          name: (valueKey || 'Count').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          type: 'pie' as const,
          radius: variant === 'pie' ? [0, '50%'] : ['25%', '50%'],
          center: ['60%', '50%'],
          data: pieData,
          itemStyle: {
            borderRadius: 6,
            borderColor: isDark ? '#1a1a1a' : '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'outside' as const,
            formatter: (params: any) => {
              const pct = total > 0 ? ((params.value / total) * 100) : 0;
              return `${params.name}\n${pct.toFixed(1)}%`;
            },
            fontSize: 11,
            lineHeight: 14,
            color: isDark ? '#ccc' : '#333',
          },
          labelLine: {
            show: true,
            length: 30,
            length2: 25,
            smooth: false,
            lineStyle: {
              color: isDark ? '#999' : '#666',
              width: 1.5,
            },
          },
          labelLayout: {
            hideOverlap: false,
            moveOverlap: 'shiftY' as const,
          },
          emphasis: {
            label: { show: true, fontSize: 13, fontWeight: 'bold' as const },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
      ],
      color: colors,
    };
  }, [data, isDark]);

  if (!data || data.length === 0) {
    return (
      <VisualizationWrapper>
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No data available to display
        </Typography>
      </VisualizationWrapper>
    );
  }

  if (!option) {
    return (
      <VisualizationWrapper>
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          Unable to render pie chart with this data
        </Typography>
      </VisualizationWrapper>
    );
  }

  return (
    <VisualizationWrapper>
      <Box sx={{ width: '100%' }}>
        <ReactECharts
          option={option}
          style={{ height: 500, width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </Box>
    </VisualizationWrapper>
  );
}
