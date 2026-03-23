/**
 * Data Aggregation Utilities
 * Handles data aggregation for bar charts and other visualizations
 */

export type AggregationType = 'count' | 'sum' | 'average' | 'min' | 'max';

export interface AggregationResult {
  labels: string[];
  values: (number | string)[];
}

/**
 * Get categorical column names from raw data
 * Assumes most string columns are categorical, numeric columns are measures
 */
export function getCategoricalColumns(data: Record<string, any>[]): string[] {
  if (!data || data.length === 0) return [];

  const firstRow = data[0];
  const categoricalColumns: string[] = [];

  Object.entries(firstRow).forEach(([key, value]) => {
    // Consider string, boolean values as categorical
    if (typeof value === 'string' || typeof value === 'boolean') {
      categoricalColumns.push(key);
    }
  });

  return categoricalColumns;
}

/**
 * Get numeric column names from raw data
 */
export function getNumericColumns(data: Record<string, any>[]): string[] {
  if (!data || data.length === 0) return [];

  const firstRow = data[0];
  const numericColumns: string[] = [];

  Object.entries(firstRow).forEach(([key, value]) => {
    if (typeof value === 'number' || !isNaN(Number(value))) {
      numericColumns.push(key);
    }
  });

  return numericColumns;
}

/**
 * Aggregate data by a categorical field
 * @param data Raw data array
 * @param field Field to aggregate on (categorical)
 * @param valueField Optional numeric field for sum/average operations
 * @param aggregationType Type of aggregation (count, sum, average, etc.)
 */
export function aggregateData(
  data: Record<string, any>[],
  field: string,
  aggregationType: AggregationType = 'count',
  valueField?: string
): AggregationResult {
  if (!data || data.length === 0) {
    return { labels: [], values: [] };
  }

  const aggregationMap: Record<string, { count: number; sum: number; values: number[] }> = {};

  // Build aggregation map
  data.forEach((row) => {
    const key = String(row[field]);
    if (!aggregationMap[key]) {
      aggregationMap[key] = { count: 0, sum: 0, values: [] };
    }

    aggregationMap[key].count += 1;

    // If dealing with numeric aggregations and a valueField is provided
    if (valueField && (aggregationType === 'sum' || aggregationType === 'average')) {
      const value = Number(row[valueField]) || 0;
      aggregationMap[key].sum += value;
      aggregationMap[key].values.push(value);
    }
  });

  // Transform aggregation map to chart data
  const labels: string[] = [];
  const values: (number | string)[] = [];

  Object.entries(aggregationMap).forEach(([label, stats]) => {
    labels.push(label);

    switch (aggregationType) {
      case 'count':
        values.push(stats.count);
        break;
      case 'sum':
        values.push(stats.sum);
        break;
      case 'average':
        values.push(stats.values.length > 0 ? stats.sum / stats.values.length : 0);
        break;
      case 'min':
        values.push(stats.values.length > 0 ? Math.min(...stats.values) : 0);
        break;
      case 'max':
        values.push(stats.values.length > 0 ? Math.max(...stats.values) : 0);
        break;
      default:
        values.push(stats.count);
    }
  });

  return { labels, values };
}

/**
 * Build descriptive title for aggregated data
 */
export function buildAggregationTitle(
  field: string,
  aggregationType: AggregationType,
  valueField?: string
): string {
  const aggregationLabels: Record<AggregationType, string> = {
    count: 'Count of',
    sum: 'Total',
    average: 'Average',
    min: 'Minimum',
    max: 'Maximum',
  };

  const base = aggregationLabels[aggregationType];
  const subject = valueField ? `${valueField} by ${field}` : field;
  return `${base} ${subject}`;
}
