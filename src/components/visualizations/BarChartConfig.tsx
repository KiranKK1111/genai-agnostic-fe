/**
 * Bar Chart Configuration Component
 * Provides UI for selecting fields and aggregation type
 */

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  useTheme,
} from '@mui/material';
import { getCategoricalColumns, getNumericColumns, AggregationType } from '../../utils/dataAggregation';

interface BarChartConfigProps {
  data: Record<string, any>[];
  onConfigChange: (config: BarChartConfig) => void;
  selectedField?: string;
  selectedAggregation?: AggregationType;
  selectedValueField?: string;
}

export interface BarChartConfig {
  field: string;
  aggregationType: AggregationType;
  valueField?: string;
}

export const aggregationTypes: AggregationType[] = ['count', 'sum', 'average', 'min', 'max'];

export function BarChartConfig({
  data,
  onConfigChange,
  selectedField,
  selectedAggregation = 'count',
  selectedValueField,
}: BarChartConfigProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const categoricalColumns = getCategoricalColumns(data);
  const numericColumns = getNumericColumns(data);

  // Default to first categorical column
  const defaultField = selectedField || categoricalColumns[0];

  const handleFieldChange = (field: string) => {
    onConfigChange({
      field,
      aggregationType: selectedAggregation,
      valueField: selectedValueField,
    });
  };

  const handleAggregationChange = (aggregationType: AggregationType) => {
    onConfigChange({
      field: selectedField || defaultField,
      aggregationType,
      valueField: selectedValueField,
    });
  };

  const handleValueFieldChange = (valueField: string) => {
    onConfigChange({
      field: selectedField || defaultField,
      aggregationType: selectedAggregation,
      valueField: valueField || undefined,
    });
  };

  const showValueFieldSelector =
    selectedAggregation !== 'count' && (selectedAggregation === 'sum' || selectedAggregation === 'average');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: '8px',
        mb: 2,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Configure Bar Chart
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Field Selector */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel
            sx={{
              fontSize: '12px',
              '&.Mui-focused': {
                color: '#3b82f6',
              },
            }}
          >
            Field
          </InputLabel>
          <Select
            value={selectedField || defaultField}
            label="Field"
            onChange={(e) => handleFieldChange(e.target.value)}
            sx={{
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
            }}
          >
            {categoricalColumns.map((col) => (
              <MenuItem key={col} value={col}>
                {col}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Aggregation Type Selector */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel
            sx={{
              fontSize: '12px',
              '&.Mui-focused': {
                color: '#3b82f6',
              },
            }}
          >
            Aggregation
          </InputLabel>
          <Select
            value={selectedAggregation}
            label="Aggregation"
            onChange={(e) => handleAggregationChange(e.target.value as AggregationType)}
            sx={{
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
            }}
          >
            {aggregationTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Value Field Selector (for sum/average) */}
        {showValueFieldSelector && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel
              sx={{
                fontSize: '12px',
                '&.Mui-focused': {
                  color: '#3b82f6',
                },
              }}
            >
              Value Field
            </InputLabel>
            <Select
              value={selectedValueField || ''}
              label="Value Field"
              onChange={(e) => handleValueFieldChange(e.target.value)}
              sx={{
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
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {numericColumns.map((col) => (
                <MenuItem key={col} value={col}>
                  {col}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
    </Box>
  );
}
