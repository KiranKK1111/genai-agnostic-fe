/**
 * Axis Selector Component
 * Provides x-axis (single select) and y-axis (multi-select) dropdowns for chart configuration.
 */

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';

export interface AxisSelection {
  xAxis: string;
  yAxes: string[];
}

interface AxisSelectorProps {
  columns: string[];
  data: Record<string, any>[];
  selection: AxisSelection;
  onChange: (selection: AxisSelection) => void;
}

/** Detect numeric columns by sampling the first row */
function getNumericColumns(data: Record<string, any>[]): string[] {
  if (!data || data.length === 0) return [];
  const first = data[0];
  return Object.keys(first).filter((k) => {
    const v = first[k];
    return typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== null && typeof v !== 'boolean');
  });
}

function getAllColumns(data: Record<string, any>[]): string[] {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0]);
}

export function AxisSelector({ columns, data, selection, onChange }: AxisSelectorProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const allCols = columns.length > 0 ? columns : getAllColumns(data);
  const numericCols = getNumericColumns(data);

  // With exactly 2 columns the mapping is unambiguous — hide the selector entirely.
  if (allCols.length === 2) return null;

  const selectSx = {
    fontSize: '13px',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3b82f6',
    },
  };

  const labelSx = {
    fontSize: '12px',
    '&.Mui-focused': { color: '#3b82f6' },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        flexWrap: 'wrap',
        mb: 2,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '12px' }}>
        Here's an overview of your data:
      </Typography>

      {/* X-Axis — single select */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel sx={labelSx}>x axis</InputLabel>
        <Select
          value={selection.xAxis}
          label="x axis"
          onChange={(e) => onChange({ ...selection, xAxis: e.target.value })}
          sx={selectSx}
        >
          {allCols.map((col) => (
            <MenuItem key={col} value={col}>
              {col}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Y-Axis — multi select */}
      <FormControl size="small" sx={{ minWidth: 240 }}>
        <InputLabel sx={labelSx}>y axis</InputLabel>
        <Select
          multiple
          value={selection.yAxes}
          label="y axis"
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...selection,
              yAxes: typeof val === 'string' ? val.split(',') : val,
            });
          }}
          renderValue={(selected) => (selected as string[]).join(', ')}
          sx={selectSx}
        >
          {(numericCols.length > 0 ? numericCols : allCols).map((col) => (
            <MenuItem key={col} value={col}>
              <Checkbox checked={selection.yAxes.includes(col)} size="small" />
              <ListItemText primary={col} primaryTypographyProps={{ fontSize: '13px' }} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
