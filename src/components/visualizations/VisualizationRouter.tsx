/**
 * Visualization Router Component
 * Routes visualization types to appropriate visualization components
 * 
 * Accepts a visualization object from the API response and renders
 * the appropriate chart component based on the type field.
 */

import React, { useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Visualization } from '../../api';
import { TableDataVisualization } from './TableDataVisualization';
import { BarChartVisualization } from './BarChartVisualization';
import { LineChartVisualization } from './LineChartVisualization';
import { PieChartVisualization } from './PieChartVisualization';
import { ScatterPlotVisualization } from './ScatterPlotVisualization';
import { AxisSelector, AxisSelection } from './AxisSelector';
import type { BarChartConfig } from './BarChartConfig';

export interface VisualizationRouterProps {
  visualization: Visualization;
  height?: number;
  selectedType?: string;
  barChartConfig?: BarChartConfig | null;
}

// Visualization type to component mapping
const visualizationMap: Record<string, React.ComponentType<any>> = {
  table: TableDataVisualization,
  bar: BarChartVisualization,
  line: LineChartVisualization,
  pie: PieChartVisualization,
  scatter: ScatterPlotVisualization,
};

/**
 * VisualizationRouter Component
 * Accepts a visualization object and routes to the appropriate component
 */
export function VisualizationRouter({
  visualization,
  selectedType,
  barChartConfig,
}: VisualizationRouterProps) {
  const { type, title, data } = visualization;
  const vizType = selectedType || type;
  const normalizedType = vizType.toLowerCase().trim();
  const needsAxisSelector = ['bar', 'line', 'scatter'].includes(normalizedType);

  // Compute default axis selection from data columns
  const defaultAxis = useMemo((): AxisSelection => {
    if (!data || data.length === 0) return { xAxis: '', yAxes: [] };
    const cols = Object.keys(data[0]);
    const numericCols = cols.filter((k) => {
      const v = data[0][k];
      return typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== null && typeof v !== 'boolean');
    });
    const firstNonNumeric = cols.find((c) => !numericCols.includes(c)) || cols[0];
    return {
      xAxis: firstNonNumeric,
      yAxes: numericCols.length > 0 ? [numericCols[0]] : [],
    };
  }, [data]);

  const [axisSelection, setAxisSelection] = useState<AxisSelection>(defaultAxis);

  // Sync default when data/vizType changes
  React.useEffect(() => {
    setAxisSelection(defaultAxis);
  }, [defaultAxis]);

  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No data available to display
        </Typography>
      </Box>
    );
  }

  const VisualizationComponent = visualizationMap[normalizedType];

  if (!VisualizationComponent) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          Unknown visualization type: {vizType}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Supported types: {Object.keys(visualizationMap).join(', ')}
        </Typography>
      </Box>
    );
  }

  try {
    const componentProps: any = {
      data,
      title,
      height: 400,
    };

    // Pass axis selection for chart types that support it
    if (needsAxisSelector && axisSelection.xAxis && axisSelection.yAxes.length > 0) {
      componentProps.xAxis = axisSelection.xAxis;
      componentProps.yAxes = axisSelection.yAxes;
    }

    // Pass bar chart config if this is a bar chart and config exists
    if (vizType === 'bar' && barChartConfig) {
      componentProps.aggregationField = barChartConfig.field;
      componentProps.aggregationType = barChartConfig.aggregationType;
      componentProps.aggregationValueField = barChartConfig.valueField;
    }

    return (
      <Box>
        {needsAxisSelector && (
          <AxisSelector
            columns={Object.keys(data[0])}
            data={data}
            selection={axisSelection}
            onChange={setAxisSelection}
          />
        )}
        <VisualizationComponent {...componentProps} />
      </Box>
    );
  } catch (error) {
    console.error(`Error rendering visualization: ${vizType}`, error);
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          Error rendering {vizType} visualization
        </Typography>
      </Box>
    );
  }
}

/**
 * Utility function to get supported visualization types
 */
export function getSupportedVisualizationTypes(): string[] {
  return Object.keys(visualizationMap);
}

/**
 * Utility function to check if a visualization type is supported
 */
export function isVisualizationTypeSupported(vizType: string): boolean {
  const normalizedType = vizType.toLowerCase().trim();
  return normalizedType in visualizationMap;
}

/**
 * Utility function to get the component for a visualization type
 * Useful for directly rendering a component without VisualizationRouter
 */
export function getVisualizationComponent(
  vizType: string
): React.ComponentType<any> | null {
  const normalizedType = vizType.toLowerCase().trim();
  return visualizationMap[normalizedType] || null;
}
