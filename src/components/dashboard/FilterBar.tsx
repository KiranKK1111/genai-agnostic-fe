/**
 * FilterBar — "Report Overview" filter section.
 * Dark theme uses dark grey palette matching sidebar.
 */
import React from 'react';
import { Box, Select, MenuItem, TextField, Typography, useTheme, useMediaQuery } from '@mui/material';

interface FilterBarProps {
  filterOptions: Record<string, string[]>;
  activeFilters: Record<string, string>;
  onFilterChange: (col: string, val: string) => void;
  onClearAll: () => void;
  title?: string;
  reportTitle?: string;
  dateLabel?: string;
  allColumns?: string[];
  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filterOptions, activeFilters, onFilterChange,
  title = 'Report Overview', allColumns, children,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const borderColor = isDark ? '#333' : '#cfd8dc';
  const blueBg = isDark
    ? 'linear-gradient(180deg, #1e1e1e, #252525)'
    : 'linear-gradient(180deg, #1565c0, #1976d2)';
  const inputBg = isDark ? '#1a1a1a' : '#fafafa';

  const dropdownCols = Object.keys(filterOptions);
  const idPatterns = ['case_id', 'entity_id', 'entity_name', 'client_name', 'group_id',
    'memo_reply_id', 'memo_id', 'client_id', 'sector', 'sector_name'];
  const extraCols = (allColumns || [])
    .filter((c) => !dropdownCols.includes(c) && idPatterns.some((p) => c.toLowerCase().includes(p)))
    .slice(0, Math.max(0, 8 - dropdownCols.length));
  const allFilterCols = [...dropdownCols, ...extraCols].slice(0, 10);

