/**
 * Scatter Plot Visualization Component
 */

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import { VisualizationWrapper } from '../VisualizationWrapper';

interface ScatterPlotVisualizationProps {
  data: Record<string, any>[];
}

export function ScatterPlotVisualization({
  data,
}: ScatterPlotVisualizationProps) {
  const theme = useTheme();
  const height = 400;

  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);
    if (columns.length < 2) return null;

    // Use first 3 columns for scatter: X, Y, Size
    const scatterData = data.map((row, idx) => {
      const x = Number(row[columns[0]]) || idx;
      const y = Number(row[columns[1]]) || 0;
      const size = columns.length > 2 ? Math.max(5, Number(row[columns[2]]) || 0) / 10 : 10;
      return [x, y, size];
    });

    return {
      tooltip: {
        trigger: 'item',
        formatter: function (params: any) {
          return `${columns[0]}: ${params.value[0]}<br/>${columns[1]}: ${params.value[1]}`;
        },
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
      },
      xAxis: {
        type: 'value',
        name: columns[0],
        nameTextStyle: {
          fontSize: 12,
        },
      },
      yAxis: {
        type: 'value',
        name: columns[1],
        nameTextStyle: {
          fontSize: 12,
        },
      },
      series: [
        {
          data: scatterData,
          type: 'scatter',
          symbolSize: (val: any) => val[2],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#8b5cf6' },
            ]),
            opacity: 0.7,
          },
          emphasis: {
            itemStyle: {
              color: '#ec4899',
              opacity: 1,
            },
          },
        },
      ],
      grid: {
        containLabel: true,
      },
    };
  }, [data]);

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
          Unable to render scatter chart with this data
        </Typography>
      </VisualizationWrapper>
    );
  }

  return (
    <VisualizationWrapper>
      <Box sx={{ width: '100%' }}>
        <ReactECharts option={option} style={{ height, width: '100%' }} />
      </Box>
    </VisualizationWrapper>
  );
}
