/**
 * Visualization Switcher Component
 * Displays chart type selection icons in the top right of the message
 */

import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';

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

  const viewMap: Record<string, { icon: React.ReactElement; label: string }> = {
    table: { icon: <TableChartIcon fontSize={compact ? 'small' : 'medium'} />, label: 'Table' },
    pie: { icon: <PieChartIcon fontSize={compact ? 'small' : 'medium'} />, label: 'Pie Chart' },
    bar: { icon: <BarChartIcon fontSize={compact ? 'small' : 'medium'} />, label: 'Bar Chart' },
    line: { icon: <ShowChartIcon fontSize={compact ? 'small' : 'medium'} />, label: 'Line Chart' },
    scatter: { icon: <ScatterPlotIcon fontSize={compact ? 'small' : 'medium'} />, label: 'Scatter Plot' },
  };

  // Sort views with 'table' first, then others in order
  const sortedViews = [
    'table',
    'pie',
    'bar',
    'line',
    'scatter',
  ].filter(view => availableViews.includes(view));

  if (sortedViews.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: compact ? 0.5 : 1,
        flexDirection: 'row',
      }}
    >
      {sortedViews.map((view) => {
        const mapping = viewMap[view] || { icon: null, label: view };
        const isActive = selectedView === view;

        if (!mapping.icon) return null;

        return (
          <Tooltip key={view} title={mapping.label} placement="top">
            <IconButton
              size={compact ? 'small' : 'medium'}
              onClick={() => onViewChange(view)}
              sx={{
                backgroundColor: isActive
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(59, 130, 246, 0.15)'
                  : 'transparent',
                color: isActive ? 'primary.main' : 'text.secondary',
                borderRadius: 1,
                border: isActive ? `1px solid ${theme.palette.primary.main}` : 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isActive
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(59, 130, 246, 0.4)'
                      : 'rgba(59, 130, 246, 0.2)'
                    : theme.palette.action.hover,
                  transform: 'scale(1.05)',
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
