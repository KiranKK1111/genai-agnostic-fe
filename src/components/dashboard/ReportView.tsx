/**
 * ReportView — MicroStrategy-style report layout.
 *
 * Layouts based on data shape:
 * 1. Many KPIs (>4): [KPI grid 4-col left] + [chart right] — Case Workflow, RSRMA
 * 2. Total KPI only: [Total KPI card] + [chart] + [chart/empty] — Advisor Memo
 * 3. Few KPIs (1-4): [charts row] + [KPI boxes row] — Risk Trigger
 * 4. No KPIs: [chart] [chart] [chart] — CRA Score, ESRM, CST, Pureplay
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Grid, Typography, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { ChartWidget } from './ChartWidget';
import { KPICard } from './KPICard';
import { FilterBar } from './FilterBar';
import { DataTable } from './DataTable';
import {
  fetchReportSummary, fetchReportCharts, fetchReportData,
  type ReportSummary, type ChartData, type TableData,
} from './dashboardApi';

interface ReportViewProps {
  tableName: string;
  reportTitle: string;
  assessmentTitle?: string;
}

export const ReportView: React.FC<ReportViewProps> = ({ tableName, reportTitle, assessmentTitle }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [crqCounts, setCrqCounts] = useState<{ version: string; count: number }[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const borderColor = isDark ? '#333' : '#cfd8dc';
  const headerBg = isDark ? 'linear-gradient(90deg, #1e1e1e, #252525)' : 'linear-gradient(90deg, #1565c0, #1976d2)';

  /* ── Data loading ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSummary(null); setCharts(null); setTableData(null);
    setActiveFilters({}); setSearchQuery(''); setSortBy(''); setPage(1);
    setCrqCounts([]);
    const fetches: Promise<any>[] = [
      fetchReportSummary(tableName).catch(() => null),
      fetchReportCharts(tableName).catch(() => null),
      fetchReportData(tableName, { page: 1, page_size: 50 }).catch(() => null),
    ];
    // For questionnaire_report_daily, also fetch CRQ version distribution explicitly
    if (tableName === 'questionnaire_report_daily') {
      fetches.push(fetchReportCharts(tableName, { group_by: 'crq_version' }).catch(() => null));
    }
    Promise.all(fetches).then((results) => {
      if (cancelled) return;
      const [s, c, t, crqChart] = results;
      setSummary(s); setCharts(c); if (t) setTableData(t);
      // Extract CRQ version counts from the explicit group_by response
      if (crqChart?.charts) {
        const dist = crqChart.charts['distribution'] as { category?: string; count: number }[] | undefined;
        if (dist && Array.isArray(dist)) {
          setCrqCounts(dist.map((d: any) => ({ version: d.category || '', count: d.count })));
        }
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [tableName]);

  const loadTableData = useCallback(async () => {
    setTableLoading(true);
    try {
      const filterStr = Object.entries(activeFilters)
        .filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(',');
      const data = await fetchReportData(tableName, {
        page, page_size: pageSize,
        sort_by: sortBy || undefined, sort_dir: sortDir,
        filters: filterStr || undefined, search: searchQuery || undefined,
      });
      setTableData(data);
    } catch { /* ignore */ }
    setTableLoading(false);
  }, [tableName, page, pageSize, sortBy, sortDir, activeFilters, searchQuery]);

  useEffect(() => { loadTableData(); }, [loadTableData]);

  const handleSearchChange = (q: string) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setSearchQuery(q); setPage(1); }, 400);
  };
  const handleFilterChange = (col: string, val: string) => {
    setActiveFilters((prev) => ({ ...prev, [col]: val })); setPage(1);
  };
  const handleSortChange = (col: string) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  if (loading) {
    return (
      <Box sx={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        height: '100%', minHeight: 'calc(100vh - 200px)', width: '100%',
      }}>
        <CircularProgress size={36} thickness={4} sx={{ color: isDark ? '#60a5fa' : '#1a5276' }} />
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: isDark ? '#999' : '#777' }}>
          Loading report data...
        </Typography>
      </Box>
    );
  }

  /* ── Derived ── */
  // Reports that should show only the data table (no charts, no KPIs)
  const tableOnlyReports = ['questionnaire_report'];
  const isTableOnly = tableOnlyReports.includes(tableName);

  const chartEntries = isTableOnly ? [] : (charts?.charts
    ? Object.entries(charts.charts).filter(([, v]) => Array.isArray(v) && v.length > 0) : []);
  const allChartEntries = isTableOnly ? [] : (charts?.charts ? Object.entries(charts.charts) : []);
  const statusBreakdown = isTableOnly ? [] : (summary?.status_breakdown || []);
  const hasKPIs = statusBreakdown.length > 0;
  const kpiIsGrid = statusBreakdown.length > 4;
  const hasTotalKPI = !isTableOnly && summary && summary.current_month_count !== undefined;

  const dateLabel = `Date as of : ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}`;

  const fmtTitle = (key: string) => {
    if (key.startsWith('volume_by_')) {
      return key.replace('volume_by_', '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
    if (key.startsWith('distribution_')) {
      return key.replace('distribution_', '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  /* ── Total KPI widget (Advisor Memo style) ── */
  const renderTotalKPI = () => {
    if (!hasTotalKPI || !summary) return null;
    // Show total_records as the main count; fall back to current_month_count
    const cur = summary.total_records ?? summary.current_month_count ?? 0;
    const prev = summary.prev_month_count ?? 0;
    const pct = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
    const isUp = pct > 0;
    const isDown = pct < 0;
    const changeBg = isUp ? (isDark ? '#14532d' : '#d4edda') : isDown ? (isDark ? '#450a0a' : '#f8d7da') : (isDark ? '#1e293b' : '#e2e8f0');
    const changeColor = isUp ? (isDark ? '#4ade80' : '#155724') : isDown ? (isDark ? '#f87171' : '#721c24') : (isDark ? '#999' : '#6c757d');

    const kpiLabel = 'Total Number of Cases Approved';

    return (
      <Box sx={{ border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 1.5, py: 0.5, background: headerBg, borderBottom: `1px solid ${borderColor}`, flexShrink: 0,
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.74rem', color: '#e0f2fe' }}>{kpiLabel}</Typography>
        </Box>
        <Box sx={{
          flex: 1, px: { xs: 1.5, sm: 2.5 }, py: { xs: 1.5, sm: 2.5 },
          bgcolor: isDark ? '#1a1a1a' : '#fff',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: isDark ? '#aaa' : '#444', mb: 0.5 }}>
            Created Count
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{
              fontWeight: 800, fontSize: { xs: '2rem', sm: '2.5rem' },
              color: isDark ? '#e0e0e0' : '#212529', lineHeight: 1, fontFeatureSettings: '"tnum"',
            }}>
              {cur.toLocaleString()}
            </Typography>
            {pct !== 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 0.8, py: 0.3, borderRadius: '3px', bgcolor: changeBg }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: changeColor, lineHeight: 1 }}>
                  {isUp ? '+ ' : ''}{pct.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  /* ── KPI grid (Case Workflow, RSRMA) ── */
  const renderKPIGrid = () => {
    if (!hasKPIs) return null;
    const label = summary?.status_column
      ? summary.status_column.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) + ' Summary'
      : 'Case Summary';
    const perRow = statusBreakdown.length <= 5 ? statusBreakdown.length : 5;
    return (
      <Box sx={{ border: `1px solid ${borderColor}` }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 1.5, py: 0.5, background: headerBg, borderBottom: `1px solid ${borderColor}`,
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.74rem', color: '#e0f2fe' }}>{label}</Typography>
        </Box>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: `repeat(${perRow}, 1fr)` },
          bgcolor: isDark ? '#1a1a1a' : '#fff',
        }}>
          {statusBreakdown.map((kpi, idx) => {
            const col = idx % perRow;
            const row = Math.floor(idx / perRow);
            const totalRows = Math.ceil(statusBreakdown.length / perRow);
            return (
              <Box key={kpi.status} sx={{
                borderRight: col < perRow - 1 ? `1px solid ${borderColor}` : 'none',
                borderBottom: row < totalRows - 1 ? `1px solid ${borderColor}` : 'none',
              }}>
                <KPICard label={kpi.status || 'Unknown'} value={kpi.count} previousValue={(kpi as any).previous_count} />
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  /* ── KPI boxes (Risk Trigger style) ── */
  const renderKPIBoxes = () => {
    if (!hasKPIs || kpiIsGrid) return null;
    return (
      <Grid container spacing={1}>
        {statusBreakdown.map((kpi) => (
          <Grid key={kpi.status} size={{ xs: 6, sm: 12 / Math.min(statusBreakdown.length, 4) }}>
            <Box sx={{ border: `1px solid ${borderColor}`, height: '100%' }}>
              <Box sx={{ px: 1.5, py: 0.5, background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.74rem', color: '#e0f2fe' }}>{kpi.status || 'Unknown'}</Typography>
              </Box>
              <Box sx={{ bgcolor: isDark ? '#1a1a1a' : '#fff' }}>
                <KPICard label={kpi.status || 'Unknown'} value={kpi.count} previousValue={(kpi as any).previous_count} />
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  };

  const chartH = isMobile ? 220 : 270;

  /* ── CRQ Version Counts widget (Questionnaire Report Daily) ── */
  const renderCrqCounts = () => {
    if (crqCounts.length === 0) return null;
    return (
      <Box sx={{ border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Box sx={{
          px: 1.5, py: 0.5, flexShrink: 0,
          background: isDark
            ? 'linear-gradient(90deg, #1a5276, #1f6e91)'
            : 'linear-gradient(90deg, #1a5276, #2980b9)',
          borderBottom: `1px solid ${borderColor}`,
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', textAlign: 'center' }}>
            Questions Count (Distinct)
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          bgcolor: isDark ? '#1a1a1a' : '#fff',
          flex: 1, px: 2,
          gap: { xs: 3, sm: 6 },
        }}>
          {crqCounts.map((item) => (
            <Box key={item.version} sx={{ textAlign: 'center' }}>
              <Typography sx={{
                fontWeight: 600, fontSize: { xs: '0.85rem', sm: '1rem' },
                color: isDark ? '#60a5fa' : '#1a5276', mb: 0.5,
              }}>
                {item.version || 'Unknown'}
              </Typography>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.8rem', sm: '2.5rem' },
                color: isDark ? '#60a5fa' : '#1a5276',
                lineHeight: 1, fontFeatureSettings: '"tnum"',
              }}>
                {item.count.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  /* ── Report content ── */
  const reportContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5 }, p: { xs: 0.8, sm: 1.5 } }}>
      {kpiIsGrid ? (
        /* ── Case Workflow / RSRMA layout: KPIs full width, then charts row (max 3) ── */
        <>
          {renderKPIGrid()}
          {chartEntries.length > 0 && (
            <Grid container spacing={1.5}>
              {chartEntries.slice(0, 3).map(([k, d], i) => (
                <Grid key={k} size={{ xs: 12, sm: 6, md: 12 / Math.min(chartEntries.length, 3) }}>
                  <ChartWidget title={fmtTitle(k)} data={d} headerIndex={i} height={chartH} />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      ) : hasTotalKPI && !hasKPIs ? (
        /* ── Layout: [Total KPI] [CRQ Counts if daily] [Chart(s)] ── */
        <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 22%' }, height: chartH }}>{renderTotalKPI()}</Box>
          {tableName === 'questionnaire_report_daily' && crqCounts.length > 0 && (
            <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 30%' }, height: chartH }}>{renderCrqCounts()}</Box>
          )}
          {(allChartEntries.length > 0 ? allChartEntries : chartEntries).slice(0, tableName === 'questionnaire_report_daily' ? 1 : 2).map(([k, d], i) => (
            <Box key={k} sx={{ flex: { xs: '1 1 auto', md: '1 1 0' }, height: chartH }}>
              <ChartWidget title={fmtTitle(k)} data={d || []} headerIndex={i} height={chartH} />
            </Box>
          ))}
        </Box>
      ) : hasKPIs && !kpiIsGrid ? (
        /* ── Risk Trigger layout: charts + KPI boxes ── */
        <>
          {chartEntries.length > 0 && (
            <Grid container spacing={1.5}>
              {chartEntries.slice(0, 3).map(([k, d], i) => (
                <Grid key={k} size={{ xs: 12, sm: 6, md: 12 / Math.min(chartEntries.length, 3) }}>
                  <ChartWidget title={fmtTitle(k)} data={d} headerIndex={i} height={chartH} />
                </Grid>
              ))}
            </Grid>
          )}
          {renderKPIBoxes()}
        </>
      ) : (
        /* ── Default: charts row (CRA Score, ESRM, CST, Pureplay) ── */
        chartEntries.length > 0 && (
          <Grid container spacing={1.5}>
            {chartEntries.slice(0, 3).map(([k, d], i) => (
              <Grid key={k} size={{ xs: 12, sm: 6, md: 12 / Math.min(chartEntries.length, 3) }}>
                <ChartWidget title={fmtTitle(k)} data={d} headerIndex={i} height={chartH} />
              </Grid>
            ))}
          </Grid>
        )
      )}

      {/* ── Data Table ── */}
      {tableData && (
        <DataTable
          title={reportTitle}
          columns={tableData.columns}
          rows={tableData.rows}
          total={tableData.total}
          page={page} pageSize={pageSize}
          sortBy={sortBy} sortDir={sortDir}
          searchQuery={searchQuery} loading={tableLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          onSortChange={handleSortChange}
          onSearchChange={handleSearchChange}
        />
      )}
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 0.5, sm: 1, md: 1.5 } }}>
      {tableData?.filter_options && Object.keys(tableData.filter_options).length > 0 ? (
        <FilterBar
          filterOptions={tableData.filter_options}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={() => { setActiveFilters({}); setPage(1); }}
          reportTitle={assessmentTitle || reportTitle}
          dateLabel={dateLabel}
          allColumns={tableData.columns.map((c) => c.name)}
        >
          {reportContent}
        </FilterBar>
      ) : (
        <Box sx={{ border: `1px solid ${borderColor}` }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 1.5, py: 0.4,
            background: isDark ? 'linear-gradient(90deg, #1a1a1a, #222)' : 'linear-gradient(90deg, #0d47a1, #1565c0)',
            borderBottom: `1px solid ${borderColor}`,
          }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#dee2e6' }}>Report Overview</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Typography sx={{ fontSize: '0.72rem', color: isDark ? '#ef5350' : '#c0392b', fontWeight: 600 }}>{dateLabel}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: isDark ? '#60a5fa' : '#1a3c5e' }}>{assessmentTitle || reportTitle}</Typography>
            </Box>
          </Box>
          <Box sx={{ bgcolor: isDark ? '#0d0d0d' : '#ebeef2' }}>{reportContent}</Box>
        </Box>
      )}
    </Box>
  );
};
