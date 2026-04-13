/**
 * Visualization Switcher Component
 * Displays chart type selection icons in the top right of the message.
 * Uses lucide-react icons to match the rest of the app.
 */

import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Table2,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Circle as CircleIcon,
  ScatterChart,
} from 'lucide-react';

interface VisualizationSwitcherProps {
  availableViews: string[];
  selectedView: string;
  onViewChange: (view: string) => void;
  compact?: boolean;
}

export function VisualizationSwitcher({
  availableViews,
  selectedView,
  onViewChange,
  compact = false,
}: VisualizationSwitcherProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const iconSize = compact ? 16 : 18;

  const viewMap: Record<string, { icon: React.ReactElement; label: string }> = {
    table:   { icon: <Table2 size={iconSize} />,         label: 'Table' },
    bar:     { icon: <BarChart3 size={iconSize} />,      label: 'Bar Chart' },
    line:    { icon: <LineChartIcon size={iconSize} />,  label: 'Line Chart' },
    pie:     { icon: <PieChartIcon size={iconSize} />,   label: 'Pie Chart' },
    donut:   { icon: <CircleIcon size={iconSize} />,     label: 'Donut Chart' },
    scatter: { icon: <ScatterChart size={iconSize} />,   label: 'Scatter Plot' },
  };

  // Render order: table → bar → line → pie → donut → scatter
  const sortedViews = ['table', 'bar', 'line', 'pie', 'donut', 'scatter']
    .filter((view) => availableViews.includes(view));

  if (sortedViews.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: compact ? 0.5 : 0.75,
        flexDirection: 'row',
        p: 0.4,
        borderRadius: '8px',
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      }}
    >
      {sortedViews.map((view) => {
        const mapping = viewMap[view];
        if (!mapping) return null;
        const isActive = selectedView === view;

        return (
          <Tooltip key={view} title={mapping.label} placement="top">
            <IconButton
              size={compact ? 'small' : 'medium'}
              onClick={() => onViewChange(view)}
              sx={{
                width: compact ? 28 : 32,
                height: compact ? 28 : 32,
                borderRadius: '6px',
                color: isActive
                  ? '#fff'
                  : (isDark ? '#999' : '#6c757d'),
                background: isActive
                  ? 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)'
                  : 'transparent',
                boxShadow: isActive
                  ? '0 2px 6px rgba(13, 71, 161, 0.35)'
                  : 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  background: isActive
                    ? 'linear-gradient(135deg, #0a3d8f 0%, #1256a0 100%)'
                    : (isDark ? 'rgba(21, 101, 192, 0.15)' : 'rgba(13, 71, 161, 0.08)'),
                  color: isActive ? '#fff' : (isDark ? '#60a5fa' : '#0d47a1'),
                },
              }}
            >
              {mapping.icon}
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
}
