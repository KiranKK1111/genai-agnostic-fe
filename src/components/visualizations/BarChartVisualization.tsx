/**
 * Bar Chart Visualization Component
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
import { aggregateData, buildAggregationTitle, AggregationType } from '../../utils/dataAggregation';

interface BarChartVisualizationProps {
  data: Record<string, any>[];
  aggregationField?: string;
  aggregationType?: AggregationType;
  aggregationValueField?: string;
  xAxis?: string;
  yAxes?: string[];
}

const COLORS = ['#3b82f6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export function BarChartVisualization({
  data,
  aggregationField,
  aggregationType = 'count',
  aggregationValueField,
  xAxis,
  yAxes,
}: BarChartVisualizationProps) {
  const theme = useTheme();
  const height = 400;

  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    // If xAxis/yAxes are provided, render multi-series bar chart
    if (xAxis && yAxes && yAxes.length > 0) {
      const categories = data.map((row) => String(row[xAxis]));
      const series = yAxes.map((yCol, idx) => ({
        name: yCol,
        type: 'bar' as const,
        data: data.map((row) => Number(row[yCol]) || 0),
        itemStyle: { color: COLORS[idx % COLORS.length] },
      }));

      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderColor: 'rgba(59, 130, 246, 0.5)',
        },
        legend: {
          data: yAxes,
          bottom: 0,
          textStyle: { color: theme.palette.text.secondary },
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            rotate: categories.length > 5 ? 45 : 0,
            interval: Math.ceil(categories.length / 10) - 1,
          },
        },
        yAxis: { type: 'value' },
        series,
        grid: { containLabel: true, bottom: 60 },
      };
    }

    let categories: string[] = [];
    let values: (number | string)[] = [];

    // If aggregation field is provided, use aggregated data
    if (aggregationField) {
      const aggregationResult = aggregateData(
        data,
        aggregationField,
        aggregationType,
        aggregationValueField
      );
      categories = aggregationResult.labels;
      values = aggregationResult.values;
    } else {
      // Fallback to raw data (first two columns)
      const columns = Object.keys(data[0]);
      if (columns.length < 2) return null;

      const categoryKey = columns[0];
      const valueKey = columns[1];
      categories = data.map((row) => String(row[categoryKey]));
      values = data.map((row) => Number(row[valueKey]) || 0);
    }

    if (categories.length === 0 || values.length === 0) return null;

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          rotate: categories.length > 5 ? 45 : 0,
          interval: Math.ceil(categories.length / 10) - 1,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: values,
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1e40af' },
            ]),
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#3b82f6' },
              ]),
            },
          },
        },
      ],
      grid: {
        containLabel: true,
      },
    };
  }, [data, aggregationField, aggregationType, aggregationValueField, xAxis, yAxes, theme]);

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
          Unable to render bar chart with this data
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
