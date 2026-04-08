/**
 * DataTable — MicroStrategy-style reporting table. Blue header, flat corporate style, responsive.
 */
import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';

interface DataTableProps {
  title: string;
  columns: { name: string; type: string }[];
  rows: Record<string, any>[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  searchQuery: string;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (col: string) => void;
  onSearchChange: (query: string) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  title, columns, rows, total, page, pageSize,
  loading, onPageChange, onPageSizeChange, onSortChange, onSearchChange,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const borderColor = isDark ? '#333' : '#cfd8dc';
  const headerBg = isDark
    ? 'linear-gradient(180deg, #1e1e1e, #2a2a2a)'
    : 'linear-gradient(180deg, #1565c0, #1976d2)';

  const formatCell = (value: any, type: string) => {
    if (value === null || value === undefined) return '-';
    if (type.includes('timestamp') || type === 'date') {
      try {
        return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch { return String(value); }
    }
    if (typeof value === 'number') return value.toLocaleString();
    const s = String(value);
    return s.length > 80 ? s.slice(0, 77) + '...' : s;
  };

  const mrtColumns = useMemo<MRT_ColumnDef<Record<string, any>>[]>(() =>
    columns.map((col) => ({
      accessorKey: col.name,
      header: col.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      size: 150,
      Cell: ({ cell }) => formatCell(cell.getValue(), col.type),
    })), [columns]);

  const table = useMaterialReactTable({
    columns: mrtColumns,
    data: rows,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: total,
    state: {
      pagination: { pageIndex: page - 1, pageSize },
      isLoading: loading,
      showProgressBars: !!loading,
      showSkeletons: false,
    },
    onPaginationChange: (updater) => {
      const p = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize }) : updater;
      if (p.pageSize !== pageSize) onPageSizeChange(p.pageSize);
      if (p.pageIndex !== page - 1) onPageChange(p.pageIndex + 1);
    },
    onSortingChange: (updater) => {
      const s = typeof updater === 'function' ? updater([]) : updater;
      if (s.length > 0) onSortChange(s[0].id);
    },
    onGlobalFilterChange: (v) => onSearchChange(v ?? ''),
    enableColumnResizing: true,
    enableColumnOrdering: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    enableStickyHeader: true,
    enableTopToolbar: true,
    enableBottomToolbar: true,
    positionGlobalFilter: 'right',
    muiTableContainerProps: {
      sx: {
        maxHeight: 'calc(100vh - 320px)',
        overflow: 'overlay',  // overlays content, no reserved space
        // Firefox: thin scrollbar, overlays content
        scrollbarWidth: 'thin',
        scrollbarColor: `${isDark ? '#333' : '#adb5bd'} transparent`,
        // Webkit: thin overlay scrollbar
        '&::-webkit-scrollbar': { width: 6, height: 6, background: 'transparent' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: isDark ? '#333' : '#adb5bd', borderRadius: 3 },
        '& thead': { zIndex: 2 },
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: 0, overflow: 'visible',
        border: `1px solid ${borderColor}`,
        bgcolor: isDark ? '#0d0d0d' : '#fff',
        '& .MuiDivider-root': { display: 'none' },
        '& .Mui-TableHeadCell-ResizeHandle-Wrapper': { opacity: 0, transition: 'opacity 0.2s' },
        '& th:hover .Mui-TableHeadCell-ResizeHandle-Wrapper': { opacity: 1 },
        // All nested scrollable areas: overlay scrollbar, no extra space
        '& *': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${isDark ? '#333' : '#adb5bd'} transparent`,
          '&::-webkit-scrollbar': { width: 6, height: 6, background: 'transparent' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: isDark ? '#333' : '#adb5bd', borderRadius: 3 },
        },
      },
    },
    muiTopToolbarProps: {
      sx: {
        background: headerBg,
        minHeight: '42px !important',
        borderBottom: `1px solid ${borderColor}`,
        '&, & > div, & .MuiBox-root': {
          display: 'flex',
          alignItems: 'center',
        },
        '& .MuiIconButton-root': { color: '#60a5fa' },
        '& .MuiInputBase-root': {
          color: '#e0f2fe', fontSize: '0.74rem',
          bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '3px',
          '& input::placeholder': { color: 'rgba(224,242,254,0.4)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(224,242,254,0.15)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(224,242,254,0.3)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(224,242,254,0.5)' },
        },
        '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: 'rgba(224,242,254,0.5)', fontSize: '1rem' },
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700, fontSize: '0.67rem', textTransform: 'uppercase',
        letterSpacing: 0.3, py: 0.7, px: 1.2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        background: isDark ? headerBg : '#ffffff',
        color: isDark ? '#ffffff' : '#212529',
        borderBottom: `1px solid ${borderColor}`,
        borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
        '&:last-child': { borderRight: 'none' },
        '& .MuiTableSortLabel-root': { color: isDark ? '#ffffff !important' : '#212529 !important' },
        '& .MuiTableSortLabel-icon': { color: isDark ? '#ffffff !important' : '#1565c0 !important' },
        '& .Mui-active': { color: isDark ? '#ffffff !important' : '#1565c0 !important' },
        '& .Mui-TableHeadCell-Content': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
        '& .Mui-TableHeadCell-Content-Labels': { whiteSpace: 'nowrap' },
        '& .Mui-TableHeadCell-Content-Wrapper': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      },
    },
    muiTableBodyCellProps: () => ({
      sx: {
        fontSize: '0.72rem', py: 0.6, px: 1.2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        color: isDark ? '#bbb' : '#444',
        borderBottomColor: isDark ? '#333' : '#e9ecef',
        borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5'}`,
        '&:last-child': { borderRight: 'none' },
      },
    }),
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        bgcolor: isDark
          ? (row.index % 2 === 0 ? '#1a1a1a' : '#141414')
          : (row.index % 2 === 0 ? '#fff' : '#f8f9fa'),
        '&:hover td': { bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,82,118,0.06)' },
      },
    }),
    muiBottomToolbarProps: {
      sx: {
        borderTop: `1px solid ${borderColor}`,
        background: 'none',
        minHeight: '50px !important',
        py: '6px !important',
        mb: '12px',
        overflow: 'visible !important',
        display: 'flex',
        justifyContent: 'center',
        '& .MuiTablePagination-root': {
          display: 'flex', justifyContent: 'center', width: '100%',
          '& .MuiTablePagination-toolbar': {
            justifyContent: 'center',
            gap: 1,
          },
        },
        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
          fontSize: '0.82rem', fontWeight: 500,
          color: isDark ? '#bbb' : '#444',
        },
        '& .MuiTablePagination-select': {
          fontSize: '0.82rem', fontWeight: 600,
          color: isDark ? '#e0e0e0' : '#212529',
        },
        '& .MuiTablePagination-selectIcon': {
          color: isDark ? '#bbb' : '#777',
        },
        '& .MuiIconButton-root': {
          color: isDark ? '#60a5fa' : '#1a5276',
          fontSize: '1.1rem',
          '&.Mui-disabled': { color: isDark ? '#444' : '#ced4da' },
        },
        '& .MuiBox-root:empty': { display: 'none' },
        '& .MuiCircularProgress-root': { display: 'none' },
      },
    },
    muiLinearProgressProps: {
      sx: {
        height: 2,
        bgcolor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(26,82,118,0.08)',
        '& .MuiLinearProgress-bar': { bgcolor: isDark ? '#60a5fa' : '#1a5276' },
      },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
        <Typography sx={{ fontWeight: 700, color: '#e0f2fe', fontSize: '0.76rem' }}>{title}</Typography>
        <Typography sx={{
          fontSize: '0.64rem', color: '#60a5fa', fontWeight: 500,
          bgcolor: 'rgba(255,255,255,0.1)', px: 0.7, py: 0.15, borderRadius: '3px',
        }}>
          {total.toLocaleString()} records
        </Typography>
      </Box>
    ),
  });

  return <MaterialReactTable table={table} />;
};
