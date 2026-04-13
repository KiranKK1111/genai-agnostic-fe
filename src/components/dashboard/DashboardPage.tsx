/**
 * DashboardPage — dashboard with domain tabs + report sub-tabs.
 * Dark theme uses dark grey palette matching the sidebar.
 */
import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { ReportView } from './ReportView';
import { fetchDashboardMeta, type DomainMeta } from './dashboardApi';

const ASSESSMENT_TITLES: Record<string, string> = {
  'Climate Risk': 'Climate Risk Assessment',
  'Pureplay': 'Pureplay Assessment',
  'RSRMA': 'RSRMA Risk Assessment',
  'CESRA': 'CESRA',
  'TESRA': 'Transaction ESRA',
};

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [domains, setDomains] = useState<DomainMeta[]>([]);
  const [activeDomain, setActiveDomain] = useState(0);
  const [activeReport, setActiveReport] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMeta()
      .then((meta) => { setDomains(meta.domains); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { setActiveReport(0); }, [activeDomain]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <CircularProgress size={28} thickness={4} sx={{ color: isDark ? '#60a5fa' : '#1565c0' }} />
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading dashboards...</Typography>
      </Box>
    );
  }

  if (!domains.length) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">No dashboard data available</Typography>
      </Box>
    );
  }

  const currentDomain = domains[activeDomain];
  const currentReport = currentDomain?.reports?.[activeReport];
  const domainLabel = currentDomain?.label || '';
  const assessmentTitle = domainLabel === 'CESRA' && currentReport
    ? `CESRA - ${currentReport.label}`
    : ASSESSMENT_TITLES[domainLabel] || domainLabel;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Domain Tabs ── */}
      <Box sx={{
        flexShrink: 0,
        bgcolor: isDark ? '#141414' : '#f5f5f5',
        borderBottom: `2px solid ${isDark ? '#333' : '#1565c0'}`,
      }}>
        <Tabs
          value={activeDomain}
          onChange={(_, v) => setActiveDomain(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          centered={!isMobile}
          scrollButtons={isMobile ? 'auto' : false}
          sx={{
            minHeight: 40,
            '& .MuiTabs-indicator': { height: 3, bgcolor: isDark ? '#60a5fa' : '#1565c0', borderRadius: 0, transition: 'none' },
            '& .MuiTab-root': {
              minHeight: 40, textTransform: 'none', fontWeight: 600,
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              px: { xs: 1.5, sm: 3 }, py: 0,
              color: isDark ? '#999' : '#455a64',
              borderRight: `1px solid ${isDark ? '#333' : '#dee2e6'}`,
              '&:last-child': { borderRight: 'none' },
              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,82,118,0.05)' },
              '&.Mui-selected': {
                color: isDark ? '#fff' : '#1565c0', fontWeight: 700,
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
              },
            },
          }}
        >
          {domains.map((d) => <Tab key={d.id} label={d.label} />)}
        </Tabs>
      </Box>

      {/* ── Report Sub-tabs ── */}
      {currentDomain?.reports?.length > 1 && (
        <Box sx={{
          flexShrink: 0,
          bgcolor: isDark ? '#111' : '#ffffff',
          borderBottom: `1px solid ${isDark ? '#333' : '#dee2e6'}`,
        }}>
          <Tabs
            key={activeDomain}
            value={activeReport}
            onChange={(_, v) => setActiveReport(v)}
            variant={isMobile ? 'scrollable' : 'standard'}
            centered={!isMobile}
            scrollButtons={isMobile ? 'auto' : false}
            sx={{
              minHeight: 34,
              '& .MuiTabs-indicator': { height: 2.5, bgcolor: isDark ? '#60a5fa' : '#1565c0', borderRadius: 0, transition: 'none' },
              '& .MuiTab-root': {
                minHeight: 34, textTransform: 'none', fontWeight: 500,
                fontSize: { xs: '0.72rem', sm: '0.8rem' },
                py: 0, px: { xs: 1.5, sm: 2.5 },
                color: isDark ? '#888' : '#6c757d',
                '&:hover': { color: isDark ? '#bbb' : '#1a5276' },
                '&.Mui-selected': { color: isDark ? '#60a5fa' : '#1565c0', fontWeight: 700 },
              },
            }}
          >
            {currentDomain.reports.map((r) => <Tab key={r.id} label={r.label} />)}
          </Tabs>
        </Box>
      )}

      {/* ── Report Content ── */}
      <Box sx={{
        flex: 1, overflow: 'auto',
        bgcolor: isDark ? '#0d0d0d' : '#eceff1',
        scrollbarWidth: 'thin',
        scrollbarColor: 'transparent transparent',
        '&:hover': { scrollbarColor: `${isDark ? '#444' : '#adb5bd'} transparent` },
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'transparent', borderRadius: 3 },
        '&:hover::-webkit-scrollbar-thumb': { background: isDark ? '#444' : '#adb5bd' },
      }}>
        {currentReport && (
          <ReportView
            key={`${currentDomain.id}-${currentReport.id}`}
            tableName={currentReport.table}
            reportTitle={currentReport.label}
            assessmentTitle={assessmentTitle}
          />
        )}
      </Box>
    </Box>
  );
};