  return (
    <Box sx={{ border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
      {/* ── Row 1: Report Overview bar ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: { xs: 1, sm: 1.5 }, py: 0.4,
        background: isDark
          ? 'linear-gradient(90deg, #1a1a1a, #222)'
          : 'linear-gradient(90deg, #0d47a1, #1565c0)',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <Typography sx={{
          fontWeight: 700, fontSize: { xs: '0.72rem', sm: '0.8rem' },
          color: isDark ? '#ccc' : '#fff',
        }}>
          {title}
        </Typography>
      </Box>

      {/* ── Row 2+3: Filters ── */}
      {isMobile ? (
        <Box>
          <Box sx={{
            display: 'flex', flexWrap: 'wrap', gap: 0,
            borderBottom: `1px solid ${borderColor}`,
          }}>
            {allFilterCols.map((col) => {
              const label = col.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              const isDropdown = dropdownCols.includes(col);
              const values = filterOptions[col] || [];
              return (
                <Box key={col} sx={{
                  flex: '1 1 120px', maxWidth: '50%',
                  borderRight: `1px solid ${borderColor}`,
                  borderBottom: `1px solid ${borderColor}`,
                }}>
                  <Box sx={{ px: 0.8, py: 0.3, background: blueBg }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.65rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography>
                  </Box>
                  <Box sx={{ px: 0.4, py: 0.3, bgcolor: inputBg }}>
                    {isDropdown ? renderDropdown(col, values, activeFilters, onFilterChange, isDark, inputBg, borderColor) : renderTextField(col, activeFilters, onFilterChange, isDark, inputBg, borderColor)}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex' }}>
          <Box sx={{
            flex: 1, display: 'flex', minWidth: 0, overflowX: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'transparent transparent',
            '&:hover': { scrollbarColor: `${isDark ? '#444' : '#adb5bd'} transparent` },
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { background: 'transparent', borderRadius: 3 },
            '&:hover::-webkit-scrollbar-thumb': { background: isDark ? '#444' : '#adb5bd' },
          }}>
            {allFilterCols.map((col) => {
              const label = col.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              const isDropdown = dropdownCols.includes(col);
              const values = filterOptions[col] || [];
              const isLast = allFilterCols.indexOf(col) === allFilterCols.length - 1;
              return (
                <Box key={col} sx={{
                  flex: '1 1 0', minWidth: 85,
                  borderRight: isLast ? 'none' : `1px solid ${borderColor}`,
                }}>
                  <Box sx={{
                    px: 1, py: 0.5,
                    background: blueBg,
                    borderBottom: `1px solid ${borderColor}`,
                  }}>
                    <Typography sx={{
                      fontWeight: 700, fontSize: '0.7rem', color: '#fff',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {label}
                    </Typography>
                  </Box>
                  <Box sx={{
                    px: 0.5, py: 0.5,
                    bgcolor: inputBg,
                    borderBottom: `1px solid ${borderColor}`,
                  }}>
                    {isDropdown
                      ? renderDropdown(col, values, activeFilters, onFilterChange, isDark, inputBg, borderColor)
                      : renderTextField(col, activeFilters, onFilterChange, isDark, inputBg, borderColor)}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {children && (
        <Box sx={{ bgcolor: isDark ? '#0d0d0d' : '#ebeef2' }}>
          {children}
        </Box>
      )}
    </Box>
  );
};

function renderDropdown(
  col: string, values: string[],
  activeFilters: Record<string, string>,
  onFilterChange: (col: string, val: string) => void,
  isDark: boolean, inputBg: string, borderColor: string,
) {
  return (
    <Select
      value={activeFilters[col] || ''}
      displayEmpty
      onChange={(e) => onFilterChange(col, e.target.value as string)}
      size="small" variant="outlined"
      renderValue={(sel) => {
        if (!sel) return <span style={{ color: isDark ? '#888' : '#6c757d', fontSize: '0.72rem' }}>(All)</span>;
        return <span style={{ fontSize: '0.72rem' }}>{sel as string}</span>;
      }}
      sx={{
        width: '100%', height: 28, minHeight: 28, maxHeight: 28,
        fontSize: '0.72rem', bgcolor: inputBg, boxSizing: 'border-box',
        '& .MuiSelect-select': { py: '4px', px: 0.8 },
        '& .MuiOutlinedInput-notchedOutline': { borderColor },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#555' : '#78909c' },
        '& .MuiSelect-icon': { fontSize: '1.1rem', right: 2, color: isDark ? '#888' : '#90a4ae' },
      }}
      MenuProps={{
        PaperProps: {
          sx: {
            mt: 0.5,
            bgcolor: isDark ? '#1e1e1e' : '#fff',
            border: `1px solid ${isDark ? '#444' : '#dee2e6'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            borderRadius: '6px',
            overflow: 'hidden', // clip the scrollbar at the rounded corners
            '& .MuiList-root': {
              maxHeight: 280,
              overflowY: 'auto',
              py: 0,
              // Scrollbar lives on the inner list so it stays inside the clipped Paper
              scrollbarWidth: 'thin',
              scrollbarColor: `${isDark ? '#444' : '#adb5bd'} transparent`,
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: isDark ? '#444' : '#adb5bd',
                borderRadius: 3,
              },
            },
          },
        },
      }}
    >
      <MenuItem value="" sx={{ fontSize: '0.72rem', py: 0.5 }}>(All)</MenuItem>
      {values.map((v) => <MenuItem key={v} value={v} sx={{ fontSize: '0.72rem', py: 0.5 }}>{v}</MenuItem>)}
    </Select>
  );
}

function renderTextField(
  col: string,
  activeFilters: Record<string, string>,
  onFilterChange: (col: string, val: string) => void,
  isDark: boolean, inputBg: string, borderColor: string,
) {
  return (
    <TextField
      value={activeFilters[col] || ''}
      onChange={(e) => onFilterChange(col, e.target.value)}
      placeholder="(All)"
      size="small" variant="outlined"
      sx={{
        width: '100%',
        '& .MuiInputBase-root': {
          height: 28, minHeight: 28, maxHeight: 28,
          fontSize: '0.72rem', bgcolor: inputBg,
          boxSizing: 'border-box',
        },
        '& .MuiInputBase-input': { py: '4px', px: 0.8, height: 'auto' },
        '& .MuiInputBase-input::placeholder': { color: isDark ? '#888' : '#6c757d', opacity: 1 },
        '& .MuiOutlinedInput-notchedOutline': { borderColor },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#555' : '#78909c' },
      }}
    />
  );
}
