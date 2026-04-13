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
  colorMode?: string;
  barColor?: string;
}

const COLORS = ['#3b82f6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

/** Generate n maximally-distinct hues using the golden angle */
function generateGoldenAngleColors(n: number): string[] {
  const golden = 137.508;
  return Array.from({ length: n }, (_, i) => {
    const hue = (i * golden) % 360;
    return `hsl(${Math.round(hue)}, 68%, 52%)`;
  });
}

export function BarChartVisualization({
  data,
  aggregationField,
  aggregationType = 'count',
  aggregationValueField,
  xAxis,
  yAxes,
  colorMode,
  barColor,
}: BarChartVisualizationProps) {
  const theme = useTheme();
  const height = 400;

  const isDark = theme.palette.mode === 'dark';
  const tooltipStyle = {
    backgroundColor: isDark ? '#ffffff' : '#1a1a1a',
    borderColor:     isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
    textStyle:       { color: isDark ? '#1a1a1a' : '#ffffff' },
  };

  const option = useMemo(() => {
    if (!data || data.length === 0) return null;

    const axisLineColor = isDark ? '#333' : '#ced4da';
    const splitLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const axisLabelColor = isDark ? '#999' : '#6c757d';

    const commonXAxisStyle = {
      axisLine: { lineStyle: { color: axisLineColor, width: 1 } },
      axisTick: { show: false },
      axisLabel: { color: axisLabelColor, fontSize: 11 },
    };
    const commonYAxisStyle = {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisLabelColor, fontSize: 11 },
      splitLine: {
        lineStyle: {
          color: splitLineColor,
          width: 1,
          type: 'dashed' as const,
        },
      },
    };

    const barLabel = {
      show: true,
      position: 'top' as const,
      fontSize: 11,
      fontWeight: 600,
      color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)',
      formatter: (params: any) => {
        const v = Number(params.value);
        return v > 0 ? v.toLocaleString() : '';
      },
    };

    // If xAxis/yAxes are provided, render multi-series bar chart
    if (xAxis && yAxes && yAxes.length > 0) {
      const categories = data.map((row) => String(row[xAxis]));
      const variedColors = colorMode === 'varied' ? generateGoldenAngleColors(categories.length) : null;
      const series = yAxes.map((yCol, idx) => ({
        name: yCol,
        type: 'bar' as const,
        data: colorMode === 'varied'
          ? data.map((row, i) => ({
              value: Number(row[yCol]) || 0,
              itemStyle: { color: variedColors![i % variedColors!.length] },
            }))
          : data.map((row) => Number(row[yCol]) || 0),
        ...(colorMode !== 'varied' && {
          itemStyle: { color: barColor || COLORS[idx % COLORS.length] },
        }),
        label: barLabel,
      }));

      return {
        tooltip: {
          trigger: 'axis',
          ...tooltipStyle,
        },
        legend: {
          data: yAxes,
          bottom: 0,
          textStyle: { color: theme.palette.text.secondary },
        },
        xAxis: {
          type: 'category',
          data: categories,
          ...commonXAxisStyle,
          axisLabel: {
            ...commonXAxisStyle.axisLabel,
            rotate: categories.length > 5 ? 45 : 0,
            interval: Math.ceil(categories.length / 10) - 1,
          },
        },
        yAxis: { type: 'value', ...commonYAxisStyle },
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

    const variedColors = colorMode === 'varied' ? generateGoldenAngleColors(categories.length) : null;

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}',
        ...tooltipStyle,
      },
      xAxis: {
        type: 'category',
        data: categories,
        ...commonXAxisStyle,
        axisLabel: {
          ...commonXAxisStyle.axisLabel,
          rotate: categories.length > 5 ? 45 : 0,
          interval: Math.ceil(categories.length / 10) - 1,
        },
      },
      yAxis: {
        type: 'value',
        ...commonYAxisStyle,
      },
      series: [
        {
          data: colorMode === 'varied'
            ? values.map((v, i) => ({
                value: v,
                itemStyle: { color: variedColors![i % variedColors!.length] },
              }))
            : values,
          type: 'bar',
          label: barLabel,
          ...(colorMode !== 'varied' && barColor && {
            itemStyle: { color: barColor },
          }),
          ...(colorMode !== 'varied' && !barColor && {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#0d47a1' },
                { offset: 1, color: '#1565c0' },
              ]),
            },
            emphasis: {
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#1565c0' },
                  { offset: 1, color: '#0d47a1' },
                ]),
              },
            },
          }),
        },
      ],
      grid: {
        containLabel: true,
      },
    };
  }, [data, aggregationField, aggregationType, aggregationValueField, xAxis, yAxes, colorMode, barColor, theme]);

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
