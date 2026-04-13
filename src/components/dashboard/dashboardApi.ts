/**
 * Dashboard API service — fetches KPIs, charts, and table data.
 */
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  // Auth token is stored in sessionStorage (see AuthContext.tsx)
  const token = sessionStorage.getItem('sdm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Types
export interface DomainMeta {
  id: string;
  label: string;
  icon: string;
  reports: { id: string; label: string; table: string }[];
}

export interface KPI {
  status: string;
  count: number;
}

export interface ReportSummary {
  table: string;
  total_records: number;
  status_column: string | null;
  status_breakdown: KPI[];
  date_column: string | null;
  monthly_volume: { month: string; count: number }[];
  current_month_count: number;
  prev_month_count: number;
  columns: string[];
}

export interface ChartData {
  table: string;
  charts: Record<string, { period?: string; category?: string; count: number }[]>;
}

export interface ColumnMeta {
  name: string;
  type: string;
}

export interface FilterOption {
  column: string;
  label: string;
  type: 'select' | 'date_range';
  values?: string[];
  min?: string;
  max?: string;
}

export interface TableData {
  table: string;
  columns: ColumnMeta[];
  rows: Record<string, any>[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  filter_options: Record<string, string[]>;
}

// API calls
export const fetchDashboardMeta = () =>
  api.get<{ domains: DomainMeta[] }>('/api/dashboard/meta').then((r) => r.data);

export const fetchReportSummary = (table: string) =>
  api.get<ReportSummary>(`/api/dashboard/report/${table}/summary`).then((r) => r.data);

export const fetchReportCharts = (table: string, params?: Record<string, string>) =>
  api.get<ChartData>(`/api/dashboard/report/${table}/charts`, { params }).then((r) => r.data);

export const fetchReportData = (table: string, params?: Record<string, any>) =>
  api.get<TableData>(`/api/dashboard/report/${table}/data`, { params }).then((r) => r.data);

export const fetchReportFilters = (table: string) =>
  api.get<{ table: string; filters: FilterOption[] }>(`/api/dashboard/report/${table}/filters`).then((r) => r.data);
