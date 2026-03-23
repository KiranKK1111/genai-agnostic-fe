/**
 * ArtifactRenderer — Renders each artifact from `render_artifacts` independently.
 *
 * Maps artifact types to their UI components:
 *   stat_card           → KPI card with big number + label
 *   table               → TableDataVisualization (sortable/filterable)
 *   bar_chart           → BarChartVisualization
 *   line_chart          → LineChartVisualization
 *   bar_chart_horizontal→ BarChartVisualization (horizontal)
 *   pie_chart           → PieChartVisualization
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { RenderArtifact, StatCardArtifact, TableArtifact, ChartArtifact, DataPayload } from '../api';
import { TableDataVisualization } from './visualizations/TableDataVisualization';
import { BarChartVisualization } from './visualizations/BarChartVisualization';
import { LineChartVisualization } from './visualizations/LineChartVisualization';
import { PieChartVisualization } from './visualizations/PieChartVisualization';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert column-oriented table artifact (columns[], rows[][]) → row objects */
function tableArtifactToObjects(artifact: TableArtifact): Record<string, any>[] {
  const { columns, rows } = artifact;
  if (!columns?.length || !rows?.length) return [];
  return rows.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/** Format a value according to its format_hint */
function formatValue(value: number | string, hint?: string): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return String(value);

  switch (hint) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(num);
    case 'percentage':
      return `${num.toFixed(1)}%`;
    case 'decimal':
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num);
    case 'integer':
    default:
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
  }
}

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

function StatCardArtifactView({ artifact }: { artifact: StatCardArtifact }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const formatted = formatValue(artifact.value as number | string, artifact.format_hint ?? undefined);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        minWidth: 160,
        maxWidth: 280,
        p: '16px 20px',
        mb: 2,
        borderRadius: '12px',
        background: isDark
          ? 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.10) 100%)'
          : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: `1px solid ${isDark ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.25)'}`,
        boxShadow: isDark
          ? '0 2px 12px rgba(59,130,246,0.15)'
          : '0 2px 8px rgba(59,130,246,0.10)',
      }}
    >
      <Typography
        sx={{
          fontSize: '28px',
          fontWeight: 700,
          lineHeight: 1.1,
          color: isDark ? '#93c5fd' : '#1d4ed8',
          letterSpacing: '-0.5px',
        }}
      >
        {formatted}
      </Typography>
      <Typography
        sx={{
          mt: 0.5,
          fontSize: '13px',
          fontWeight: 500,
          color: isDark ? '#94a3b8' : '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {artifact.label}
      </Typography>
      {artifact.subtitle && (
        <Typography
          sx={{
            mt: 0.25,
            fontSize: '11px',
            color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
          }}
        >
          {artifact.subtitle}
        </Typography>
      )}
    </Box>
  );
}

function TableArtifactView({ artifact }: { artifact: TableArtifact }) {
  const rows = tableArtifactToObjects(artifact);
  if (!rows.length) {
    return (
      <Box sx={{ py: 2, color: 'text.secondary', fontSize: '14px' }}>
        No data to display.
      </Box>
    );
  }
  return (
    <Box sx={{ mb: 2 }}>
      {artifact.truncated && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Showing first {artifact.columns.length > 0 ? rows.length : 0} of {artifact.row_count.toLocaleString()} rows
        </Typography>
      )}
      <TableDataVisualization data={rows} />
    </Box>
  );
}

function ChartArtifactView({
  artifact,
  dataRows,
}: {
  artifact: ChartArtifact;
  dataRows: Record<string, any>[];
}) {
  const xField = artifact.x_axis?.field;
  const yField = artifact.series?.[0]?.field;

  if (!dataRows.length) {
    return (
      <Box sx={{ py: 2, color: 'text.secondary', fontSize: '14px' }}>
        No data available for chart.
      </Box>
    );
  }

  switch (artifact.type) {
    case 'bar_chart':
      return (
        <Box sx={{ mb: 2 }}>
          <BarChartVisualization
            data={dataRows}
            aggregationField={xField}
            aggregationValueField={yField}
            aggregationType="sum"
          />
        </Box>
      );

    case 'bar_chart_horizontal':
      // Swap x/y for horizontal — category is on Y axis
      return (
        <Box sx={{ mb: 2 }}>
          <BarChartVisualization
            data={dataRows}
            aggregationField={yField ?? xField}
            aggregationValueField={xField !== yField ? xField : undefined}
            aggregationType="sum"
          />
        </Box>
      );

    case 'line_chart':
      return (
        <Box sx={{ mb: 2 }}>
          <LineChartVisualization data={dataRows} />
        </Box>
      );

    case 'pie_chart':
      return (
        <Box sx={{ mb: 2 }}>
          <PieChartVisualization data={dataRows} />
        </Box>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ArtifactRendererProps {
  artifacts: RenderArtifact[];
  /** Raw data rows from response.data.rows — used by chart artifacts (data_ref="response.data.rows") */
  dataPayload?: DataPayload | null;
}

export function ArtifactRenderer({ artifacts, dataPayload }: ArtifactRendererProps) {
  // Pre-build data rows from DataPayload (for charts that reference response.data.rows)
  const dataRows: Record<string, any>[] = React.useMemo(() => {
    if (!dataPayload?.rows) return [];
    return dataPayload.rows;
  }, [dataPayload]);

  if (!artifacts || artifacts.length === 0) return null;

  return (
    <Box sx={{ width: '100%' }}>
      {artifacts
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((artifact) => {
          switch (artifact.type) {
            case 'stat_card':
              return <StatCardArtifactView key={artifact.id} artifact={artifact as StatCardArtifact} />;

            case 'table':
              return <TableArtifactView key={artifact.id} artifact={artifact as TableArtifact} />;

            case 'bar_chart':
            case 'bar_chart_horizontal':
            case 'line_chart':
            case 'pie_chart':
              return (
                <ChartArtifactView
                  key={artifact.id}
                  artifact={artifact as ChartArtifact}
                  dataRows={dataRows}
                />
              );

            default:
              return null;
          }
        })}
    </Box>
  );
}
