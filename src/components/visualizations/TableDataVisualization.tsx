/**
 * TableData Visualization Component
 * 
 * Renders table data with sorting, filtering, and pagination
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import { MaterialReactTable, MRT_ColumnDef, useMaterialReactTable } from 'material-react-table';
import { VisualizationWrapper } from '../VisualizationWrapper';

interface TableDataVisualizationProps {
  data: Record<string, any>[];
}

export function TableDataVisualization({
  data,
}: TableDataVisualizationProps) {
  const theme = useTheme();

  console.log(data);
  
  // Create columns for Material React Table
  const columns: MRT_ColumnDef<any>[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    const columnKeys = Object.keys(data[0]);
    return columnKeys.map((key) => ({
      accessorKey: key,
      header: key,
      size: 150,
    }));
  }, [data]);

  // Material React Table hook
  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnActions: false,
    enableColumnFilters: true,
    enableSorting: true,
    initialState: {
      density: 'compact',
    },
    muiPaginationProps: {
      rowsPerPageOptions: [10, 25, 50],
      showFirstButton: false,
      showLastButton: false,
    },
    muiTableContainerProps: {
      sx: {
        maxHeight: 400,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(0, 0, 0, 0.15)',
          borderRadius: '4px',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.25)'
              : 'rgba(0, 0, 0, 0.25)',
          },
        },
      },
    },
    muiTableProps: {
      sx: {
        backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : '#ffffff',
        color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#333333',
        '& td': {
          padding: '8px',
        },
        '& th': {
          padding: '10px 8px',
          fontWeight: 600,
        },
        '& thead': {
          backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        },
        '& tbody': {
          position: 'relative',
          zIndex: 1,
        },
      },
    },
    muiTableHeadCellProps: {
      sx: {
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#333333' : '#e0e0e0'}`,
      },
    },
    muiTableBodyRowProps: {
      sx: {
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
        },
      },
    },
  });

  if (!data || data.length === 0) {
    return (
      <VisualizationWrapper>
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No data available to display
        </Typography>
      </VisualizationWrapper>
    );
  }

  return (
    <VisualizationWrapper>
      <Box sx={{ width: '100%' }}>
        <MaterialReactTable table={table} />
      </Box>
    </VisualizationWrapper>
  );
}
